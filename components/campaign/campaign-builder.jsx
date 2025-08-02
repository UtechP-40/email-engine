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
import { Save, Play } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

const nodeTypes = {
  start: "Start",
  email: "Send Email",
  delay: "Wait/Delay",
  condition: "Condition",
  end: "End",
}

const initialNodes = [
  {
    id: "1",
    type: "input",
    data: { label: "Start", type: "start" },
    position: { x: 250, y: 25 },
    style: { background: "#10b981", color: "white" },
  },
]

const initialEdges = []

// Add this loading state component
function CampaignBuilderSkeleton() {
  return (
    <div className="h-screen flex">
      <div className="w-80 bg-gray-50 p-4 border-r">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
      <div className="flex-1 p-4">
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  )
}

export default function CampaignBuilder({ campaign, onSave }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    campaign?.schema?.nodes?.map((node) => ({
      id: node.id,
      type: node.type === "start" ? "input" : node.type === "end" ? "output" : "default",
      data: { label: getNodeLabel(node), ...node.data, type: node.type },
      position: node.position || { x: Math.random() * 400, y: Math.random() * 400 },
      style: getNodeStyle(node.type),
    })) || initialNodes,
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(campaign?.schema?.edges || initialEdges)
  const [selectedNode, setSelectedNode] = useState(null)
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false)
  const [campaignName, setCampaignName] = useState(campaign?.name || "")
  const [campaignDescription, setCampaignDescription] = useState(campaign?.description || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const reactFlowWrapper = useRef(null)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges])

  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
      const type = event.dataTransfer.getData("application/reactflow")

      if (typeof type === "undefined" || !type) {
        return
      }

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
          duration: "",
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

  const updateNodeData = (nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...newData },
          }
        }
        return node
      }),
    )
  }

  const deleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId))
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
    setNodeDialogOpen(false)
  }

  const saveCampaign = async () => {
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
            duration: node.data.duration || "",
            condition: node.data.condition || {},
          },
        })),
        edges: edges,
      }

      const campaignData = {
        name: campaignName,
        description: campaignDescription,
        schema,
      }

      await onSave(campaignData)
    } catch (error) {
      setError(error.message || "Failed to save campaign")
    } finally {
      setSaving(false)
    }
  }

  function getNodeLabel(node) {
    switch (node.type) {
      case "start":
        return "Start"
      case "email":
        return node.data.subject || "Send Email"
      case "delay":
        return `Wait ${node.data.duration || "1 hour"}`
      case "condition":
        return "Condition Check"
      case "end":
        return "End"
      default:
        return "Unknown"
    }
  }

  function getNodeStyle(type) {
    switch (type) {
      case "start":
        return { background: "#10b981", color: "white" }
      case "email":
        return { background: "#3b82f6", color: "white" }
      case "delay":
        return { background: "#f59e0b", color: "white" }
      case "condition":
        return { background: "#8b5cf6", color: "white" }
      case "end":
        return { background: "#ef4444", color: "white" }
      default:
        return { background: "#6b7280", color: "white" }
    }
  }

  // Enhanced drag styling
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType)
    event.dataTransfer.effectAllowed = "move"

    // Add visual feedback
    event.target.style.opacity = "0.5"
    event.target.style.transform = "scale(0.95)"
  }

  const onDragEnd = (event) => {
    event.target.style.opacity = "1"
    event.target.style.transform = "scale(1)"
  }

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-80 bg-gray-50 p-4 border-r">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campaign Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={campaignDescription}
                  onChange={(e) => setCampaignDescription(e.target.value)}
                  placeholder="Campaign description"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveCampaign} disabled={saving} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" className="flex-1 bg-transparent">
                  <Play className="w-4 h-4 mr-2" />
                  Test
                </Button>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Node Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(nodeTypes).map(([type, label]) => (
                  <div
                    key={type}
                    className="p-3 bg-white border rounded cursor-move hover:bg-gray-50 hover:shadow-md transition-all duration-200 hover:scale-105"
                    draggable
                    onDragStart={(event) => onDragStart(event, type)}
                    onDragEnd={onDragEnd}
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
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </div>

      {/* Node Edit Dialog */}
      <Dialog open={nodeDialogOpen} className='bg-[#ffffff]' onOpenChange={setNodeDialogOpen}>
        <DialogContent className="max-w-2xl bg-[#ffffff]">
          <DialogHeader>
            <DialogTitle>Edit {selectedNode?.data?.type} Node</DialogTitle>
          </DialogHeader>
          {selectedNode && (
            <NodeEditor
              node={selectedNode}
              onUpdate={(data) => updateNodeData(selectedNode.id, data)}
              onDelete={() => deleteNode(selectedNode.id)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NodeEditor({ node, onUpdate, onDelete }) {
  const [data, setData] = useState(node.data)

  const handleChange = (field, value) => {
    const newData = { ...data, [field]: value }
    setData(newData)
    onUpdate(newData)
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
        <div className="text-sm text-gray-600">
          <p>You can use template variables like:</p>
          <ul className="list-disc list-inside mt-1">
            <li>{"{{name}}"} - User's name</li>
            <li>{"{{email}}"} - User's email</li>
            <li>{"{{company}}"} - User's company</li>
          </ul>
        </div>
        <div className="flex justify-between">
          <Button variant="destructive" onClick={onDelete}>
            Delete Node
          </Button>
        </div>
      </div>
    )
  }

  if (node.data.type === "delay") {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="duration">Delay Duration</Label>
          <Input
            id="duration"
            value={data.duration || ""}
            onChange={(e) => handleChange("duration", e.target.value)}
            placeholder="e.g., 1 hour, 2 days, 30 minutes"
          />
        </div>
        <div className="text-sm text-gray-600">
          <p>Examples: "1 hour", "2 days", "30 minutes"</p>
        </div>
        <div className="flex justify-between">
          <Button variant="destructive" onClick={onDelete}>
            Delete Node
          </Button>
        </div>
      </div>
    )
  }

  if (node.data.type === "condition") {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="conditionType">Condition Type</Label>
          <Select
            value={data.condition?.type || ""}
            onValueChange={(value) => handleChange("condition", { ...data.condition, type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select condition type" className='cursor-pointer'/>
            </SelectTrigger>
            <SelectContent className='bg-white cursor-pointer'>
              <SelectItem value="email_opened">Email Opened</SelectItem>
              <SelectItem value="email_clicked">Email Clicked</SelectItem>
              <SelectItem value="purchase_made">Purchase Made</SelectItem>
              <SelectItem value="idle_time">Idle Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {data.condition?.type === "idle_time" && (
          <div>
            <Label htmlFor="days">Days of Inactivity</Label>
            <Input
              id="days"
              type="number"
              value={data.condition?.days || ""}
              onChange={(e) =>
                handleChange("condition", {
                  ...data.condition,
                  days: Number.parseInt(e.target.value),
                })
              }
              placeholder="Number of days"
            />
          </div>
        )}
        <div className="flex justify-between">
          <Button variant="destructive" onClick={onDelete}>
            Delete Node
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p>This node type doesn't have configurable options.</p>
      <div className="flex justify-between">
        <Button variant="destructive" onClick={onDelete}>
          Delete Node
        </Button>
      </div>
    </div>
  )
}
