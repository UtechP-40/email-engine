"use client";

import { useState, useCallback, useRef } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Alert,
  AlertDescription,
  Skeleton,
} from "@/components/ui"; // ← Import your UI atoms accordingly
import { Save, Play } from "lucide-react";

const nodeTypes = {
  start: "Start",
  email: "Send Email",
  delay: "Wait/Delay",
  condition: "Condition",
  end: "End",
};

const initialNodes = [
  {
    id: "1",
    type: "input",
    data: { label: "Start", type: "start" },
    position: { x: 250, y: 25 },
    style: { background: "#10b981", color: "white" },
  },
];
const initialEdges = [];

// ICON helper for dialog headers
function getNodeIcon(type) {
  switch (type) {
    case "start":
      return <span>🟢</span>;
    case "email":
      return <span>📧</span>;
    case "delay":
      return <span>⏳</span>;
    case "condition":
      return <span>❓</span>;
    case "end":
      return <span>🔴</span>;
    default:
      return <span>🔲</span>;
  }
}
function getNodeDialogSubtitle(type) {
  switch (type) {
    case "start":
      return "Entry point of the campaign";
    case "email":
      return "Configure the email content and subject";
    case "delay":
      return "Wait for a specified duration before next step";
    case "condition":
      return "Split flow based on user activity";
    case "end":
      return "Marks the end of the sequence";
    default:
      return "";
  }
}
function getNodeLabel(node) {
  switch (node.type) {
    case "start":
      return "Start";
    case "email":
      return node.data.subject || "Send Email";
    case "delay":
      return `Wait ${node.data.duration || "1 hour"}`;
    case "condition":
      return "Condition Check";
    case "end":
      return "End";
    default:
      return "Unknown";
  }
}
function getNodeStyle(type) {
  switch (type) {
    case "start":
      return { background: "#10b981", color: "white" };
    case "email":
      return { background: "#3b82f6", color: "white" };
    case "delay":
      return { background: "#f59e0b", color: "white" };
    case "condition":
      return { background: "#8b5cf6", color: "white" };
    case "end":
      return { background: "#ef4444", color: "white" };
    default:
      return { background: "#6b7280", color: "white" };
  }
}

export default function CampaignBuilder({ campaign, onSave }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    campaign?.schema?.nodes?.map((node) => ({
      id: node.id,
      type: node.type === "start" ? "input" : node.type === "end" ? "output" : "default",
      data: { label: getNodeLabel(node), ...node.data, type: node.type },
      position: node.position || { x: Math.random() * 400, y: Math.random() * 400 },
      style: getNodeStyle(node.type),
    })) || initialNodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    campaign?.schema?.edges || initialEdges
  );
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false);
  const [campaignName, setCampaignName] = useState(campaign?.name || "");
  const [campaignDescription, setCampaignDescription] = useState(
    campaign?.description || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
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
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setNodeDialogOpen(true);
  }, []);

  const updateNodeData = (nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
  };

  const deleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setNodeDialogOpen(false);
  };

  const saveCampaign = async () => {
    if (!campaignName.trim()) {
      setError("Campaign name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const schema = {
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.data.type, // This should be the actual campaign node type (start, email, delay, condition, end)
          position: node.position,
          data: {
            subject: node.data.subject || "",
            content: node.data.content || "",
            duration: node.data.duration || "",
            condition: node.data.condition || {},
          },
        })),
        edges: edges,
      };
      const campaignData = {
        name: campaignName,
        description: campaignDescription,
        schema,
      };
      await onSave(campaignData);
    } catch (error) {
      setError(error.message || "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  // Enhanced drag
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
    event.target.style.opacity = "0.5";
    event.target.style.transform = "scale(0.95)";
  };
  const onDragEnd = (event) => {
    event.target.style.opacity = "1";
    event.target.style.transform = "scale(1)";
  };

  return (
    <div className="h-screen flex font-sans antialiased">
      {/* SIDEBAR */}
      <div className="w-80 h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 p-4 border-r sticky top-0 overflow-y-auto">
        <div className="space-y-6">
          {/* Campaign Settings */}
          <Card className="shadow-md rounded-xl transition-all duration-200 hover:shadow-xl">
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
                  className="focus:ring focus:ring-blue-200 focus:ring-offset-2"
                  aria-label="Campaign Name"
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
                  className="focus:ring focus:ring-blue-200 focus:ring-offset-2"
                  aria-label="Campaign Description"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveCampaign}
                  className="flex-1 transition-all duration-150 focus:ring focus:ring-blue-200 focus:ring-offset-2 text-white bg-blue-600 hover:bg-blue-700"
                  disabled={saving}
                  aria-label="Save campaign"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? (
                    <span className="animate-pulse">Saving...</span>
                  ) : (
                    "Save"
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 bg-white border hover:bg-blue-50 text-blue-700 focus:ring focus:ring-blue-100"
                  aria-label="Test campaign"
                >
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
          {/* NODE TYPES */}
          <Card className="shadow-md rounded-xl transition-all duration-200 hover:shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Node Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(nodeTypes).map(([type, label]) => (
                  <div
                    key={type}
                    className={`
                      p-3 bg-white border rounded-xl cursor-move select-none
                      shadow-sm transition-all duration-200
                      hover:bg-blue-50 hover:shadow-lg active:scale-95
                      flex items-center gap-2
                    `}
                    draggable
                    onDragStart={(event) => onDragStart(event, type)}
                    onDragEnd={onDragEnd}
                    tabIndex={0}
                    aria-label={label}
                  >
                    <span
                      className="block w-3 h-3 rounded-full"
                      style={{ backgroundColor: getNodeStyle(type).background }}
                    />
                    <span className="font-medium text-gray-700">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* CANVAS */}
      <div
        className="flex-1 relative bg-gradient-to-br from-gray-100 via-white to-gray-50 transition-colors duration-300"
        ref={reactFlowWrapper}
      >
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
          defaultEdgeOptions={{ animated: true, style: { stroke: "#666666" } }}
          fitView
        >
          <Controls
            showZoom={true}
            showFitView={true}
            style={{
              background: "rgba(255,255,255,.93)",
              borderRadius: 8,
              boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)",
            }}
          />
          <MiniMap
            nodeStrokeColor={(n) => n.style?.background || "#aaa"}
            nodeColor={(n) => n.style?.background || "#fff"}
            nodeBorderRadius={5}
          />
          <Background variant="lines" gap={16} color="#e5e7eb" />
        </ReactFlow>
      </div>
      {/* NODE EDITOR DIALOG */}
      <Dialog open={nodeDialogOpen} onOpenChange={setNodeDialogOpen}>
        <DialogContent className="rounded-xl shadow-lg max-w-2xl border border-gray-100 bg-white px-6 py-4">
          <DialogHeader className="flex items-start gap-3 mb-4">
            <span
              className="inline-flex items-center justify-center rounded-full text-xl"
              style={{
                width: 44,
                height: 44,
                background: getNodeStyle(selectedNode?.data?.type)?.background,
                color: "white",
                minWidth: 44,
              }}
            >
              {getNodeIcon(selectedNode?.data?.type)}
            </span>
            <div>
              <DialogTitle>
                Edit{" "}
                <span className="capitalize">
                  {selectedNode?.data?.type}
                </span>{" "}
                Node
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                {getNodeDialogSubtitle(selectedNode?.data?.type)}
              </p>
            </div>
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
  );
}

// --- NodeEditor component ---

function NodeEditor({ node, onUpdate, onDelete }) {
  const [data, setData] = useState(node.data);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleChange = (field, value) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onUpdate(newData);
  };

  // Email Node
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
            className="focus:ring focus:ring-blue-200 focus:ring-offset-2"
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
            className="focus:ring focus:ring-blue-200 focus:ring-offset-2"
          />
        </div>
        <div className="text-sm text-gray-600">
          <p>
            You can use template variables like:
            <ul className="list-disc list-inside mt-1 ml-4">
              <li>
                <code>&#123;&#123;name&#125;&#125;</code> - User's name
              </li>
              <li>
                <code>&#123;&#123;email&#125;&#125;</code> - User's email
              </li>
              <li>
                <code>&#123;&#123;company&#125;&#125;</code> - User's company
              </li>
            </ul>
          </p>
        </div>
        <div className="flex justify-between">
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete Node"
          >
            Delete Node
          </Button>
        </div>
        {confirmDelete && (
          <div className="mt-2 text-sm bg-red-50 text-red-600 p-2 rounded">
            Are you sure? This will remove the node and its connections.
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={onDelete}
                aria-label="Confirm delete node"
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Delay Node
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
            className="focus:ring focus:ring-blue-200 focus:ring-offset-2"
          />
        </div>
        <div className="text-sm text-gray-600">
          Examples: <span className="italic">1 hour, 2 days, 30 minutes</span>
        </div>
        <div className="flex justify-between">
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
          >
            Delete Node
          </Button>
        </div>
        {confirmDelete && (
          <div className="mt-2 text-sm bg-red-50 text-red-600 p-2 rounded">
            Are you sure? This will remove the node and its connections.
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="destructive" onClick={onDelete}>
                Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Condition Node
  if (node.data.type === "condition") {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="conditionType">Condition Type</Label>
          <Select
            value={data.condition?.type || ""}
            onValueChange={(value) =>
              handleChange("condition", { ...data.condition, type: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select condition type" className="cursor-pointer" />
            </SelectTrigger>
            <SelectContent className="bg-white cursor-pointer">
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
              className="focus:ring focus:ring-blue-200 focus:ring-offset-2"
            />
          </div>
        )}
        <div className="flex justify-between">
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
          >
            Delete Node
          </Button>
        </div>
        {confirmDelete && (
          <div className="mt-2 text-sm bg-red-50 text-red-600 p-2 rounded">
            Are you sure? This will remove the node and its connections.
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="destructive" onClick={onDelete}>
                Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default: Start/End node
  return (
    <div className="space-y-4">
      <p>This node type doesn't have configurable options.</p>
      <div className="flex justify-between">
        <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
          Delete Node
        </Button>
      </div>
      {confirmDelete && (
        <div className="mt-2 text-sm bg-red-50 text-red-600 p-2 rounded">
          Are you sure? This will remove the node and its connections.
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="destructive" onClick={onDelete}>
              Confirm
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
