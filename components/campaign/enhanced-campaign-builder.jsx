"use client"

import { useState, useCallback, useRef } from "react"
import ReactFlow, { MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge } from "reactflow"
import "reactflow/dist/style.css"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Play, Users, Clock, Mail, TestTube } from "lucide-react"
import EmailListManager from "./email-list-manager"
import CampaignSimulator from "./campaign-simulator"
import TimingSelector from "./timing-selector"

const nodeTypes = {
  start: "Start",
  email: "Send Email",
  delay: "Wait/Delay",
  condition: "Condition",
  end: "End",
}

export default function EnhancedCampaignBuilder({ campaign, onSave }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false)
  const [campaignName, setCampaignName] = useState(campaign?.name || "")
  const [campaignDescription, setCampaignDescription] = useState(campaign?.description || "")
  const [selectedEmails, setSelectedEmails] = useState([])
  const [simulatorOpen, setSimulatorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const reactFlowWrapper = useRef(null)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges])

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
      const type = event.dataTransfer.getData("application/reactflow")

      if (typeof type === "undefined" || !type) return

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      const newNode = {
        id: `${Date.now()}`,
        type: type === "start" ? "input" : type === "end" ? "output" : "default",
        position,
        data: {
          label: nodeTypes[type],
          type: type,
          subject: "",
          content: "",
          duration: { value: 2, unit: "minutes" }, // Enhanced timing
          condition: {},
        },
        style: getNodeStyle(type),
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance, setNodes],
  )

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node)
    setNodeDialogOpen(true)
  }, [])

  const handleSaveCampaign = async () => {
    if (!campaignName.trim()) {
      setError("Campaign name is required")
      return
    }

    setSaving(true)
    setError("")

    try {
      const schema = {
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.data.type,
          position: node.position,
          data: {
            subject: node.data.subject || "",
            content: node.data.content || "",
            duration: node.data.duration || { value: 2, unit: "minutes" },
            condition: node.data.condition || {},
          },
        })),
        edges: edges,
      }

      const campaignData = {
        name: campaignName,
        description: campaignDescription,
        schema,
        selectedEmails,
        recipients: selectedEmails.length,
        createdAt: new Date().toISOString(),
      }

      if (onSave) {
        await onSave(campaignData)
      } else {
        console.log("Campaign saved:", campaignData)
        alert("Campaign saved successfully!")
      }
    } catch (error) {
      setError(error.message || "Failed to save campaign")
    } finally {
      setSaving(false)
    }
  }

  function getNodeStyle(type) {
    switch (type) {
      case "start": return { background: "#10b981", color: "white" }
      case "email": return { background: "#3b82f6", color: "white" }
      case "delay": return { background: "#f59e0b", color: "white" }
      case "condition": return { background: "#8b5cf6", color: "white" }
      case "end": return { background: "#ef4444", color: "white" }
      default: return { background: "#6b7280", color: "white" }
    }
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Enhanced Sidebar with better spacing */}
      <div className="w-96 bg-white shadow-lg border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Campaign Builder</h2>
          <p className="text-sm text-gray-600 mt-1">Create and configure your email campaign</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
        <Tabs defaultValue="campaign" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="campaign">Campaign</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="nodes">Nodes</TabsTrigger>
          </TabsList>

          {/* Campaign Settings Tab */}
          <TabsContent value="campaign">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Campaign Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g., Welcome Series"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={campaignDescription}
                    onChange={(e) => setCampaignDescription(e.target.value)}
                    placeholder="Describe your campaign goals..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveCampaign} disabled={saving} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setSimulatorOpen(true)}
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Simulate
                  </Button>
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {/* Campaign Stats */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Campaign Stats</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-blue-700">Recipients:</span>
                      <span className="ml-2 font-medium">{selectedEmails.length}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Nodes:</span>
                      <span className="ml-2 font-medium">{nodes.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audience Settings Tab */}
          <TabsContent value="audience">
            <EmailListManager 
              onEmailsSelected={setSelectedEmails}
              selectedEmails={selectedEmails}
            />
          </TabsContent>

          {/* Node Types Tab */}
          <TabsContent value="nodes">
            <Card>
              <CardHeader>
                <CardTitle>Drag & Drop Nodes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(nodeTypes).map(([type, label]) => (
                    <div
                      key={type}
                      className="p-3 bg-white border rounded cursor-move hover:bg-gray-50 hover:shadow-md transition-all duration-200"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("application/reactflow", type)
                        event.target.style.opacity = "0.5"
                      }}
                      onDragEnd={(event) => {
                        event.target.style.opacity = "1"
                      }}
                    >
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: getNodeStyle(type).background }}
                        />
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = "move"
          }}
          onNodeClick={onNodeClick}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </div>

      {/* Enhanced Node Editor Dialog */}
      <Dialog open={nodeDialogOpen} onOpenChange={setNodeDialogOpen}>
        <DialogContent className="max-w-3xl bg-white">
          <DialogHeader>
            <DialogTitle>Configure {selectedNode?.data?.type} Node</DialogTitle>
          </DialogHeader>
          {selectedNode && (
            <EnhancedNodeEditor
              node={selectedNode}
              onUpdate={(data) => {
                setNodes((nds) =>
                  nds.map((node) => {
                    if (node.id === selectedNode.id) {
                      return { ...node, data: { ...node.data, ...data } }
                    }
                    return node
                  })
                )
              }}
              onDelete={() => {
                setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id))
                setEdges((eds) => eds.filter((edge) => 
                  edge.source !== selectedNode.id && edge.target !== selectedNode.id
                ))
                setNodeDialogOpen(false)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Campaign Simulator Dialog */}
      <Dialog open={simulatorOpen} onOpenChange={setSimulatorOpen}>
        <DialogContent className="max-w-4xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Campaign Simulator</DialogTitle>
          </DialogHeader>
          <CampaignSimulator
            campaign={{
              name: campaignName,
              description: campaignDescription,
              schema: { nodes, edges }
            }}
            onSimulate={(results) => {
              console.log("Simulation results:", results)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Enhanced Node Editor with Precise Timing
function EnhancedNodeEditor({ node, onUpdate, onDelete }) {
  const [data, setData] = useState(node.data)

  const handleChange = (field, value) => {
    const newData = { ...data, [field]: value }
    setData(newData)
    onUpdate(newData)
  }

  if (node.data.type === "delay") {
    return (
      <div className="space-y-6">
        <TimingSelector
          value={data.duration || { value: 2, unit: "minutes" }}
          onChange={(newDuration) => handleChange("duration", newDuration)}
        />

        <div className="flex justify-between">
          <Button variant="destructive" onClick={onDelete}>
            Delete Node
          </Button>
          <Badge variant="outline">
            {data.duration?.value || 2} {data.duration?.unit || "minutes"}
          </Badge>
        </div>
      </div>
    )
  }

  if (node.data.type === "email") {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="subject">Email Subject</Label>
          <Input
            id="subject"
            value={data.subject || ""}
            onChange={(e) => handleChange("subject", e.target.value)}
            placeholder="Enter email subject"
          />
        </div>
        <div>
          <Label htmlFor="content">Email Content</Label>
          <Textarea
            id="content"
            value={data.content || ""}
            onChange={(e) => handleChange("content", e.target.value)}
            placeholder="Enter email content (HTML supported)"
            rows={8}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p className="font-medium mb-1">Template Variables:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{"{{name}}"} - User's name</li>
              <li>{"{{email}}"} - User's email</li>
              <li>{"{{company}}"} - User's company</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-1">Advanced Variables:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{"{{signup_date}}"} - Registration date</li>
              <li>{"{{last_login}}"} - Last activity</li>
              <li>{"{{plan_type}}"} - Subscription plan</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-between">
          <Button variant="destructive" onClick={onDelete}>
            Delete Node
          </Button>
        </div>
      </div>
    )
  }

  // Default for other node types
  return (
    <div className="space-y-4">
      <p>Configure this {node.data.type} node</p>
      <div className="flex justify-between">
        <Button variant="destructive" onClick={onDelete}>
          Delete Node
        </Button>
      </div>
    </div>
  )
}