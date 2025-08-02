import { sendTestEmail, testGmailConnection } from '../../lib/nodemailer-service.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action, recipientEmail } = req.body

    if (action === 'test-connection') {
      // Test Gmail SMTP connection
      const connectionResult = await testGmailConnection()
      return res.status(200).json(connectionResult)
    }

    if (action === 'send-test-email') {
      // Send test email
      const recipient = recipientEmail || 'pradeep2420pradeep@gmail.com'
      const emailResult = await sendTestEmail(recipient)
      
      return res.status(200).json({
        success: emailResult.success,
        message: emailResult.success 
          ? `Test email sent successfully to ${recipient}!` 
          : `Failed to send test email: ${emailResult.message}`,
        details: emailResult
      })
    }

    return res.status(400).json({ error: 'Invalid action' })

  } catch (error) {
    console.error('Test email API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}