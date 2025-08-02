import sgMail from "@sendgrid/mail"
import { getDatabase } from "./db.js"
import { ObjectId } from "mongodb"

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || "your-sendgrid-key")

/**
 * Enhanced Email Service with improved error handling, template validation,
 * caching, and debugging capabilities
 */
export class EmailService {
  constructor() {
    this.db = null
    this.templateCache = new Map()
    this.rateLimitTracker = new Map()
    this.maxRetries = 3
    this.retryDelayBase = 1000 // 1 second base delay
  }

  async init() {
    if (!this.db) {
      this.db = await getDatabase()
    }
  }

  /**
   * Send email with enhanced error handling and logging
   */
  async sendEmail(emailData) {
    try {
      await this.init()
      
      // Validate input
      const validation = this._validateEmailData(emailData)
      if (!validation.success) {
        return this._createErrorResponse('validation', 'EMAIL_VALIDATION_FAILED', validation.error, {
          validationErrors: validation.errors
        })
      }

      // Process template
      const processedEmail = await this._processTemplate(emailData)
      if (!processedEmail.success) {
        return processedEmail
      }

      // Check rate limits
      const rateLimitCheck = this._checkRateLimit(emailData.to)
      if (!rateLimitCheck.allowed) {
        return this._createErrorResponse('delivery', 'RATE_LIMIT_EXCEEDED', 
          `Rate limit exceeded for ${emailData.to}. Try again in ${rateLimitCheck.retryAfter}ms`, {
          retryAfter: rateLimitCheck.retryAfter
        })
      }

      // Prepare SendGrid message
      const msg = {
        to: emailData.to,
        from: emailData.from || process.env.FROM_EMAIL || "noreply@example.com",
        subject: processedEmail.subject,
        html: processedEmail.content,
        ...(emailData.attachments && { attachments: emailData.attachments }),
        ...(emailData.customArgs && { customArgs: emailData.customArgs })
      }

      // Send email
      const sendGridResponse = await sgMail.send(msg)
      
      // Log successful send
      const logEntry = await this._logEmailEvent(emailData, 'sent', {
        sendGridResponse: sendGridResponse[0],
        messageId: sendGridResponse[0].headers['x-message-id']
      })

      return {
        success: true,
        messageId: sendGridResponse[0].headers['x-message-id'],
        logId: logEntry.insertedId,
        details: {
          to: emailData.to,
          subject: processedEmail.subject,
          sentAt: new Date()
        }
      }

    } catch (error) {
      return this._handleSendGridError(error, emailData)
    }
  }

  /**
   * Send email with retry logic and exponential backoff
   */
  async sendEmailWithRetry(emailData, options = {}) {
    const maxRetries = options.maxRetries || this.maxRetries
    const retryDelayBase = options.retryDelayBase || this.retryDelayBase
    
    let lastError = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.sendEmail({
        ...emailData,
        _retryAttempt: attempt
      })

      if (result.success) {
        // Log successful retry if this wasn't the first attempt
        if (attempt > 1) {
          await this._logEmailEvent(emailData, 'retry_success', {
            attempt,
            totalAttempts: attempt,
            previousErrors: lastError
          })
        }
        return result
      }

      lastError = result
      
      // Don't retry on validation or configuration errors
      if (result.errorType === 'validation' || result.errorType === 'configuration') {
        break
      }

      // Don't retry on final attempt
      if (attempt === maxRetries) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = retryDelayBase * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Log retry attempt
      await this._logEmailEvent(emailData, 'retry_attempt', {
        attempt,
        maxRetries,
        delay,
        error: result.message
      })
    }

    // Log final failure
    await this._logEmailEvent(emailData, 'failed', {
      totalAttempts: maxRetries,
      finalError: lastError
    })

    return {
      ...lastError,
      retryAttempts: maxRetries,
      finalAttempt: true
    }
  }

  /**
   * Validate email template and return processed content
   */
  async validateTemplate(template, templateData = {}) {
    try {
      if (!template || typeof template !== 'string') {
        return {
          success: false,
          error: 'Template must be a non-empty string',
          errorType: 'validation'
        }
      }

      // Check for dangerous content
      if (template.includes('<script') || template.includes('javascript:')) {
        return {
          success: false,
          error: 'Template contains potentially dangerous content',
          errorType: 'validation'
        }
      }

      // Extract template variables
      const variableRegex = /\{\{(\w+)\}\}/g
      const templateVariables = []
      let match
      
      while ((match = variableRegex.exec(template)) !== null) {
        if (!templateVariables.includes(match[1])) {
          templateVariables.push(match[1])
        }
      }

      // Check for missing variables
      const missingVariables = templateVariables.filter(
        variable => !(variable in templateData)
      )

      // Check for unused variables
      const unusedVariables = Object.keys(templateData).filter(
        variable => !templateVariables.includes(variable)
      )

      return {
        success: true,
        templateVariables,
        missingVariables,
        unusedVariables,
        warnings: [
          ...missingVariables.map(v => `Missing template variable: {{${v}}}`),
          ...unusedVariables.map(v => `Unused template data: ${v}`)
        ]
      }

    } catch (error) {
      return {
        success: false,
        error: `Template validation failed: ${error.message}`,
        errorType: 'validation'
      }
    }
  }

  /**
   * Preview email content without sending
   */
  async previewEmail(emailData) {
    try {
      // Validate input
      const validation = this._validateEmailData(emailData, { skipRecipientValidation: true })
      if (!validation.success) {
        return {
          success: false,
          error: validation.error,
          errorType: 'validation'
        }
      }

      // Process template
      const processedEmail = await this._processTemplate(emailData)
      if (!processedEmail.success) {
        return processedEmail
      }

      // Validate template
      const templateValidation = await this.validateTemplate(emailData.content, emailData.templateData)

      return {
        success: true,
        preview: {
          to: emailData.to || 'preview@example.com',
          from: emailData.from || process.env.FROM_EMAIL || "noreply@example.com",
          subject: processedEmail.subject,
          content: processedEmail.content,
          htmlPreview: this._generateHtmlPreview(processedEmail.content),
          textPreview: this._generateTextPreview(processedEmail.content)
        },
        templateValidation,
        metadata: {
          templateVariables: templateValidation.templateVariables || [],
          contentLength: processedEmail.content.length,
          estimatedSize: Buffer.byteLength(processedEmail.content, 'utf8'),
          previewedAt: new Date()
        }
      }

    } catch (error) {
      return {
        success: false,
        error: `Email preview failed: ${error.message}`,
        errorType: 'system'
      }
    }
  }

  /**
   * Get delivery status for a message
   */
  async getDeliveryStatus(messageId) {
    try {
      await this.init()
      
      const emailLog = await this.db.collection('email_logs').findOne({
        messageId: messageId
      })

      if (!emailLog) {
        return {
          success: false,
          error: 'Message not found',
          errorType: 'not_found'
        }
      }

      return {
        success: true,
        status: emailLog.status,
        messageId: emailLog.messageId,
        recipient: emailLog.recipient,
        subject: emailLog.subject,
        sentAt: emailLog.createdAt,
        deliveredAt: emailLog.deliveredAt,
        deliveryAttempts: emailLog.deliveryAttempts || [],
        lastUpdated: emailLog.updatedAt
      }

    } catch (error) {
      return {
        success: false,
        error: `Failed to get delivery status: ${error.message}`,
        errorType: 'system'
      }
    }
  }

  /**
   * Send bulk emails with rate limiting and progress tracking
   */
  async bulkSend(emailList, options = {}) {
    const results = {
      total: emailList.length,
      successful: 0,
      failed: 0,
      results: [],
      startedAt: new Date()
    }

    const batchSize = options.batchSize || 10
    const delayBetweenBatches = options.delayBetweenBatches || 1000

    // Process emails in batches
    for (let i = 0; i < emailList.length; i += batchSize) {
      const batch = emailList.slice(i, i + batchSize)
      
      // Process batch concurrently
      const batchPromises = batch.map(async (emailData, index) => {
        const result = await this.sendEmailWithRetry(emailData, options)
        
        if (result.success) {
          results.successful++
        } else {
          results.failed++
        }

        return {
          index: i + index,
          emailData: { to: emailData.to, subject: emailData.subject },
          result
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.results.push(...batchResults)

      // Delay between batches to respect rate limits
      if (i + batchSize < emailList.length && delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    }

    results.completedAt = new Date()
    results.duration = results.completedAt - results.startedAt

    return results
  }

  // Private helper methods

  _validateEmailData(emailData, options = {}) {
    const errors = []

    if (!emailData) {
      return { success: false, error: 'Email data is required', errors: ['Email data is required'] }
    }

    if (!options.skipRecipientValidation && !emailData.to) {
      errors.push('Recipient email (to) is required')
    }

    if (emailData.to && !this._isValidEmail(emailData.to)) {
      errors.push('Invalid recipient email format')
    }

    if (!emailData.subject) {
      errors.push('Email subject is required')
    }

    if (!emailData.content) {
      errors.push('Email content is required')
    }

    if (emailData.from && !this._isValidEmail(emailData.from)) {
      errors.push('Invalid sender email format')
    }

    return {
      success: errors.length === 0,
      error: errors.length > 0 ? errors[0] : null,
      errors
    }
  }

  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  async _processTemplate(emailData) {
    try {
      const { subject, content, templateData = {} } = emailData
      
      // Check cache first
      const cacheKey = this._generateCacheKey(content, templateData)
      if (this.templateCache.has(cacheKey)) {
        const cached = this.templateCache.get(cacheKey)
        return {
          success: true,
          subject: this._processTemplateString(subject, templateData),
          content: cached.content,
          fromCache: true
        }
      }

      // Process template
      const processedContent = this._processTemplateString(content, templateData)
      const processedSubject = this._processTemplateString(subject, templateData)

      // Cache the result (limit cache size)
      if (this.templateCache.size >= 100) {
        const firstKey = this.templateCache.keys().next().value
        this.templateCache.delete(firstKey)
      }
      
      this.templateCache.set(cacheKey, {
        content: processedContent,
        cachedAt: new Date()
      })

      return {
        success: true,
        subject: processedSubject,
        content: processedContent,
        fromCache: false
      }

    } catch (error) {
      return {
        success: false,
        error: `Template processing failed: ${error.message}`,
        errorType: 'template'
      }
    }
  }

  _processTemplateString(template, templateData) {
    if (!template || !templateData) return template

    return Object.keys(templateData).reduce((processed, key) => {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      return processed.replace(placeholder, templateData[key] || '')
    }, template)
  }

  _generateCacheKey(content, templateData) {
    const dataString = JSON.stringify(templateData)
    return `${content.length}_${Buffer.from(dataString).toString('base64').slice(0, 20)}`
  }

  _checkRateLimit(recipient) {
    const now = Date.now()
    const windowMs = 60000 // 1 minute window
    const maxEmails = 10 // Max 10 emails per minute per recipient

    if (!this.rateLimitTracker.has(recipient)) {
      this.rateLimitTracker.set(recipient, [])
    }

    const timestamps = this.rateLimitTracker.get(recipient)
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs)
    
    if (validTimestamps.length >= maxEmails) {
      const oldestTimestamp = Math.min(...validTimestamps)
      const retryAfter = windowMs - (now - oldestTimestamp)
      
      return {
        allowed: false,
        retryAfter
      }
    }

    // Add current timestamp
    validTimestamps.push(now)
    this.rateLimitTracker.set(recipient, validTimestamps)

    return { allowed: true }
  }

  async _logEmailEvent(emailData, status, details = {}) {
    try {
      await this.init()
      
      const logEntry = {
        messageId: details.messageId || null,
        campaignId: emailData.campaignId ? new ObjectId(emailData.campaignId) : null,
        userId: emailData.userId ? new ObjectId(emailData.userId) : null,
        recipient: emailData.to,
        subject: emailData.subject,
        templateId: emailData.templateId || null,
        status,
        sendGridResponse: details.sendGridResponse || null,
        errorDetails: details.error ? {
          message: details.error.message || details.error,
          code: details.error.code,
          type: details.error.type
        } : null,
        retryAttempts: emailData._retryAttempt || 0,
        deliveryAttempts: details.deliveryAttempts || [],
        templateData: emailData.templateData || {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveredAt: status === 'delivered' ? new Date() : null
      }

      return await this.db.collection('email_logs').insertOne(logEntry)

    } catch (error) {
      console.error('Failed to log email event:', error)
      return null
    }
  }

  _handleSendGridError(error, emailData) {
    let errorType = 'system'
    let errorCode = 'SENDGRID_ERROR'
    let message = error.message || 'Unknown SendGrid error'
    let suggestions = []

    if (error.code) {
      switch (error.code) {
        case 400:
          errorType = 'validation'
          errorCode = 'BAD_REQUEST'
          suggestions.push('Check email format and content')
          break
        case 401:
          errorType = 'configuration'
          errorCode = 'UNAUTHORIZED'
          message = 'SendGrid API key is invalid or expired'
          suggestions.push('Verify SENDGRID_API_KEY environment variable')
          break
        case 403:
          errorType = 'configuration'
          errorCode = 'FORBIDDEN'
          message = 'SendGrid API key lacks required permissions'
          suggestions.push('Check API key permissions in SendGrid dashboard')
          break
        case 413:
          errorType = 'validation'
          errorCode = 'PAYLOAD_TOO_LARGE'
          suggestions.push('Reduce email content size or attachment size')
          break
        case 429:
          errorType = 'delivery'
          errorCode = 'RATE_LIMIT_EXCEEDED'
          suggestions.push('Implement rate limiting or upgrade SendGrid plan')
          break
        case 500:
        case 502:
        case 503:
          errorType = 'delivery'
          errorCode = 'SERVICE_UNAVAILABLE'
          message = 'SendGrid service is temporarily unavailable'
          suggestions.push('Retry the request after a delay')
          break
      }
    }

    // Log the error
    this._logEmailEvent(emailData, 'failed', {
      error: {
        message,
        code: error.code,
        type: errorType
      }
    })

    return this._createErrorResponse(errorType, errorCode, message, {
      sendGridError: error,
      suggestions
    })
  }

  _createErrorResponse(errorType, errorCode, message, details = {}) {
    return {
      success: false,
      errorType,
      errorCode,
      message,
      details,
      timestamp: new Date()
    }
  }

  _generateHtmlPreview(content) {
    // Wrap content in basic HTML structure for preview
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Preview</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  ${content}
</body>
</html>`.trim()
  }

  _generateTextPreview(content) {
    // Strip HTML tags for text preview
    return content
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim()
  }
}

// Create singleton instance
export const emailService = new EmailService()

// Convenience functions for backward compatibility
export async function sendEmail(emailData) {
  return await emailService.sendEmail(emailData)
}

export async function sendEmailWithRetry(emailData, options) {
  return await emailService.sendEmailWithRetry(emailData, options)
}