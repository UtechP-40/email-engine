import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock SendGrid
vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn()
  }
}))

import { EmailService, emailService, sendEmail, sendEmailWithRetry } from '../email-service.js'

// Mock database
const mockDb = {
  collection: vi.fn(() => ({
    insertOne: vi.fn(() => ({ insertedId: 'mock-log-id' })),
    findOne: vi.fn(),
    updateOne: vi.fn()
  }))
}

vi.mock('../db.js', () => ({
  getDatabase: vi.fn(() => Promise.resolve(mockDb))
}))

describe('EmailService', () => {
  let service
  let originalEnv
  let mockSend

  beforeEach(async () => {
    service = new EmailService()
    originalEnv = { ...process.env }
    process.env.SENDGRID_API_KEY = 'SG.test123.abcdef123456789012345678901234567890'
    process.env.FROM_EMAIL = 'test@example.com'
    
    // Get the mocked SendGrid instance
    const sgMail = await import('@sendgrid/mail')
    mockSend = sgMail.default.send
    
    // Reset mocks
    vi.clearAllMocks()
    mockSend.mockResolvedValue([{
      headers: { 'x-message-id': 'test-message-id' }
    }])
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('sendEmail', () => {
    it('should send email successfully with basic data', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        content: 'Test content'
      }

      const result = await service.sendEmail(emailData)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('test-message-id')
      expect(result.details.to).toBe('recipient@example.com')
      expect(result.details.subject).toBe('Test Subject')
      
      expect(mockSend).toHaveBeenCalledWith({
        to: 'recipient@example.com',
        from: 'test@example.com',
        subject: 'Test Subject',
        html: 'Test content'
      })
    })

    it('should process template variables correctly', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Hello {{name}}',
        content: 'Welcome {{name}}, your order {{orderId}} is ready!',
        templateData: {
          name: 'John Doe',
          orderId: '12345'
        }
      }

      const result = await service.sendEmail(emailData)

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledWith({
        to: 'recipient@example.com',
        from: 'test@example.com',
        subject: 'Hello John Doe',
        html: 'Welcome John Doe, your order 12345 is ready!'
      })
    })

    it('should use custom from address when provided', async () => {
      const emailData = {
        to: 'recipient@example.com',
        from: 'custom@example.com',
        subject: 'Test Subject',
        content: 'Test content'
      }

      await service.sendEmail(emailData)

      expect(mockSend).toHaveBeenCalledWith({
        to: 'recipient@example.com',
        from: 'custom@example.com',
        subject: 'Test Subject',
        html: 'Test content'
      })
    })

    it('should include attachments when provided', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        content: 'Test content',
        attachments: [{ filename: 'test.pdf', content: 'base64content' }]
      }

      await service.sendEmail(emailData)

      expect(mockSend).toHaveBeenCalledWith({
        to: 'recipient@example.com',
        from: 'test@example.com',
        subject: 'Test Subject',
        html: 'Test content',
        attachments: [{ filename: 'test.pdf', content: 'base64content' }]
      })
    })

    it('should fail validation for missing recipient', async () => {
      const emailData = {
        subject: 'Test Subject',
        content: 'Test content'
      }

      const result = await service.sendEmail(emailData)

      expect(result.success).toBe(false)
      expect(result.errorType).toBe('validation')
      expect(result.errorCode).toBe('EMAIL_VALIDATION_FAILED')
      expect(result.message).toContain('Recipient email (to) is required')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should fail validation for invalid email format', async () => {
      const emailData = {
        to: 'invalid-email',
        subject: 'Test Subject',
        content: 'Test content'
      }

      const result = await service.sendEmail(emailData)

      expect(result.success).toBe(false)
      expect(result.errorType).toBe('validation')
      expect(result.message).toContain('Invalid recipient email format')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should fail validation for missing subject', async () => {
      const emailData = {
        to: 'recipient@example.com',
        content: 'Test content'
      }

      const result = await service.sendEmail(emailData)

      expect(result.success).toBe(false)
      expect(result.errorType).toBe('validation')
      expect(result.message).toContain('Email subject is required')
    })

    it('should fail validation for missing content', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject'
      }

      const result = await service.sendEmail(emailData)

      expect(result.success).toBe(false)
      expect(result.errorType).toBe('validation')
      expect(result.message).toContain('Email content is required')
    })

    it('should handle SendGrid 401 error correctly', async () => {
      mockSend.mockRejectedValue({ code: 401, message: 'Unauthorized' })

      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        content: 'Test content'
      }

      const result = await service.sendEmail(emailData)

      expect(result.success).toBe(false)
      expect(result.errorType).toBe('configuration')
      expect(result.errorCode).toBe('UNAUTHORIZED')
      expect(result.message).toBe('SendGrid API key is invalid or expired')
      expect(result.details.suggestions).toContain('Verify SENDGRID_API_KEY environment variable')
    })

    it('should handle SendGrid 429 rate limit error', async () => {
      mockSend.mockRejectedValue({ code: 429, message: 'Too Many Requests' })

      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        content: 'Test content'
      }

      const result = await service.sendEmail(emailData)

      expect(result.success).toBe(false)
      expect(result.errorType).toBe('delivery')
      expect(result.errorCode).toBe('RATE_LIMIT_EXCEEDED')
      expect(result.details.suggestions).toContain('Implement rate limiting or upgrade SendGrid plan')
    })

    it('should respect rate limiting', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        content: 'Test content'
      }

      // Send 10 emails quickly (should be allowed)
      for (let i = 0; i < 10; i++) {
        const result = await service.sendEmail(emailData)
        expect(result.success).toBe(true)
      }

      // 11th email should be rate limited
      const result = await service.sendEmail(emailData)
      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('RATE_LIMIT_EXCEEDED')
      expect(result.details.retryAfter).toBeGreaterThan(0)
    })
  })

  describe('sendEmailWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        content: 'Test content'
      }

      const result = await service.sendEmailWithRetry(emailData)

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('should retry on delivery errors and succeed', async () => {
      mockSend
        .mockRejectedValueOnce({ code: 500, message: 'Internal Server Error' })
        .mockResolvedValueOnce([{ headers: { 'x-message-id': 'test-message-id' } }])

      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        content: 'Test content'
      }

      const result = await service.sendEmailWithRetry(emailData, { maxRetries: 2 })

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it('should not retry on validation errors', async () => {
      const emailData = {
        to: 'invalid-email',
        subject: 'Test Subject',
        content: 'Test content'
      }

      const result = await service.sendEmailWithRetry(emailData, { maxRetries: 3 })

      expect(result.success).toBe(false)
      expect(result.errorType).toBe('validation')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('should not retry on configuration errors', async () => {
      mockSend.mockRejectedValue({ code: 401, message: 'Unauthorized' })

      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        content: 'Test content'
      }

      const result = await service.sendEmailWithRetry(emailData, { maxRetries: 3 })

      expect(result.success).toBe(false)
      expect(result.errorType).toBe('configuration')
      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('should fail after max retries', async () => {
      mockSend.mockRejectedValue({ code: 500, message: 'Internal Server Error' })

      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        content: 'Test content'
      }

      const result = await service.sendEmailWithRetry(emailData, { maxRetries: 2 })

      expect(result.success).toBe(false)
      expect(result.finalAttempt).toBe(true)
      expect(result.retryAttempts).toBe(2)
      expect(mockSend).toHaveBeenCalledTimes(2)
    })
  })

  describe('validateTemplate', () => {
    it('should validate template with correct variables', async () => {
      const template = 'Hello {{name}}, your order {{orderId}} is ready!'
      const templateData = { name: 'John', orderId: '12345' }

      const result = await service.validateTemplate(template, templateData)

      expect(result.success).toBe(true)
      expect(result.templateVariables).toEqual(['name', 'orderId'])
      expect(result.missingVariables).toHaveLength(0)
      expect(result.unusedVariables).toHaveLength(0)
    })

    it('should warn about missing variables', async () => {
      const template = 'Hello {{name}}, your order {{orderId}} is ready!'
      const templateData = { name: 'John' }

      const result = await service.validateTemplate(template, templateData)

      expect(result.success).toBe(true)
      expect(result.missingVariables).toContain('orderId')
      expect(result.warnings).toContain('Missing template variable: {{orderId}}')
    })

    it('should warn about unused variables', async () => {
      const template = 'Hello {{name}}!'
      const templateData = { name: 'John', orderId: '12345' }

      const result = await service.validateTemplate(template, templateData)

      expect(result.success).toBe(true)
      expect(result.unusedVariables).toContain('orderId')
      expect(result.warnings).toContain('Unused template data: orderId')
    })

    it('should reject templates with script tags', async () => {
      const template = '<script>alert("test")</script>Hello {{name}}!'
      const templateData = { name: 'John' }

      const result = await service.validateTemplate(template, templateData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('potentially dangerous content')
    })

    it('should reject invalid template input', async () => {
      const result = await service.validateTemplate(null)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Template must be a non-empty string')
    })
  })

  describe('previewEmail', () => {
    it('should generate email preview successfully', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Hello {{name}}',
        content: 'Welcome {{name}}, your order {{orderId}} is ready!',
        templateData: {
          name: 'John Doe',
          orderId: '12345'
        }
      }

      const result = await service.previewEmail(emailData)

      expect(result.success).toBe(true)
      expect(result.preview.to).toBe('recipient@example.com')
      expect(result.preview.subject).toBe('Hello John Doe')
      expect(result.preview.content).toBe('Welcome John Doe, your order 12345 is ready!')
      expect(result.preview.htmlPreview).toContain('<!DOCTYPE html>')
      expect(result.preview.textPreview).toBe('Welcome John Doe, your order 12345 is ready!')
      expect(result.metadata.templateVariables).toEqual(['name', 'orderId'])
      expect(result.metadata.contentLength).toBeGreaterThan(0)
    })

    it('should work without recipient for preview', async () => {
      const emailData = {
        subject: 'Test Subject',
        content: 'Test content'
      }

      const result = await service.previewEmail(emailData)

      expect(result.success).toBe(true)
      expect(result.preview.to).toBe('preview@example.com')
    })

    it('should fail preview for missing content', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject'
      }

      const result = await service.previewEmail(emailData)

      expect(result.success).toBe(false)
      expect(result.errorType).toBe('validation')
    })
  })

  describe('getDeliveryStatus', () => {
    it('should return delivery status for existing message', async () => {
      const mockEmailLog = {
        messageId: 'test-message-id',
        status: 'delivered',
        recipient: 'recipient@example.com',
        subject: 'Test Subject',
        createdAt: new Date(),
        deliveredAt: new Date(),
        updatedAt: new Date()
      }

      // Reset the mock to ensure it returns the expected value
      mockDb.collection.mockReturnValue({
        findOne: vi.fn().mockResolvedValue(mockEmailLog),
        insertOne: vi.fn(() => ({ insertedId: 'mock-log-id' })),
        updateOne: vi.fn()
      })

      const result = await service.getDeliveryStatus('test-message-id')

      expect(result.success).toBe(true)
      expect(result.status).toBe('delivered')
      expect(result.messageId).toBe('test-message-id')
      expect(result.recipient).toBe('recipient@example.com')
    })

    it('should return not found for non-existent message', async () => {
      mockDb.collection().findOne.mockResolvedValue(null)

      const result = await service.getDeliveryStatus('non-existent-id')

      expect(result.success).toBe(false)
      expect(result.errorType).toBe('not_found')
      expect(result.error).toBe('Message not found')
    })
  })

  describe('bulkSend', () => {
    it('should send multiple emails successfully', async () => {
      const emailList = [
        { to: 'user1@example.com', subject: 'Test 1', content: 'Content 1' },
        { to: 'user2@example.com', subject: 'Test 2', content: 'Content 2' }
      ]

      const result = await service.bulkSend(emailList, { batchSize: 2, delayBetweenBatches: 0 })

      expect(result.total).toBe(2)
      expect(result.successful).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(2)
      expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it('should handle mixed success and failure', async () => {
      mockSend
        .mockResolvedValueOnce([{ headers: { 'x-message-id': 'msg-1' } }])
        .mockRejectedValueOnce({ code: 400, message: 'Bad Request' })

      const emailList = [
        { to: 'user1@example.com', subject: 'Test 1', content: 'Content 1' },
        { to: 'invalid-email', subject: 'Test 2', content: 'Content 2' }
      ]

      const result = await service.bulkSend(emailList, { batchSize: 2, delayBetweenBatches: 0 })

      expect(result.total).toBe(2)
      expect(result.successful).toBe(1)
      expect(result.failed).toBe(1)
    })
  })

  describe('template caching', () => {
    it('should cache processed templates', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Hello {{name}}',
        content: 'Welcome {{name}}!',
        templateData: { name: 'John' }
      }

      // First call should process template
      await service.sendEmail(emailData)
      
      // Second call should use cache
      await service.sendEmail(emailData)

      expect(mockSend).toHaveBeenCalledTimes(2)
      // Both calls should have the same processed content
      expect(mockSend).toHaveBeenNthCalledWith(1, expect.objectContaining({
        subject: 'Hello John',
        html: 'Welcome John!'
      }))
      expect(mockSend).toHaveBeenNthCalledWith(2, expect.objectContaining({
        subject: 'Hello John',
        html: 'Welcome John!'
      }))
    })

    it('should limit cache size', async () => {
      // Fill cache beyond limit
      for (let i = 0; i < 105; i++) {
        const emailData = {
          to: 'recipient@example.com',
          subject: `Subject ${i}`,
          content: `Content ${i} with {{var${i}}}`,
          templateData: { [`var${i}`]: `value${i}` }
        }
        await service.sendEmail(emailData)
      }

      // Cache should be limited to 100 items
      expect(service.templateCache.size).toBeLessThanOrEqual(100)
    })
  })

  describe('convenience functions', () => {
    it('should export sendEmail function', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        content: 'Test content'
      }

      const result = await sendEmail(emailData)
      expect(result.success).toBe(true)
    })

    it('should export sendEmailWithRetry function', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        content: 'Test content'
      }

      const result = await sendEmailWithRetry(emailData)
      expect(result.success).toBe(true)
    })
  })

  describe('error categorization', () => {
    it('should categorize validation errors correctly', async () => {
      const result = await service.sendEmail({})
      
      expect(result.errorType).toBe('validation')
      expect(result.errorCode).toBe('EMAIL_VALIDATION_FAILED')
    })

    it('should categorize configuration errors correctly', async () => {
      mockSend.mockRejectedValue({ code: 401, message: 'Unauthorized' })
      
      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        content: 'Test'
      })
      
      expect(result.errorType).toBe('configuration')
      expect(result.errorCode).toBe('UNAUTHORIZED')
    })

    it('should categorize delivery errors correctly', async () => {
      mockSend.mockRejectedValue({ code: 500, message: 'Internal Server Error' })
      
      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        content: 'Test'
      })
      
      expect(result.errorType).toBe('delivery')
      expect(result.errorCode).toBe('SERVICE_UNAVAILABLE')
    })
  })
})

describe('EmailService singleton', () => {
  it('should export singleton instance', () => {
    expect(emailService).toBeInstanceOf(EmailService)
  })
})