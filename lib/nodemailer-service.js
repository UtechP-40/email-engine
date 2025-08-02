import nodemailer from 'nodemailer';
import { getDatabase } from './db.js';
import { ObjectId } from 'mongodb';

class NodemailerService {
  constructor() {
    this.transporter = null;
    this.db = null;
  }

  async init() {
    if (!this.db) this.db = await getDatabase();

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      try {
        await this.transporter.verify();
        console.log('✅ Gmail SMTP verified');
      } catch (err) {
        console.error('❌ Gmail SMTP verification failed:', err.message);
        throw err;
      }
    }
  }

  async sendEmail(emailData) {
    try {
      await this.init();

      const validation = this._validateEmailData(emailData);
      if (!validation.success) {
        return this._createErrorResponse('validation', 'EMAIL_VALIDATION_FAILED', validation.error, {
          validationErrors: validation.errors
        });
      }

      const processed = this._processTemplate(emailData);
      const options = {
        from: `"${process.env.FROM_NAME || 'Email Campaign'}" <${process.env.EMAIL_USER}>`,
        to: emailData.to,
        subject: processed.subject,
        html: processed.content,
        text: this._generateTextVersion(processed.content)
      };

      const result = await this.transporter.sendMail(options);
      const log = await this._logEmailEvent(emailData, 'sent', {
        messageId: result.messageId,
        response: result.response
      });

      return {
        success: true,
        messageId: result.messageId,
        logId: log?.insertedId,
        details: {
          to: emailData.to,
          subject: processed.subject,
          sentAt: new Date(),
          provider: 'gmail'
        }
      };

    } catch (err) {
      return this._handleEmailError(err, emailData);
    }
  }

  async sendEmailWithRetry(emailData, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const baseDelay = options.retryDelayBase || 1000;

    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.sendEmail({ ...emailData, _retryAttempt: attempt });

      if (result.success) {
        if (attempt > 1) {
          await this._logEmailEvent(emailData, 'retry_success', {
            attempt,
            totalAttempts: attempt,
            previousErrors: lastError
          });
        }
        return result;
      }

      lastError = result;
      if (result.errorType === 'validation' || attempt === maxRetries) break;

      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(res => setTimeout(res, delay));

      await this._logEmailEvent(emailData, 'retry_attempt', {
        attempt,
        maxRetries,
        delay,
        error: result.message
      });
    }

    await this._logEmailEvent(emailData, 'failed', {
      totalAttempts: maxRetries,
      finalError: lastError
    });

    return { ...lastError, retryAttempts: maxRetries, finalAttempt: true };
  }

  async testConnection() {
    try {
      await this.init();
      return {
        success: true,
        message: 'Gmail SMTP connection successful',
        provider: 'gmail',
        user: process.env.EMAIL_USER
      };
    } catch (err) {
      return {
        success: false,
        message: `SMTP connection failed: ${err.message}`,
        error: err.message
      };
    }
  }

  async sendTestEmail(recipient = 'test@example.com') {
    const data = {
      to: recipient,
      subject: '🧪 Test Email from Campaign Builder',
      content: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>✅ Email System Test Successful!</h2>
          <p>This email confirms Gmail SMTP is working.</p>
          <ul>
            <li><strong>Provider:</strong> Gmail</li>
            <li><strong>From:</strong> ${process.env.EMAIL_USER}</li>
            <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
          </ul>
        </div>
      `,
      templateData: { provider: 'gmail', testTimestamp: new Date().toISOString() }
    };

    return await this.sendEmailWithRetry(data);
  }

  _validateEmailData(data) {
    const errors = [];

    if (!data) return { success: false, error: 'Missing email data', errors: ['Missing email data'] };
    if (!data.to) errors.push('Recipient is required');
    else if (!this._isValidEmail(data.to)) errors.push('Invalid recipient email');

    if (!data.subject) errors.push('Subject is required');
    if (!data.content) errors.push('Content is required');

    return {
      success: errors.length === 0,
      error: errors[0] || null,
      errors
    };
  }

  _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  _processTemplate(data) {
    const process = (tpl, vars) =>
      Object.keys(vars || {}).reduce((acc, key) => {
        return acc.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), vars[key]);
      }, tpl || '');

    return {
      subject: process(data.subject, data.templateData),
      content: process(data.content, data.templateData)
    };
  }

  _generateTextVersion(html) {
    return html
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  async _logEmailEvent(data, status, details = {}) {
    try {
      await this.init();

      const entry = {
        messageId: details.messageId || null,
        campaignId: data.campaignId ? new ObjectId(data.campaignId) : null,
        userId: data.userId ? new ObjectId(data.userId) : null,
        recipient: data.to,
        subject: data.subject,
        status,
        provider: 'gmail',
        response: details.response || null,
        errorDetails: details.error ? {
          message: details.error.message || details.error,
          code: details.error.code,
          type: details.error.type
        } : null,
        retryAttempts: data._retryAttempt || 0,
        templateData: data.templateData || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return await this.db.collection('email_logs').insertOne(entry);
    } catch (err) {
      console.error('Email log failed:', err.message);
      return null;
    }
  }

  _handleEmailError(err, data) {
    let type = 'system';
    let code = 'GMAIL_ERROR';
    let msg = err.message || 'Unknown error';
    let suggestions = [];

    if (err.code === 'EAUTH') {
      type = 'configuration';
      code = 'AUTHENTICATION_FAILED';
      msg = 'Authentication failed – check credentials';
      suggestions.push('Use Gmail App Passwords');
    } else if (err.code === 'ECONNECTION') {
      type = 'delivery';
      code = 'CONNECTION_FAILED';
      msg = 'SMTP connection failed';
    } else if (err.responseCode === 550) {
      type = 'validation';
      code = 'INVALID_RECIPIENT';
      msg = 'Recipient email is invalid';
    }

    this._logEmailEvent(data, 'failed', {
      error: { message: msg, code: err.code, type }
    });

    return this._createErrorResponse(type, code, msg, {
      suggestions,
      gmailError: err
    });
  }

  _createErrorResponse(type, code, message, details = {}) {
    return {
      success: false,
      errorType: type,
      errorCode: code,
      message,
      details,
      provider: 'gmail',
      timestamp: new Date()
    };
  }
}

export const nodemailerService = new NodemailerService();

export async function sendEmail(data) {
  return await nodemailerService.sendEmail(data);
}

export async function sendEmailWithRetry(data, options) {
  return await nodemailerService.sendEmailWithRetry(data, options);
}

export async function testGmailConnection() {
  return await nodemailerService.testConnection();
}

export async function sendTestEmail(to) {
  return await nodemailerService.sendTestEmail(to);
}
