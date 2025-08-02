"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, User, Mail, Clock, CheckCircle, AlertCircle, ArrowRight } from "lucide-react"

function CampaignSimulator({ campaign, onSimulate }) {
  const [simulationData, setSimulationData] = useState({
    testUser: {
      name: "John Doe",
      email: "john@example.com",
      company: "Test Company",
      signup_date: "2024-01-15"
    },
    userBehavior: {
      email_opened: false,
      email_clicked: false,
      purchase_made: false,
      idle_days: 0
    },
    simulationSpeed: "normal" // normal, fast, instant
  })
  
  const [simulationResults, setSimulationResults] = useState(null)
  const [isSimulating, setIsSimulating] = useState(false)

  // Simulate campaign flow
  const runSimulation = async () => {
    if (!campaign || !campaign.schema) {
      alert("Please create a campaign first!")
      return
    }

    setIsSimulating(true)
    setSimulationResults(null)

    try {
      // Simulate the campaign flow
      const simulation = await simulateCampaignFlow(campaign.schema, simulationData)
      setSimulationResults(simulation)
      
      if (onSimulate) {
        onSimulate(simulation)
      }
    } catch (error) {
      console.error("Simulation error:", error)
      setSimulationResults({
        success: false,
        error: error.message,
        steps: []
      })
    } finally {
      setIsSimulating(false)
    }
  }

  // Update test user data
  const updateTestUser = (field, value) => {
    setSimulationData(prev => ({
      ...prev,
      testUser: { ...prev.testUser, [field]: value }
    }))
  }

  // Update user behavior
  const updateUserBehavior = (field, value) => {
    setSimulationData(prev => ({
      ...prev,
      userBehavior: { ...prev.userBehavior, [field]: value }
    }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Campaign Simulator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="user" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="user">👤 Test User</TabsTrigger>
              <TabsTrigger value="behavior">🎯 Behavior</TabsTrigger>
              <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
            </TabsList>

            {/* Test User Tab */}
            <TabsContent value="user" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="test-name">Name</Label>
                  <Input
                    id="test-name"
                    value={simulationData.testUser.name}
                    onChange={(e) => updateTestUser("name", e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="test-email">Email</Label>
                  <Input
                    id="test-email"
                    type="email"
                    value={simulationData.testUser.email}
                    onChange={(e) => updateTestUser("email", e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="test-company">Company</Label>
                  <Input
                    id="test-company"
                    value={simulationData.testUser.company}
                    onChange={(e) => updateTestUser("company", e.target.value)}
                    placeholder="Test Company"
                  />
                </div>
                <div>
                  <Label htmlFor="test-signup">Signup Date</Label>
                  <Input
                    id="test-signup"
                    type="date"
                    value={simulationData.testUser.signup_date}
                    onChange={(e) => updateTestUser("signup_date", e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* User Behavior Tab */}
            <TabsContent value="behavior" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <Label className="font-medium">Email Opened</Label>
                    <p className="text-sm text-gray-600">User opened previous emails</p>
                  </div>
                  <Select
                    value={simulationData.userBehavior.email_opened.toString()}
                    onValueChange={(value) => updateUserBehavior("email_opened", value === "true")}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="true" className="hover:bg-gray-100">Yes</SelectItem>
                      <SelectItem value="false" className="hover:bg-gray-100">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <Label className="font-medium">Email Clicked</Label>
                    <p className="text-sm text-gray-600">User clicked links in emails</p>
                  </div>
                  <Select
                    value={simulationData.userBehavior.email_clicked.toString()}
                    onValueChange={(value) => updateUserBehavior("email_clicked", value === "true")}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="true" className="hover:bg-gray-100">Yes</SelectItem>
                      <SelectItem value="false" className="hover:bg-gray-100">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <Label className="font-medium">Purchase Made</Label>
                    <p className="text-sm text-gray-600">User made a purchase</p>
                  </div>
                  <Select
                    value={simulationData.userBehavior.purchase_made.toString()}
                    onValueChange={(value) => updateUserBehavior("purchase_made", value === "true")}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="true" className="hover:bg-gray-100">Yes</SelectItem>
                      <SelectItem value="false" className="hover:bg-gray-100">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <Label className="font-medium">Days Idle</Label>
                    <p className="text-sm text-gray-600">Days since last activity</p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max="365"
                    value={simulationData.userBehavior.idle_days}
                    onChange={(e) => updateUserBehavior("idle_days", parseInt(e.target.value) || 0)}
                    className="w-24"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <div>
                <Label>Simulation Speed</Label>
                <Select
                  value={simulationData.simulationSpeed}
                  onValueChange={(value) => setSimulationData(prev => ({...prev, simulationSpeed: value}))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    <SelectItem value="instant" className="hover:bg-gray-100">Instant (No delays)</SelectItem>
                    <SelectItem value="fast" className="hover:bg-gray-100">Fast (1 second = 1 minute)</SelectItem>
                    <SelectItem value="normal" className="hover:bg-gray-100">Normal (Real-time delays)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose how fast to run the simulation
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={runSimulation} 
              disabled={isSimulating}
              className="flex-1"
            >
              {isSimulating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Simulating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Simulation
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Simulation Results */}
      {simulationResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {simulationResults.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              Simulation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {simulationResults.success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Simulation Completed Successfully</p>
                    <p className="text-sm text-green-700">
                      {simulationResults.steps.length} steps executed in {simulationResults.duration}ms
                    </p>
                  </div>
                </div>

                {/* Step-by-step results */}
                <div className="space-y-3">
                  <h4 className="font-medium">Campaign Flow:</h4>
                  {simulationResults.steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Badge variant="outline" className="min-w-fit">
                        Step {index + 1}
                      </Badge>
                      
                      <div className="flex items-center gap-2">
                        {step.nodeType === "start" && <div className="w-3 h-3 bg-green-500 rounded-full" />}
                        {step.nodeType === "email" && <Mail className="w-4 h-4 text-blue-600" />}
                        {step.nodeType === "delay" && <Clock className="w-4 h-4 text-yellow-600" />}
                        {step.nodeType === "condition" && <div className="w-3 h-3 bg-purple-500 rounded-full" />}
                        {step.nodeType === "end" && <div className="w-3 h-3 bg-red-500 rounded-full" />}
                        
                        <span className="font-medium capitalize">{step.nodeType}</span>
                      </div>

                      {step.nodeType === "email" && (
                        <div className="flex-1">
                          <p className="text-sm font-medium">{step.nodeData?.subject || "Email"}</p>
                          <p className="text-xs text-gray-600">
                            To: {simulationData.testUser.email}
                          </p>
                        </div>
                      )}

                      {step.nodeType === "delay" && (
                        <div className="flex-1">
                          <p className="text-sm">Wait {step.nodeData?.duration || "unknown time"}</p>
                        </div>
                      )}

                      {step.nodeType === "condition" && (
                        <div className="flex-1">
                          <p className="text-sm">Check: {step.nodeData?.condition?.type || "condition"}</p>
                          <p className="text-xs text-gray-600">
                            Result: {step.conditionResult ? "True" : "False"}
                          </p>
                        </div>
                      )}

                      {index < simulationResults.steps.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Total Steps:</span>
                      <span className="ml-2 font-medium">{simulationResults.steps.length}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Emails Sent:</span>
                      <span className="ml-2 font-medium">
                        {simulationResults.steps.filter(s => s.nodeType === "email").length}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Conditions Checked:</span>
                      <span className="ml-2 font-medium">
                        {simulationResults.steps.filter(s => s.nodeType === "condition").length}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Total Duration:</span>
                      <span className="ml-2 font-medium">{simulationResults.totalDuration || "Instant"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Simulation failed: {simulationResults.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Campaign simulation logic
async function simulateCampaignFlow(schema, simulationData) {
  const startTime = Date.now()
  const steps = []
  
  if (!schema || !schema.nodes || schema.nodes.length === 0) {
    throw new Error("Invalid campaign schema")
  }

  // Find start node
  let currentNodeId = schema.nodes.find(node => node.type === "start")?.id
  if (!currentNodeId) {
    currentNodeId = schema.nodes[0]?.id
  }

  if (!currentNodeId) {
    throw new Error("No start node found")
  }

  let stepCount = 0
  const maxSteps = 50 // Prevent infinite loops

  while (currentNodeId && stepCount < maxSteps) {
    const currentNode = schema.nodes.find(n => n.id === currentNodeId)
    if (!currentNode) break

    const step = {
      nodeId: currentNodeId,
      nodeType: currentNode.type,
      nodeData: currentNode.data,
      timestamp: new Date(),
      processed: true
    }

    // Process different node types
    switch (currentNode.type) {
      case "start":
        step.description = "Campaign started"
        break

      case "email":
        step.description = `Email sent: ${currentNode.data?.subject || "Untitled"}`
        step.emailPreview = processEmailTemplate(currentNode.data, simulationData.testUser)
        break

      case "delay":
        const duration = currentNode.data?.duration
        if (typeof duration === "object") {
          step.description = `Wait ${duration.value} ${duration.unit}`
          step.delayMs = convertToMilliseconds(duration.value, duration.unit)
        } else {
          step.description = `Wait ${duration || "unknown time"}`
          step.delayMs = parseDurationString(duration)
        }
        break

      case "condition":
        const condition = currentNode.data?.condition
        const conditionResult = evaluateCondition(condition, simulationData.userBehavior)
        step.description = `Condition: ${condition?.type || "unknown"}`
        step.conditionResult = conditionResult
        break

      case "end":
        step.description = "Campaign completed"
        break

      default:
        step.description = `Unknown node type: ${currentNode.type}`
    }

    steps.push(step)

    // Find next node
    if (currentNode.type === "end") {
      break
    } else if (currentNode.type === "condition") {
      const conditionResult = step.conditionResult
      const edgeType = conditionResult ? "true" : "false"
      const nextEdge = schema.edges.find(e => e.source === currentNodeId && e.type === edgeType)
      currentNodeId = nextEdge?.target
    } else {
      const nextEdge = schema.edges.find(e => e.source === currentNodeId)
      currentNodeId = nextEdge?.target
    }

    stepCount++
  }

  const endTime = Date.now()
  const duration = endTime - startTime

  return {
    success: true,
    steps,
    duration,
    totalDuration: calculateTotalCampaignDuration(steps),
    simulationData
  }
}

// Helper functions
function processEmailTemplate(emailData, userData) {
  if (!emailData) return { subject: "", content: "" }

  let subject = emailData.subject || ""
  let content = emailData.content || ""

  // Replace template variables
  Object.keys(userData).forEach(key => {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    subject = subject.replace(placeholder, userData[key] || "")
    content = content.replace(placeholder, userData[key] || "")
  })

  return { subject, content }
}

function evaluateCondition(condition, userBehavior) {
  if (!condition) return false

  switch (condition.type) {
    case "email_opened":
      return userBehavior.email_opened
    case "email_clicked":
      return userBehavior.email_clicked
    case "purchase_made":
      return userBehavior.purchase_made
    case "idle_time":
      return userBehavior.idle_days >= (condition.days || 0)
    default:
      return false
  }
}

function convertToMilliseconds(value, unit) {
  switch (unit) {
    case "minutes": return value * 60 * 1000
    case "hours": return value * 60 * 60 * 1000
    case "days": return value * 24 * 60 * 60 * 1000
    case "weeks": return value * 7 * 24 * 60 * 60 * 1000
    default: return 0
  }
}

function parseDurationString(duration) {
  if (!duration) return 0
  const match = duration.match(/(\d+)\s*(minutes?|hours?|days?)/)
  if (!match) return 0
  
  const value = parseInt(match[1])
  const unit = match[2]
  return convertToMilliseconds(value, unit)
}

function calculateTotalCampaignDuration(steps) {
  const totalMs = steps.reduce((total, step) => {
    return total + (step.delayMs || 0)
  }, 0)

  if (totalMs < 60000) {
    return `${Math.round(totalMs / 1000)} seconds`
  } else if (totalMs < 3600000) {
    return `${Math.round(totalMs / 60000)} minutes`
  } else if (totalMs < 86400000) {
    return `${Math.round(totalMs / 3600000)} hours`
  } else {
    return `${Math.round(totalMs / 86400000)} days`
  }
}

export default CampaignSimulator