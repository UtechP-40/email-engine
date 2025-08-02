import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  EmailConfigValidator, 
  validateEmailConfig, 
  validateEnvironmentVariables, 
  validateSendGridSetup,
  validateEmailTemplate 
} from '../email-config.js'

// Mock SendGrid
vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn()
  }
}))

describe('EmailConfigValidator', () => {
  let validator
  let originalEnv

  beforeEach(() => {
    validator = new EmailConfigValidator()
    // Save original environment
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('validateEnvironmentVariables', () => {
    it('should pass validation when all required environment variables are present and valid', () => {
      process.env.SENDGRID_API_KEY = 'SG.test123.abcdef123456789012345678901234567890'
      process.env.FROM_EMAIL = 'test@example.com'

      const result = validator.validateEnvironmentVariables()

      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.details.SENDGRID_API_KEY.valid).toBe(true)
      expect(result.details.FROM_EMAIL.valid).toBe(true)
    })

    it('should fail validation when required environment variables are missing', () => {
      delete process.env.SENDGRID_API_KEY
      delete process.env.FROM_EMAIL

      const result = validator.validateEnvironmentVariables()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Missing required environment variable: SENDGRID_API_KEY')
      expect(result.errors).toContain('Missing required environment variable: FROM_EMAIL')
    })

    it('should fail validation when SENDGRID_API_KEY format is invalid', () => {
      process.env.SENDGRID_API_KEY = 'invalid-api-key'
      process.env.FROM_EMAIL = 'test@example.com'

      const result = validator.validateEnvironmentVariables()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Invalid SENDGRID_API_KEY: SendGrid API key must start with "SG."')
    })

    it('should fail validation when FROM_EMAIL format is invalid', () => {
      process.env.SENDGRID_API_KEY = 'SG.test123.abcdef123456789012345678901234567890'
      process.env.FROM_EMAIL = 'invalid-email'

      const result = validator.validateEnvironmentVariables()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Invalid FROM_EMAIL: Invalid email address format')
    })

    it('should add warnings for missing optional environment variables', () => {
      process.env.SENDGRID_API_KEY = 'SG.test123.abcdef123456789012345678901234567890'
      process.env.FROM_EMAIL = 'test@example.com'
      delete process.env.MONGODB_URI
      delete process.env.JWT_SECRET

      const result = validator.validateEnvironmentVariables()

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('Optional environment variable not set: MONGODB_URI')
      expect(result.warnings).toContain('Optional environment variable not set: JWT_SECRET')
    })
  })

  describe('_validateSendGridApiKey', () => {
    it('should validate correct SendGrid API key format', () => {
      const result = validator._validateSendGridApiKey('SG.test123.abcdef123456789012345678901234567890')
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should reject API key not starting with SG.', () => {
      const result = validator._validateSendGridApiKey('invalid-key')
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('SendGrid API key must start with "SG."')
    })

    it('should reject API key that is too short', () => {
      const result = validator._validateSendGridApiKey('SG.short')
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('SendGrid API key appears to be too short')
    })

    it('should reject API key without proper structure', () => {
      const result = validator._validateSendGridApiKey('SG.onlyonepart')
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('SendGrid API key appears to be too short')
    })
  })

  describe('_validateEmailAddress', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ]

      validEmails.forEach(email => {
        const result = validator._validateEmailAddress(email)
        expect(result.valid).toBe(true)
        expect(result.error).toBeNull()
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@domain',
        'user name@example.com'
      ]

      invalidEmails.forEach(email => {
        const result = validator._validateEmailAddress(email)
        expect(result.valid).toBe(false)
        expect(result.error).toBe('Invalid email address format')
      })
    })
  })

  describe('validateSendGridSetup', async () => {
    const sgMail = await import('@sendgrid/mail')

    it('should pass validation when SendGrid setup is correct', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123.abcdef123456789012345678901234567890'
      process.env.FROM_EMAIL = 'test@example.com'

      // Mock SendGrid to throw a client error (indicating successful connection)
      sgMail.default.send.mockRejectedValue({ code: 400, message: 'Bad Request' })

      const result = await validator.validateSendGridSetup()

      expect(result.success).toBe(true)
      expect(result.details.apiKeyValid).toBe(true)
      expect(result.details.connectionEstablished).toBe(true)
      expect(result.details.permissionsValid).toBe(true)
    })

    it('should fail validation when API key is invalid', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123.abcdef123456789012345678901234567890'
      process.env.FROM_EMAIL = 'test@example.com'

      // Mock SendGrid to throw 401 error
      sgMail.default.send.mockRejectedValue({ code: 401, message: 'Unauthorized' })

      const result = await validator.validateSendGridSetup()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('SendGrid API key is invalid or expired')
      expect(result.details.apiKeyValid).toBe(false)
    })

    it('should fail validation when API key lacks permissions', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123.abcdef123456789012345678901234567890'
      process.env.FROM_EMAIL = 'test@example.com'

      // Mock SendGrid to throw 403 error
      sgMail.default.send.mockRejectedValue({ code: 403, message: 'Forbidden' })

      const result = await validator.validateSendGridSetup()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('SendGrid API key does not have sufficient permissions')
      expect(result.details.connectionEstablished).toBe(true)
      expect(result.details.permissionsValid).toBe(false)
    })

    it('should fail validation when SendGrid service is unavailable', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123.abcdef123456789012345678901234567890'
      process.env.FROM_EMAIL = 'test@example.com'

      // Mock SendGrid to throw 500 error
      sgMail.default.send.mockRejectedValue({ code: 500, message: 'Internal Server Error' })

      const result = await validator.validateSendGridSetup()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('SendGrid service is currently unavailable')
    })

    it('should fail validation when environment variables are invalid', async () => {
      process.env.SENDGRID_API_KEY = 'invalid-key'
      process.env.FROM_EMAIL = 'test@example.com'

      const result = await validator.validateSendGridSetup()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Environment validation failed')
    })
  })

  describe('validateEmailTemplate', () => {
    it('should validate template with correct variables', () => {
      const template = 'Hello {{name}}, your order {{orderId}} is ready!'
      const requiredVariables = { name: 'John', orderId: '12345' }

      const result = validator.validateEmailTemplate(template, requiredVariables)

      expect(result.success).toBe(true)
      expect(result.details.variablesFound).toEqual(['name', 'orderId'])
      expect(result.details.missingVariables).toHaveLength(0)
      expect(result.details.unusedVariables).toHaveLength(0)
    })

    it('should warn about missing required variables', () => {
      const template = 'Hello {{name}}!'
      const requiredVariables = { name: 'John', orderId: '12345' }

      const result = validator.validateEmailTemplate(template, requiredVariables)

      expect(result.success).toBe(true)
      expect(result.details.missingVariables).toContain('orderId')
      expect(result.warnings).toContain('Template missing required variable: {{orderId}}')
    })

    it('should warn about unused variables', () => {
      const template = 'Hello {{name}}, your order {{orderId}} is ready!'
      const requiredVariables = { name: 'John' }

      const result = validator.validateEmailTemplate(template, requiredVariables)

      expect(result.success).toBe(true)
      expect(result.details.unusedVariables).toContain('orderId')
      expect(result.warnings).toContain('Template contains undefined variable: {{orderId}}')
    })

    it('should fail validation for invalid template input', () => {
      const result = validator.validateEmailTemplate(null)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Template must be a non-empty string')
    })

    it('should validate HTML templates', () => {
      const template = '<html><body>Hello {{name}}!</body></html>'
      const requiredVariables = { name: 'John' }

      const result = validator.validateEmailTemplate(template, requiredVariables)

      expect(result.success).toBe(true)
    })

    it('should reject templates with script tags', () => {
      const template = '<html><body><script>alert("test")</script>Hello {{name}}!</body></html>'
      const requiredVariables = { name: 'John' }

      const result = validator.validateEmailTemplate(template, requiredVariables)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('HTML template contains script tags which are not allowed in emails')
    })
  })

  describe('generateConfigReport', () => {
    it('should generate comprehensive report when all validations pass', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123.abcdef123456789012345678901234567890'
      process.env.FROM_EMAIL = 'test@example.com'
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
      process.env.JWT_SECRET = 'secret'

      const sgMail = await import('@sendgrid/mail')
      sgMail.default.send.mockRejectedValue({ code: 400, message: 'Bad Request' })

      const report = await validator.generateConfigReport()

      expect(report.overall.success).toBe(true)
      expect(report.overall.score).toBe(100)
      expect(report.environment.success).toBe(true)
      expect(report.sendgrid.success).toBe(true)
      expect(report.recommendations).toContain('Email configuration is optimal')
    })

    it('should generate report with issues when validations fail', async () => {
      delete process.env.SENDGRID_API_KEY
      delete process.env.FROM_EMAIL

      const report = await validator.generateConfigReport()

      expect(report.overall.success).toBe(false)
      expect(report.overall.score).toBe(0)
      expect(report.environment.success).toBe(false)
      expect(report.recommendations).toContain('Fix environment variable configuration before proceeding')
    })

    it('should include timestamp in report', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123.abcdef123456789012345678901234567890'
      process.env.FROM_EMAIL = 'test@example.com'

      const sgMail = await import('@sendgrid/mail')
      sgMail.default.send.mockRejectedValue({ code: 400, message: 'Bad Request' })

      const report = await validator.generateConfigReport()

      expect(report.timestamp).toBeDefined()
      expect(new Date(report.timestamp)).toBeInstanceOf(Date)
    })
  })
})

describe('Convenience Functions', () => {
  let originalEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('validateEmailConfig', () => {
    it('should return configuration report', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123.abcdef123456789012345678901234567890'
      process.env.FROM_EMAIL = 'test@example.com'

      const sgMail = await import('@sendgrid/mail')
      sgMail.default.send.mockRejectedValue({ code: 400, message: 'Bad Request' })

      const result = await validateEmailConfig()

      expect(result).toHaveProperty('overall')
      expect(result).toHaveProperty('environment')
      expect(result).toHaveProperty('sendgrid')
      expect(result).toHaveProperty('recommendations')
    })
  })

  describe('validateEnvironmentVariables', () => {
    it('should validate environment variables', () => {
      process.env.SENDGRID_API_KEY = 'SG.test123.abcdef123456789012345678901234567890'
      process.env.FROM_EMAIL = 'test@example.com'

      const result = validateEnvironmentVariables()

      expect(result.success).toBe(true)
    })
  })

  describe('validateSendGridSetup', () => {
    it('should validate SendGrid setup', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123.abcdef123456789012345678901234567890'
      process.env.FROM_EMAIL = 'test@example.com'

      const sgMail = await import('@sendgrid/mail')
      sgMail.default.send.mockRejectedValue({ code: 400, message: 'Bad Request' })

      const result = await validateSendGridSetup()

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('details')
    })
  })

  describe('validateEmailTemplate', () => {
    it('should validate email template', () => {
      const template = 'Hello {{name}}!'
      const variables = { name: 'John' }

      const result = validateEmailTemplate(template, variables)

      expect(result.success).toBe(true)
    })
  })
})