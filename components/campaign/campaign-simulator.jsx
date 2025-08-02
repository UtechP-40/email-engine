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

// Speed settings in ms multipliers
const SIM_SPEEDS = {
  instant: 0,
  fast: 0.02,     // 1s is 1min simulated
  normal: 1       // realistic
}

export default function CampaignSimulator({ campaign, onSimulate }) {
  const [simulationData, setSimulationData] = useState({
    testUser: {
      name: "John Doe",
      email: "pradeep2420pradeep@gmail.com",
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
  const [error, setError] = useState("")

  // Simulate campaign flow
  const runSimulation = async () => {
    setError("")
    if (!campaign || !campaign.schema) {
      setError("Please create a campaign first!")
      return
    }
    setIsSimulating(true)
    setSimulationResults(null)
    try {
      const simulation = await simulateCampaignFlow(
        campaign.schema,
        simulationData,
        simulationData.simulationSpeed
      )
      setSimulationResults(simulation)
      if (onSimulate) onSimulate(simulation)
    } catch (error) {
      setSimulationResults({
        success: false,
        error: error.message,
        steps: []
      })
    } finally {
      setIsSimulating(false)
    }
  }

  // Controlled input logic
  const updateTestUser = (field, value) => {
    setSimulationData(prev => ({
      ...prev,
      testUser: { ...prev.testUser, [field]: value }
    }))
  }
  const updateUserBehavior = (field, value) => {
    setSimulationData(prev => ({
      ...prev,
      userBehavior: { ...prev.userBehavior, [field]: value }
    }))
  }

  // ---------------- UI START -------------------------
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <Card className="shadow-lg border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Play className="w-5 h-5" /> Campaign Simulator
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-1">
          <Tabs defaultValue="user" className="space-y-4" orientation="horizontal">
            <TabsList className="w-full grid grid-cols-3 rounded-lg bg-gray-50">
              <TabsTrigger value="user" className="rounded-l-lg"><User className="w-4 h-4 mr-1" />Test User</TabsTrigger>
              <TabsTrigger value="behavior"><span className="mr-1">🎯</span>Behavior</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-r-lg"><span className="mr-1">⚙️</span>Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="user" className="pt-4">
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <Label htmlFor="test-name">Name</Label>
                  <Input
                    id="test-name"
                    value={simulationData.testUser.name}
                    onChange={(e) => updateTestUser("name", e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div>
                  <Label htmlFor="test-email">Email</Label>
                  <Input
                    id="test-email"
                    type="email"
                    value={simulationData.testUser.email}
                    onChange={(e) => updateTestUser("email", e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label htmlFor="test-company">Company</Label>
                  <Input
                    id="test-company"
                    value={simulationData.testUser.company}
                    onChange={(e) => updateTestUser("company", e.target.value)}
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

            <TabsContent value="behavior" className="pt-4">
              <div className="space-y-4">
                {[
                  {
                    label: "Email Opened",
                    field: "email_opened",
                    desc: "User has opened emails.",
                  },
                  {
                    label: "Email Clicked",
                    field: "email_clicked",
                    desc: "User has clicked links in emails.",
                  },
                  {
                    label: "Purchase Made",
                    field: "purchase_made",
                    desc: "User has made a purchase.",
                  },
                ].map(({ label, field, desc }) => (
                  <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50" key={field}>
                    <div>
                      <Label className="font-medium">{label}</Label>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                    <Select
                      aria-label={label}
                      value={simulationData.userBehavior[field] ? "true" : "false"}
                      onValueChange={v => updateUserBehavior(field, v === "true")}
                    >
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                  <div>
                    <Label className="font-medium">Days Idle</Label>
                    <p className="text-xs text-gray-500">Days since last activity</p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max="365"
                    value={simulationData.userBehavior.idle_days}
                    onChange={(e) => updateUserBehavior("idle_days", Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="pt-4">
              <div>
                <Label>Simulation Speed</Label>
                <Select
                  value={simulationData.simulationSpeed}
                  onValueChange={(value) => setSimulationData(prev => ({ ...prev, simulationSpeed: value }))}
                  aria-label="Simulation speed"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant <span className="text-xs text-gray-500">(No delays)</span></SelectItem>
                    <SelectItem value="fast">Fast <span className="text-xs text-gray-500">(1 sec ≈ 1 min)</span></SelectItem>
                    <SelectItem value="normal">Normal <span className="text-xs text-gray-500">(Real time)</span></SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">How fast to run the campaign flow simulation.</p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={runSimulation}
              disabled={isSimulating}
              className="flex-1 text-white bg-blue-600 hover:bg-blue-700"
              aria-label="Run simulation"
            >
              {isSimulating ? (
                <span className="flex items-center">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Simulating...
                </span>
              ) : (
                <span className="flex items-center">
                  <Play className="w-4 h-4 mr-2" />
                  Run Simulation
                </span>
              )}
            </Button>
          </div>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {simulationResults && (
        <Card className="border rounded-xl shadow-lg">
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
              <div>
                <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">
                    Campaign executed: <span className="text-green-700">{simulationResults.steps.length} steps</span>
                  </span>
                  <Badge className="bg-blue-100 text-blue-700 ml-auto">
                    {simulationResults.totalDuration || "Instant"}
                  </Badge>
                </div>
                <ol className="relative border-l-2 border-blue-100 pl-5 space-y-1">
                  {simulationResults.steps.map((step, i) => (
                    <li key={i} className="flex items-center group mb-2">
                      <div className="absolute -left-2 top-2.5">
                        {getStepIcon(step.nodeType)}
                      </div>
                      <div className="flex-1 bg-white hover:bg-blue-50 transition rounded-lg px-3 py-2 border">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="min-w-fit">Step {i + 1}</Badge>
                          <span className="capitalize font-medium">{step.nodeType}</span>
                          {step.nodeType === "condition" && (
                            <Badge variant={step.conditionResult ? "success" : "destructive"} className="ml-2">
                              {step.conditionResult ? "Yes" : "No"}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-400 ml-3">{step.description}</span>
                        </div>
                        {step.nodeType === "email" && (
                          <div className="text-xs text-blue-900 ml-6 mt-1">To: {simulationData.testUser.email}</div>
                        )}
                        {step.nodeType === "delay" && (
                          <div className="text-xs ml-6 mt-1">
                            Duration: <strong>{formatStepDuration(step.delayMs, simulationResults.simulationSpeed)}</strong>
                          </div>
                        )}
                        {step.nodeType === "condition" && (
                          <div className="text-xs ml-6 mt-1">
                            Check: <span className="capitalize">{step.nodeData?.condition?.type || "unknown"}</span>
                          </div>
                        )}
                      </div>
                      {i < simulationResults.steps.length - 1 && (
                        <ArrowRight className="ml-2 w-4 h-4 text-blue-300" />
                      )}
                    </li>
                  ))}
                </ol>
                {/* Summary Stats */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-xs text-blue-900">
                    <span className="text-sm font-bold">{simulationResults.steps.length}</span><br />Steps
                  </div>
                  <div className="text-xs text-blue-900">
                    <span className="text-sm font-bold">{simulationResults.steps.filter(s => s.nodeType === "email").length}</span>
                    <br />Emails Sent
                  </div>
                  <div className="text-xs text-blue-900">
                    <span className="text-sm font-bold">{simulationResults.steps.filter(s => s.nodeType === "condition").length}</span>
                    <br />Conditions Checked
                  </div>
                  <div className="text-xs text-blue-900">
                    <span className="text-sm font-bold">{simulationResults.totalDuration || "Instant"}</span>
                    <br />Total Flow Time
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


// -------------------- LOGIC/HELPERS ------------------------

function getStepIcon(type) {
  switch (type) {
    case "start": return <span className="block w-4 h-4 bg-green-500 rounded-full" title="Start" />
    case "email": return <Mail className="w-4 h-4 text-blue-600" title="Email" />
    case "delay": return <Clock className="w-4 h-4 text-yellow-600" title="Delay" />
    case "condition": return <span className="block w-4 h-4 bg-purple-500 rounded-full" title="Condition" />
    case "end": return <span className="block w-4 h-4 bg-red-500 rounded-full" title="End" />
    default: return <span className="block w-4 h-4 bg-gray-400 rounded-full" />
  }
}

function formatStepDuration(ms, speed = "normal") {
  if (ms == null) return "-"
  const simMultiplier = SIM_SPEEDS[speed] ?? 1
  const simMs = Math.round(ms * simMultiplier)
  if (simMs < 2000) return `${simMs}ms`
  if (simMs < 60000) return `${Math.round(simMs / 1000)}s`
  if (simMs < 3600000) return `${Math.round(simMs / 60000)}min`
  if (simMs < 86400000) return `${Math.round(simMs / 3600000)}h`
  return `${Math.round(simMs / 86400000)}d`
}

// Main simulation engine. Accepts simulationSpeed ("instant", "fast", "normal")
async function simulateCampaignFlow(schema, simulationData, simulationSpeed = "normal") {
  const startTime = Date.now()
  const steps = []
  const simMultiplier = SIM_SPEEDS[simulationSpeed] ?? 1

  if (!schema?.nodes?.length) throw new Error("Invalid campaign schema")
  // Find start node
  let currentNodeId = schema.nodes.find(n => n.type === "start")?.id || schema.nodes[0].id
  if (!currentNodeId) throw new Error("No start node in campaign")

  const maxSteps = 100 // (Fail-safe for infinite loop)

  for (let stepCount = 0; currentNodeId && stepCount < maxSteps; stepCount++) {
    const currentNode = schema.nodes.find(n => n.id === currentNodeId)
    if (!currentNode) break

    const step = {
      nodeId: currentNodeId,
      nodeType: currentNode.type,
      nodeData: currentNode.data,
      description: "",
      processed: true
    }

    // -- Step Logic --
    switch (currentNode.type) {
      case "start":
        step.description = "Campaign started"
        break
      case "email":
        step.description = `Email sent: ${currentNode.data?.subject || "Untitled"}`
        step.emailPreview = processEmailTemplate(currentNode.data, simulationData.testUser)
        break
      case "delay": {
        let ms = 0
        if (typeof currentNode.data?.duration === "object" && currentNode.data.duration) {
          ms = convertToMilliseconds(currentNode.data.duration.value, currentNode.data.duration.unit)
        } else {
          ms = parseDurationString(currentNode.data?.duration)
        }
        step.description = `Wait ${currentNode.data?.duration || "unknown"}`
        step.delayMs = ms
        // Optionally simulate delay with await
        if (simMultiplier > 0) await sleep(ms * simMultiplier)
        break
      }
      case "condition": {
        const c = currentNode.data?.condition
        const condResult = evaluateCondition(c, simulationData.userBehavior)
        step.description = `Condition: ${c?.type || "unknown"}`
        step.conditionResult = condResult
        break
      }
      case "end":
        step.description = "Campaign completed"
        break
      default:
        step.description = `Unknown node type: ${currentNode.type}`
    }
    steps.push(step)

    // Determine next node
    if (currentNode.type === "end") break
    if (currentNode.type === "condition") {
      const condResult = step.conditionResult
      const edgeType = condResult ? "true" : "false"
      // Edge type-based routing
      const nextEdge = schema.edges.find(e => e.source === currentNodeId && e.type === edgeType)
        || schema.edges.find(e => e.source === currentNodeId) // fallback: any
      currentNodeId = nextEdge?.target
    } else {
      const nextEdge = schema.edges.find(e => e.source === currentNodeId)
      currentNodeId = nextEdge?.target
    }
  }

  // Use wall clock for run time, but steps' .delayMs for campaign duration!
  const endTime = Date.now()
  return {
    success: true,
    steps,
    duration: endTime - startTime,
    simulationSpeed,
    totalDuration: calculateTotalCampaignDuration(steps, simulationSpeed),
    simulationData
  }
}


// ------ Helper/utility logic as before ------
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
function processEmailTemplate(emailData, userData) {
  if (!emailData) return {}
  let subject = emailData.subject || ""
  let content = emailData.content || ""
  Object.keys(userData).forEach(key => {
    subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), userData[key] || "")
    content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), userData[key] || "")
  })
  return { subject, content }
}

function evaluateCondition(condition, userBehavior) {
  if (!condition) return false
  switch (condition.type) {
    case "email_opened": return userBehavior.email_opened
    case "email_clicked": return userBehavior.email_clicked
    case "purchase_made": return userBehavior.purchase_made
    case "idle_time": return (userBehavior.idle_days || 0) >= (condition.days || 0)
    default: return false
  }
}

function convertToMilliseconds(value, unit) {
  value = Number(value || 0)
  switch (unit) {
    case "minutes": case "minute": return value * 60 * 1000
    case "hours": case "hour": return value * 60 * 60 * 1000
    case "days": case "day": return value * 24 * 60 * 60 * 1000
    case "weeks": case "week": return value * 7 * 24 * 60 * 60 * 1000
    default: return 0
  }
}
function parseDurationString(duration) {
  if (!duration) return 0
  const match = duration.trim().match(/(\d+)\s*(minute|hour|day|week|minutes|hours|days|weeks)/i)
  if (!match) return 0
  return convertToMilliseconds(match[1], match[2])
}
function calculateTotalCampaignDuration(steps, simulationSpeed = "normal") {
  const simMultiplier = SIM_SPEEDS[simulationSpeed] ?? 1
  const total = steps.reduce((sum, step) => sum + (step.delayMs || 0), 0) * simMultiplier
  if (total < 2000) return `${total}ms`
  if (total < 60000) return `${Math.round(total / 1000)}s`
  if (total < 3600000) return `${Math.round(total / 60000)}min`
  if (total < 86400000) return `${Math.round(total / 3600000)}h`
  return `${Math.round(total / 86400000)}d`
}
