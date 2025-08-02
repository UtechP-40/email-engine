import { testGmailConnection } from "./nodemailer-service.js"

/**
 * Email Configuration Validator
 * Validates email system configuration and environment setup
 */
export class EmailConfigValidator {
  constructor() {
    this.requiredEnvVars = ['EMAIL_USER', 'EMAIL_PASSWORD']
    this.optionalEnvVars = ['FROM_EMAIL', 'MONGODB_URI', 'JWT_SECRET']
  }

  /**
   * Validates all required environment variables
   * @returns {Object} Validation result with details
   */
  validateEnvironmentVariables() {
    const result = {
      success: true,
      errors: [],
      warnings: [],
      details: {}
    }

    // Check required environment variables
    for (const envVar of this.requiredEnvVars) {
      const value = process.env[envVar]
      
      if (!value) {
        result.success = false
        result.errors.push(`Missing required environment variable: ${envVar}`)
        result.details[envVar] = { present: false, valid: false }
      } else {
        // Validate specific environment variables
        const validation = this._validateSpecificEnvVar(envVar, value)
        result.details[envVar] = validation
        
        if (!validation.valid) {
          result.success = false
          result.errors.push(`Invalid ${envVar}: ${validation.error}`)
        }
      }
    }

    // Check optional environment variables
    for (const envVar of this.optionalEnvVars) {
      const value = process.env[envVar]
      
      if (!value) {
        result.warnings.push(`Optional environment variable not set: ${envVar}`)
        result.details[envVar] = { present: false, valid: false, optional: true }
      } else {
        result.details[envVar] = { present: true, valid: true, optional: true }
      }
    }

    return result
  }

  /**
   * Validates specific environment variable format and content
   * @param {string} envVar - Environment variable name
   * @param {string} value - Environment variable value
   * @returns {Object} Validation result for specific variable
   */
  _validateSpecificEnvVar(envVar, value) {
    switch (envVar) {
      case 'SENDGRID_API_KEY':
        return this._validateSendGridApiKey(value)
      case 'FROM_EMAIL':
        return this._validateEmailAddress(value)
      default:
        return { present: true, valid: true }
    }
  }

  /**
   * Validates SendGrid API key format
   * @param {string} apiKey - SendGrid API key
   * @returns {Object} Validation result
   */
  _validateSendGridApiKey(apiKey) {
    const result = { present: true, valid: false, error: null }

    if (!apiKey.startsWith('SG.')) {
      result.error = 'SendGrid API key must start with "SG."'
      return result
    }

    if (apiKey.length < 20) {
      result.error = 'SendGrid API key appears to be too short'
      return result
    }

    const parts = apiKey.split('.')
    if (parts.length !== 3) {
      result.error = 'SendGrid API key must have 3 parts separated by dots'
      return result
    }

    result.valid = true
    return result
  }

  /**
   * Validates email address format
   * @param {string} email - Email address
   * @returns {Object} Validation result
   */
  _validateEmailAddress(email) {
    const result = { present: true, valid: false, error: null }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!emailRegex.test(email)) {
      result.error = 'Invalid email address format'
      return result
    }

    result.valid = true
    return result
  }

  /**
   * Tests Gmail SMTP connectivity and credentials
   * @returns {Promise<Object>} Connection test result
   */
  async validateSendGridSetup() {
    const result = {
      success: false,
      errors: [],
      warnings: [],
      details: {
        apiKeyValid: false,
        connectionEstablished: false,
        permissionsValid: false
      }
    }

    try {
      // First validate environment variables
      const envValidation = this.validateEnvironmentVariables()
      if (!envValidation.success) {
        result.errors.push('Environment validation failed')
        result.errors.push(...envValidation.errors)
        return result
      }

      // Test Gmail SMTP connection
      const gmailTest = await testGmailConnection()
      
      if (gmailTest.success) {
        result.success = true
        result.details.apiKeyValid = true
        result.details.connectionEstablished = true
        result.details.permissionsValid = true
      } else {
        result.errors.push(gmailTest.message)
        result.details.apiKeyValid = false
        result.details.connectionEstablished = false
        result.details.permissionsValid = false
      }

    } catch (error) {
      result.errors.push(`Gmail setup validation failed: ${error.message}`)
    }

    return result
  }

  /**
   * Validates email templates for proper syntax and variables
   * @param {string} template - Email template content
   * @param {Object} requiredVariables - Required template variables
   * @returns {Object} Template validation result
   */
  validateEmailTemplate(template, requiredVariables = {}) {
    const result = {
      success: true,
      errors: [],
      warnings: [],
      details: {
        variablesFound: [],
        missingVariables: [],
        unusedVariables: []
      }
    }

    if (!template || typeof template !== 'string') {
      result.success = false
      result.errors.push('Template must be a non-empty string')
      return result
    }

    // Find all template variables in the format {{variable}}
    const variableRegex = /\{\{(\w+)\}\}/g
    const foundVariables = []
    let match

    while ((match = variableRegex.exec(template)) !== null) {
      foundVariables.push(match[1])
    }

    result.details.variablesFound = [...new Set(foundVariables)]

    // Check for missing required variables
    const requiredVarNames = Object.keys(requiredVariables)
    for (const requiredVar of requiredVarNames) {
      if (!result.details.variablesFound.includes(requiredVar)) {
        result.details.missingVariables.push(requiredVar)
        result.warnings.push(`Template missing required variable: {{${requiredVar}}}`)
      }
    }

    // Check for unused variables (variables in template but not in required)
    for (const foundVar of result.details.variablesFound) {
      if (!requiredVarNames.includes(foundVar)) {
        result.details.unusedVariables.push(foundVar)
        result.warnings.push(`Template contains undefined variable: {{${foundVar}}}`)
      }
    }

    // Basic HTML validation (if template contains HTML)
    if (template.includes('<') && template.includes('>')) {
      const htmlValidation = this._validateBasicHtml(template)
      if (!htmlValidation.valid) {
        result.errors.push(...htmlValidation.errors)
        result.success = false
      }
    }

    return result
  }

  /**
   * Basic HTML validation for email templates
   * @param {string} html - HTML content
   * @returns {Object} HTML validation result
   */
  _validateBasicHtml(html) {
    const result = { valid: true, errors: [] }

    // Check for basic HTML structure issues
    const openTags = html.match(/<[^/][^>]*>/g) || []
    const closeTags = html.match(/<\/[^>]*>/g) || []

    // Simple check for major structural issues
    if (openTags.length > 0 && closeTags.length === 0) {
      result.valid = false
      result.errors.push('HTML template has opening tags but no closing tags')
    }

    // Check for common problematic patterns
    if (html.includes('<script')) {
      result.valid = false
      result.errors.push('HTML template contains script tags which are not allowed in emails')
    }

    return result
  }

  /**
   * Generates a comprehensive configuration report
   * @returns {Promise<Object>} Complete configuration status report
   */
  async generateConfigReport() {
    const report = {
      timestamp: new Date().toISOString(),
      overall: { success: true, score: 0 },
      environment: null,
      sendgrid: null,
      recommendations: []
    }

    try {
      // Validate environment variables
      report.environment = this.validateEnvironmentVariables()
      
      // Validate SendGrid setup
      report.sendgrid = await this.validateSendGridSetup()

      // Calculate overall success and score
      const envSuccess = report.environment.success
      const sendgridSuccess = report.sendgrid.success

      report.overall.success = envSuccess && sendgridSuccess

      // Calculate score (0-100)
      let score = 0
      if (envSuccess) score += 50
      if (sendgridSuccess) score += 50

      // Deduct points for warnings
      const totalWarnings = (report.environment.warnings?.length || 0) + 
                           (report.sendgrid.warnings?.length || 0)
      score -= Math.min(totalWarnings * 5, 20)

      report.overall.score = Math.max(0, score)

      // Generate recommendations
      if (!envSuccess) {
        report.recommendations.push('Fix environment variable configuration before proceeding')
      }
      if (!sendgridSuccess) {
        report.recommendations.push('Resolve SendGrid API connectivity issues')
      }
      if (totalWarnings > 0) {
        report.recommendations.push('Address configuration warnings for optimal performance')
      }
      if (report.overall.score === 100) {
        report.recommendations.push('Email configuration is optimal')
      }

    } catch (error) {
      report.overall.success = false
      report.overall.score = 0
      report.error = error.message
      report.recommendations.push('Fix configuration errors before using email functionality')
    }

    return report
  }
}

// Export convenience functions for direct use
export async function validateEmailConfig() {
  const validator = new EmailConfigValidator()
  return await validator.generateConfigReport()
}

export function validateEnvironmentVariables() {
  const validator = new EmailConfigValidator()
  return validator.validateEnvironmentVariables()
}

export async function validateSendGridSetup() {
  const validator = new EmailConfigValidator()
  return await validator.validateSendGridSetup()
}

export function validateEmailTemplate(template, requiredVariables) {
  const validator = new EmailConfigValidator()
  return validator.validateEmailTemplate(template, requiredVariables)
}