import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertTriangle, Mail, Send, TestTube } from 'lucide-react'

export default function EmailTest() {
  const [recipientEmail, setRecipientEmail] = useState('pradeep2420pradeep@gmail.com')
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [emailStatus, setEmailStatus] = useState(null)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const testConnection = async () => {
    setIsTestingConnection(true)
    setConnectionStatus(null)

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection' })
      })

      const result = await response.json()
      setConnectionStatus(result)
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: `Connection test failed: ${error.message}`
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const sendTestEmail = async () => {
    setIsSendingEmail(true)
    setEmailStatus(null)

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'send-test-email',
          recipientEmail 
        })
      })

      const result = await response.json()
      setEmailStatus(result)
    } catch (error) {
      setEmailStatus({
        success: false,
        message: `Email test failed: ${error.message}`
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📧 Gmail Email Test</h1>
          <p className="text-gray-600">
            Test your Gmail SMTP connection and send test emails using Nodemailer
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Connection Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Gmail SMTP Connection Test
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Test if your Gmail SMTP credentials are working correctly.
              </p>
              
              <Button 
                onClick={testConnection}
                disabled={isTestingConnection}
                className="w-full"
              >
                {isTestingConnection ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>

              {connectionStatus && (
                <Alert className={connectionStatus.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <div className="flex items-center gap-2">
                    {connectionStatus.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )}
                    <AlertDescription className={connectionStatus.success ? 'text-green-700' : 'text-red-700'}>
                      {connectionStatus.message}
                    </AlertDescription>
                  </div>
                  {connectionStatus.success && connectionStatus.user && (
                    <div className="mt-2 text-sm text-green-600">
                      Using: {connectionStatus.user}
                    </div>
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Send Test Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Send Test Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="recipient">Recipient Email</Label>
                <Input
                  id="recipient"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="pradeep2420pradeep@gmail.com"
                />
              </div>
              
              <Button 
                onClick={sendTestEmail}
                disabled={isSendingEmail || !recipientEmail}
                className="w-full"
              >
                {isSendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending Email...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Test Email
                  </>
                )}
              </Button>

              {emailStatus && (
                <Alert className={emailStatus.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <div className="flex items-center gap-2">
                    {emailStatus.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )}
                    <AlertDescription className={emailStatus.success ? 'text-green-700' : 'text-red-700'}>
                      {emailStatus.message}
                    </AlertDescription>
                  </div>
                  {emailStatus.success && (
                    <div className="mt-2 text-sm text-green-600">
                      Check your inbox at {recipientEmail}
                    </div>
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Environment Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Current Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Email Provider:</span>
                <span className="ml-2 font-medium">Gmail SMTP</span>
              </div>
              <div>
                <span className="text-gray-600">From Email:</span>
                <span className="ml-2 font-medium">{process.env.EMAIL_USER || 'Not configured'}</span>
              </div>
              <div>
                <span className="text-gray-600">Service:</span>
                <span className="ml-2 font-medium">Nodemailer</span>
              </div>
              <div>
                <span className="text-gray-600">Default Recipient:</span>
                <span className="ml-2 font-medium">pradeep2420pradeep@gmail.com</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>📋 Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-medium text-blue-600">1.</span>
                <span>First, click "Test Connection" to verify your Gmail SMTP setup is working.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-blue-600">2.</span>
                <span>If connection is successful, click "Send Test Email" to send a test message.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-blue-600">3.</span>
                <span>Check your email inbox at <strong>pradeep2420pradeep@gmail.com</strong> to confirm receipt.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-blue-600">4.</span>
                <span>Once confirmed, your campaign builder will use Gmail for all email sending!</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}