import sgMail from "@sendgrid/mail"
import { getDatabase } from "./db.js"
import { EmailConfigValidator } from "./email-config.js"
import { EmailService } from "./email-service.js"
import { CampaignEngine } from "./campaign-engine.js"
import { ObjectId } from "mongodb"

/**
 * EmailTester class provides comprehensive testing capabilities for email functionality
 * Implements requirements 2.1, 2.2, 2.3, 5.4 from the email automation testing spec
 */
export class EmailTester {
  constructor() {
    this.db = null
    this.configValidator = new EmailConfigValidator()
    this.emailService = new EmailService()
    this.campaignEngine = new CampaignEngine()
    this.testResults = []
  }

  async init() {
    if (!this.db) {
      this.db = await getDatabase()
    }
    await this.emailService.init()
    await this.campaignEngine.init()
  }

  /**
   * Validates email configuration including environment variables and SendGrid setup
   * Requirement 2.1: Validate SendGrid API key configuration and connectivity
   */
  async validateConfiguration() {
    const testResult = {
      testType: 'configuration',
      testName: 'Email Configuration Validation',
      startTime: new Date(),
      success: false,
      details: {},
      errors: [],
      warnings: [],
      recommendations: []
    }

    try {
      await this.init()

      // Generate comprehensive configuration report
      const configReport = await this.configValidator.generateConfigReport()
      
      testResult.details = {
        environment: configReport.environment,
        sendgrid: configReport.sendgrid,
        overallScore: configReport.overall.score,
        timestamp: configReport.timestamp
      }

      testResult.success = configReport.overall.success
      
      if (!configReport.overall.success) {
        if (configReport.environment && !configReport.environment.success) {
          testResult.errors.push(...configReport.environment.errors)
        }
        if (configReport.sendgrid && !configReport.sendgrid.success) {
          testResult.errors.push(...configReport.sendgrid.errors)
        }
      }

      // Add warnings from both environment and SendGrid validation
      if (configReport.environment?.warnings) {
        testResult.warnings.push(...configReport.environment.warnings)
      }
      if (configReport.sendgrid?.warnings) {
        testResult.warnings.push(...configReport.sendgrid.warnings)
      }

      testResult.recommendations = configReport.recommendations || []

    } catch (error) {
      testResult.success = false
      testResult.errors.push(`Configuration validation failed: ${error.message}`)
      testResult.recommendations.push('Check system configuration and try again')
    }

    testResult.endTime = new Date()
    testResult.duration = testResult.endTime - testResult.startTime

    await this._logTestResult(testResult)
    return testResult
  }

  /**
   * Tests SendGrid API connectivity and permissions
   * Requirement 2.1: Validate SendGrid API key configuration and connectivity
   */
  async testSendGridConnection() {
    const testResult = {
      testType: 'connection',
      testName: 'SendGrid Connection Test',
      startTime: new Date(),
      success: false,
      details: {},
      errors: [],
      warnings: [],
      recommendations: []
    }

    try {
      await this.init()

      // Test SendGrid setup using config validator
      const sendGridValidation = await this.configValidator.validateSendGridSetup()
      
      testResult.details = {
        apiKeyValid: sendGridValidation.details.apiKeyValid,
        connectionEstablished: sendGridValidation.details.connectionEstablished,
        permissionsValid: sendGridValidation.details.permissionsValid,
        apiKeyFormat: this._analyzeApiKeyFormat(),
        testTimestamp: new Date()
      }

      testResult.success = sendGridValidation.success

      if (!sendGridValidation.success) {
        testResult.errors.push(...sendGridValidation.errors)
      }

      if (sendGridValidation.warnings) {
        testResult.warnings.push(...sendGridValidation.warnings)
      }

      // Add specific recommendations based on test results
      if (!testResult.details.apiKeyValid) {
        testResult.recommendations.push('Verify SENDGRID_API_KEY environment variable is set correctly')
      }
      if (!testResult.details.connectionEstablished) {
        testResult.recommendations.push('Check network connectivity and firewall settings')
      }
      if (!testResult.details.permissionsValid) {
        testResult.recommendations.push('Verify API key has mail.send permissions in SendGrid dashboard')
      }

    } catch (error) {
      testResult.success = false
      testResult.errors.push(`SendGrid connection test failed: ${error.message}`)
      testResult.recommendations.push('Check SendGrid API key and network connectivity')
    }

    testResult.endTime = new Date()
    testResult.duration = testResult.endTime - testResult.startTime

    await this._logTestResult(testResult)
    return testResult
  }

  /**
   * Sends test email with detailed logging and validation
   * Requirement 2.2: Send test messages to specified recipients and log results
   */
  async sendTestEmail(options = {}) {
    const testResult = {
      testType: 'test_email',
      testName: 'Test Email Sending',
      startTime: new Date(),
      success: false,
      details: {},
      errors: [],
      warnings: [],
      recommendations: []
    }

    try {
      await this.init()

      // Set default test email options
      const emailOptions = {
        to: options.to || 'test@example.com',
        subject: options.subject || `Email Test - ${new Date().toISOString()}`,
        content: options.content || this._generateTestEmailContent(),
        templateData: options.templateData || { testTimestamp: new Date().toISOString() },
        from: options.from || process.env.FROM_EMAIL,
        ...options
      }

      // Validate email options before sending
      const validation = this._validateTestEmailOptions(emailOptions)
      if (!validation.success) {
        testResult.errors.push(...validation.errors)
        testResult.recommendations.push('Fix email validation errors before sending')
        testResult.endTime = new Date()
        testResult.duration = testResult.endTime - testResult.startTime
        await this._logTestResult(testResult)
        return testResult
      }

      // Send test email using EmailService
      const emailResult = await this.emailService.sendEmailWithRetry(emailOptions, {
        maxRetries: options.maxRetries || 2
      })

      testResult.details = {
        emailOptions: {
          to: emailOptions.to,
          subject: emailOptions.subject,
          from: emailOptions.from,
          hasTemplateData: Object.keys(emailOptions.templateData).length > 0
        },
        sendResult: emailResult,
        messageId: emailResult.messageId,
        logId: emailResult.logId
      }

      testResult.success = emailResult.success

      if (!emailResult.success) {
        testResult.errors.push(emailResult.message || 'Email sending failed')
        
        // Add specific recommendations based on error type
        switch (emailResult.errorType) {
          case 'configuration':
            testResult.recommendations.push('Fix SendGrid configuration issues')
            break
          case 'validation':
            testResult.recommendations.push('Check email format and content')
            break
          case 'delivery':
            testResult.recommendations.push('Check recipient email address and try again')
            break
          default:
            testResult.recommendations.push('Check email service logs for more details')
        }
      } else {
        testResult.recommendations.push('Test email sent successfully - check recipient inbox')
      }

      // Add warnings for common issues
      if (emailOptions.to.includes('example.com')) {
        testResult.warnings.push('Test email sent to example.com domain - use real email for actual testing')
      }

    } catch (error) {
      testResult.success = false
      testResult.errors.push(`Test email sending failed: ${error.message}`)
      testResult.recommendations.push('Check email service configuration and try again')
    }

    testResult.endTime = new Date()
    testResult.duration = testResult.endTime - testResult.startTime

    await this._logTestResult(testResult)
    return testResult
  }

  /**
   * Tests template processing and variable substitution
   * Requirement 2.3: Verify template processing and variable substitution functionality
   */
  async testTemplateProcessing(template, templateData = {}) {
    const testResult = {
      testType: 'template',
      testName: 'Template Processing Test',
      startTime: new Date(),
      success: false,
      details: {},
      errors: [],
      warnings: [],
      recommendations: []
    }

    try {
      await this.init()

      // Use default test template if none provided
      const testTemplate = template || this._generateTestTemplate()
      const testData = Object.keys(templateData).length > 0 ? templateData : this._generateTestTemplateData()

      // Validate template using EmailService
      const templateValidation = await this.emailService.validateTemplate(testTemplate, testData)
      
      testResult.details.templateValidation = templateValidation

      if (!templateValidation.success) {
        testResult.errors.push(templateValidation.error)
        testResult.success = false
      } else {
        // Test template preview functionality
        const previewResult = await this.emailService.previewEmail({
          to: 'preview@example.com',
          subject: 'Template Test - {{testName}}',
          content: testTemplate,
          templateData: testData
        })

        testResult.details.previewResult = previewResult
        testResult.success = previewResult.success

        if (!previewResult.success) {
          testResult.errors.push(previewResult.error)
        } else {
          // Analyze template processing results
          const analysis = this._analyzeTemplateProcessing(testTemplate, testData, previewResult.preview)
          testResult.details.analysis = analysis

          if (analysis.hasUnprocessedVariables) {
            testResult.warnings.push('Some template variables were not processed')
          }
          if (analysis.hasExtraVariables) {
            testResult.warnings.push('Template data contains unused variables')
          }
        }
      }

      // Add warnings from template validation
      if (templateValidation.warnings) {
        testResult.warnings.push(...templateValidation.warnings)
      }

      // Generate recommendations
      if (testResult.details.templateValidation?.missingVariables?.length > 0) {
        testResult.recommendations.push('Provide values for missing template variables')
      }
      if (testResult.details.templateValidation?.unusedVariables?.length > 0) {
        testResult.recommendations.push('Remove unused variables from template data or add them to template')
      }
      if (testResult.success) {
        testResult.recommendations.push('Template processing is working correctly')
      }

    } catch (error) {
      testResult.success = false
      testResult.errors.push(`Template processing test failed: ${error.message}`)
      testResult.recommendations.push('Check template syntax and variable format')
    }

    testResult.endTime = new Date()
    testResult.duration = testResult.endTime - testResult.startTime

    await this._logTestResult(testResult)
    return testResult
  }

  /**
   * Runs comprehensive health check of email system
   * Requirement 2.1: Comprehensive system health validation
   */
  async runHealthCheck() {
    const healthCheck = {
      testType: 'health_check',
      testName: 'Email System Health Check',
      startTime: new Date(),
      success: false,
      details: {},
      errors: [],
      warnings: [],
      recommendations: [],
      overallScore: 0
    }

    try {
      await this.init()

      // Run all individual tests
      const configTest = await this.validateConfiguration()
      const connectionTest = await this.testSendGridConnection()
      const templateTest = await this.testTemplateProcessing()

      // Compile results
      healthCheck.details = {
        configuration: configTest,
        connection: connectionTest,
        template: templateTest,
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          timestamp: new Date(),
          environment: process.env.NODE_ENV || 'development'
        }
      }

      // Calculate overall success and score
      const tests = [configTest, connectionTest, templateTest]
      const successfulTests = tests.filter(test => test.success).length
      const totalTests = tests.length

      healthCheck.success = successfulTests === totalTests
      healthCheck.overallScore = Math.round((successfulTests / totalTests) * 100)

      // Compile all errors and warnings
      tests.forEach(test => {
        if (test.errors) healthCheck.errors.push(...test.errors)
        if (test.warnings) healthCheck.warnings.push(...test.warnings)
      })

      // Generate overall recommendations
      if (healthCheck.success) {
        healthCheck.recommendations.push('Email system is healthy and ready for use')
      } else {
        healthCheck.recommendations.push('Address failing tests before using email system in production')
        
        if (!configTest.success) {
          healthCheck.recommendations.push('Fix configuration issues first')
        }
        if (!connectionTest.success) {
          healthCheck.recommendations.push('Resolve SendGrid connectivity problems')
        }
        if (!templateTest.success) {
          healthCheck.recommendations.push('Fix template processing issues')
        }
      }

    } catch (error) {
      healthCheck.success = false
      healthCheck.errors.push(`Health check failed: ${error.message}`)
      healthCheck.recommendations.push('Check system configuration and dependencies')
    }

    healthCheck.endTime = new Date()
    healthCheck.duration = healthCheck.endTime - healthCheck.startTime

    await this._logTestResult(healthCheck)
    return healthCheck
  }

  /**
   * Tests campaign email flow with dry-run mode support
   * Requirement 5.4: Support dry-run mode that validates without actually sending emails
   */
  async testCampaignFlow(campaignId, dryRun = false) {
    const testResult = {
      testType: 'campaign_flow',
      testName: `Campaign Flow Test ${dryRun ? '(Dry Run)' : ''}`,
      startTime: new Date(),
      success: false,
      details: {},
      errors: [],
      warnings: [],
      recommendations: []
    }

    try {
      await this.init()

      if (!campaignId) {
        testResult.errors.push('Campaign ID is required')
        testResult.recommendations.push('Provide a valid campaign ID')
        testResult.endTime = new Date()
        testResult.duration = testResult.endTime - testResult.startTime
        await this._logTestResult(testResult)
        return testResult
      }

      // Fetch campaign from database
      const campaign = await this.db.collection('campaigns').findOne({
        _id: new ObjectId(campaignId)
      })

      if (!campaign) {
        testResult.errors.push('Campaign not found')
        testResult.recommendations.push('Verify campaign ID exists in database')
        testResult.endTime = new Date()
        testResult.duration = testResult.endTime - testResult.startTime
        await this._logTestResult(testResult)
        return testResult
      }

      // Analyze campaign structure
      const campaignAnalysis = this._analyzeCampaignStructure(campaign)
      testResult.details.campaignAnalysis = campaignAnalysis

      if (campaignAnalysis.errors.length > 0) {
        testResult.errors.push(...campaignAnalysis.errors)
      }
      if (campaignAnalysis.warnings.length > 0) {
        testResult.warnings.push(...campaignAnalysis.warnings)
      }

      // Test campaign simulation
      const testUserData = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        userId: 'test-user-123'
      }

      const simulation = await this.campaignEngine.simulateUserJourney(
        campaignId,
        testUserData,
        [] // No events for basic test
      )

      testResult.details.simulation = simulation

      if (dryRun) {
        // In dry-run mode, validate email nodes without sending
        const emailValidationResults = await this._validateCampaignEmails(campaign, testUserData)
        testResult.details.emailValidation = emailValidationResults
        
        testResult.success = campaignAnalysis.errors.length === 0 && 
                            emailValidationResults.every(result => result.success)
        
        if (!testResult.success) {
          testResult.errors.push('Campaign validation failed in dry-run mode')
        }
      } else {
        // In live mode, actually run the campaign with test data
        try {
          const campaignRunId = await this.campaignEngine.startCampaign(
            campaignId,
            testUserData.userId,
            testUserData
          )
          
          testResult.details.campaignRunId = campaignRunId
          testResult.success = true
          testResult.recommendations.push('Campaign test run completed - check email logs for results')
        } catch (error) {
          testResult.errors.push(`Campaign execution failed: ${error.message}`)
        }
      }

      // Generate recommendations based on analysis
      if (campaignAnalysis.emailNodes.length === 0) {
        testResult.warnings.push('Campaign contains no email nodes')
      }
      if (campaignAnalysis.hasOrphanedNodes) {
        testResult.warnings.push('Campaign contains orphaned nodes')
      }
      if (campaignAnalysis.hasInfiniteLoops) {
        testResult.errors.push('Campaign may contain infinite loops')
      }

    } catch (error) {
      testResult.success = false
      testResult.errors.push(`Campaign flow test failed: ${error.message}`)
      testResult.recommendations.push('Check campaign structure and database connectivity')
    }

    testResult.endTime = new Date()
    testResult.duration = testResult.endTime - testResult.startTime

    await this._logTestResult(testResult)
    return testResult
  }

  /**
   * Gets test results history with filtering options
   */
  async getTestResults(options = {}) {
    try {
      await this.init()

      const filter = {}
      if (options.testType) filter.testType = options.testType
      if (options.success !== undefined) filter.success = options.success
      if (options.since) filter.startTime = { $gte: new Date(options.since) }

      const results = await this.db.collection('email_test_results')
        .find(filter)
        .sort({ startTime: -1 })
        .limit(options.limit || 50)
        .toArray()

      return {
        success: true,
        results,
        total: results.length
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get test results: ${error.message}`
      }
    }
  }

  // Private helper methods

  _analyzeApiKeyFormat() {
    const apiKey = process.env.SENDGRID_API_KEY
    if (!apiKey) return { valid: false, reason: 'API key not found' }

    return {
      valid: apiKey.startsWith('SG.') && apiKey.length > 20,
      length: apiKey.length,
      format: apiKey.startsWith('SG.') ? 'correct' : 'incorrect',
      masked: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`
    }
  }

  _validateTestEmailOptions(options) {
    const errors = []
    
    if (!options.to || !this._isValidEmail(options.to)) {
      errors.push('Valid recipient email is required')
    }
    if (!options.subject) {
      errors.push('Email subject is required')
    }
    if (!options.content) {
      errors.push('Email content is required')
    }

    return {
      success: errors.length === 0,
      errors
    }
  }

  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  _generateTestEmailContent() {
    return `
<h2>Email System Test</h2>
<p>This is a test email sent at {{testTimestamp}}.</p>
<p>If you received this email, the email system is working correctly.</p>
<ul>
  <li>SendGrid integration: ✓</li>
  <li>Template processing: ✓</li>
  <li>Email delivery: ✓</li>
</ul>
<p>Test completed successfully!</p>
    `.trim()
  }

  _generateTestTemplate() {
    return `
<h2>Hello {{firstName}} {{lastName}}!</h2>
<p>Welcome to our {{serviceName}} service.</p>
<p>Your account was created on {{createdDate}} and your user ID is {{userId}}.</p>
<p>Thank you for joining us!</p>
    `.trim()
  }

  _generateTestTemplateData() {
    return {
      firstName: 'John',
      lastName: 'Doe',
      serviceName: 'Email Testing',
      createdDate: new Date().toLocaleDateString(),
      userId: 'test-123'
    }
  }

  _analyzeTemplateProcessing(template, templateData, processedResult) {
    const analysis = {
      hasUnprocessedVariables: false,
      hasExtraVariables: false,
      processedVariables: [],
      unprocessedVariables: [],
      extraVariables: []
    }

    // Find variables in original template
    const templateVars = template.match(/\{\{(\w+)\}\}/g) || []
    const templateVarNames = templateVars.map(v => v.replace(/[{}]/g, ''))

    // Check if variables were processed
    templateVarNames.forEach(varName => {
      if (processedResult.content.includes(`{{${varName}}}`)) {
        analysis.unprocessedVariables.push(varName)
        analysis.hasUnprocessedVariables = true
      } else {
        analysis.processedVariables.push(varName)
      }
    })

    // Check for extra variables in data
    Object.keys(templateData).forEach(dataKey => {
      if (!templateVarNames.includes(dataKey)) {
        analysis.extraVariables.push(dataKey)
        analysis.hasExtraVariables = true
      }
    })

    return analysis
  }

  _analyzeCampaignStructure(campaign) {
    const analysis = {
      totalNodes: campaign.schema.nodes.length,
      totalEdges: campaign.schema.edges.length,
      emailNodes: [],
      startNodes: [],
      endNodes: [],
      errors: [],
      warnings: [],
      hasOrphanedNodes: false,
      hasInfiniteLoops: false
    }

    // Analyze nodes
    campaign.schema.nodes.forEach(node => {
      switch (node.type) {
        case 'email':
          analysis.emailNodes.push(node)
          // Validate email node structure
          if (!node.data?.subject) {
            analysis.errors.push(`Email node ${node.id} missing subject`)
          }
          if (!node.data?.content) {
            analysis.errors.push(`Email node ${node.id} missing content`)
          }
          break
        case 'start':
          analysis.startNodes.push(node)
          break
        case 'end':
          analysis.endNodes.push(node)
          break
      }
    })

    // Check for structural issues
    if (analysis.startNodes.length === 0) {
      analysis.errors.push('Campaign has no start node')
    }
    if (analysis.startNodes.length > 1) {
      analysis.warnings.push('Campaign has multiple start nodes')
    }
    if (analysis.endNodes.length === 0) {
      analysis.warnings.push('Campaign has no end node')
    }

    // Check for orphaned nodes (nodes with no incoming or outgoing edges)
    const nodeIds = campaign.schema.nodes.map(n => n.id)
    const connectedNodes = new Set()
    
    campaign.schema.edges.forEach(edge => {
      connectedNodes.add(edge.source)
      connectedNodes.add(edge.target)
    })

    const orphanedNodes = nodeIds.filter(id => !connectedNodes.has(id))
    if (orphanedNodes.length > 0) {
      analysis.hasOrphanedNodes = true
      analysis.warnings.push(`Orphaned nodes found: ${orphanedNodes.join(', ')}`)
    }

    return analysis
  }

  async _validateCampaignEmails(campaign, userData) {
    const results = []

    for (const node of campaign.schema.nodes) {
      if (node.type === 'email') {
        const validation = await this.emailService.previewEmail({
          to: userData.email,
          subject: node.data.subject,
          content: node.data.content,
          templateData: userData
        })

        results.push({
          nodeId: node.id,
          success: validation.success,
          error: validation.error,
          preview: validation.preview
        })
      }
    }

    return results
  }

  async _logTestResult(testResult) {
    try {
      await this.init()
      
      const logEntry = {
        ...testResult,
        executedBy: 'email-tester',
        timestamp: new Date()
      }

      await this.db.collection('email_test_results').insertOne(logEntry)
      this.testResults.push(testResult)
    } catch (error) {
      console.error('Failed to log test result:', error)
    }
  }
}

// Export convenience functions for direct use
export async function validateEmailConfiguration() {
  const tester = new EmailTester()
  return await tester.validateConfiguration()
}

export async function testSendGridConnection() {
  const tester = new EmailTester()
  return await tester.testSendGridConnection()
}

export async function sendTestEmail(options) {
  const tester = new EmailTester()
  return await tester.sendTestEmail(options)
}

export async function testTemplateProcessing(template, templateData) {
  const tester = new EmailTester()
  return await tester.testTemplateProcessing(template, templateData)
}

export async function runEmailHealthCheck() {
  const tester = new EmailTester()
  return await tester.runHealthCheck()
}

export async function testCampaignFlow(campaignId, dryRun = false) {
  const tester = new EmailTester()
  return await tester.testCampaignFlow(campaignId, dryRun)
}