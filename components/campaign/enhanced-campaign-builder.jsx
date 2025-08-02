"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save,
  Play,
  Users,
  Clock,
  Mail,
  TestTube,
  Trash2,
  AlertCircle,
} from "lucide-react";

import EmailListManager from "./email-list-manager";
import CampaignSimulator from "./campaign-simulator";
import TimingSelector from "./timing-selector";

const nodeTypes = {
  start: "Start",
  email: "Send Email",
  delay: "Wait/Delay",
  condition: "Condition",
  end: "End",
};

export default function EnhancedCampaignBuilder({ campaign, onSave }) {
  // Initialize nodes/edges from campaign schema if available
  const [nodes, setNodes, onNodesChange] = useNodesState(
    campaign?.schema?.nodes?.map((node) => ({
      id: node.id,
      type:
        node.type === "start"
          ? "input"
          : node.type === "end"
          ? "output"
          : "default",
      position: node.position || { x: Math.random() * 400, y: Math.random() * 400 },
      data: { ...node.data, type: node.type, label: nodeTypes[node.type] || "Unknown" },
      style: getNodeStyle(node.type),
    })) || []
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState(
    campaign?.schema?.edges || []
  );
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false);
  const [campaignName, setCampaignName] = useState(campaign?.name || "");
  const [campaignDescription, setCampaignDescription] = useState(
    campaign?.description || ""
  );
  const [selectedEmails, setSelectedEmails] = useState(
    campaign?.selectedEmails || []
  );
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Use effect to initialize nodes/edges if campaign changes externally
  useEffect(() => {
    if (campaign?.schema?.nodes) {
      setNodes(
        campaign.schema.nodes.map((node) => ({
          id: node.id,
          type:
            node.type === "start"
              ? "input"
              : node.type === "end"
              ? "output"
              : "default",
          position: node.position || {
            x: Math.random() * 400,
            y: Math.random() * 400,
          },
          data: { ...node.data, type: node.type, label: nodeTypes[node.type] || "Unknown" },
          style: getNodeStyle(node.type),
        }))
      );
    }
    if (campaign?.schema?.edges) {
      setEdges(campaign.schema.edges);
    }
    if (campaign?.selectedEmails) {
      setSelectedEmails(campaign.selectedEmails);
    }
    if (campaign?.name) {
      setCampaignName(campaign.name);
    }
    if (campaign?.description) {
      setCampaignDescription(campaign.description);
    }
  }, [campaign, setNodes, setEdges]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle drop of draggable nodes from sidebar
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      if (!reactFlowWrapper.current || !reactFlowInstance) return;
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !nodeTypes[type]) return;

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
          duration: { value: 2, unit: "minutes" },
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

  const handleSaveCampaign = async () => {
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
            duration: node.data.duration || { value: 2, unit: "minutes" },
            condition: node.data.condition || {},
          },
        })),
        edges: edges,
      };

      const campaignData = {
        name: campaignName,
        description: campaignDescription,
        schema,
        selectedEmails,
        recipients: selectedEmails.length,
        createdAt: new Date().toISOString(),
      };

      if (onSave) {
        await onSave(campaignData);
      } else {
        console.log("Campaign saved:", campaignData);
        alert("Campaign saved successfully!");
      }
    } catch (e) {
      setError(e.message || "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  // Node style helper
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

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar with sticky header and scrollable content */}
      <div className="w-96 bg-white shadow-lg border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-20">
          <h2 className="text-xl font-semibold text-gray-900">Campaign Builder</h2>
          <p className="text-sm text-gray-600 mt-1">Create and configure your email campaign</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <Tabs defaultValue="campaign" className="space-y-5">
            <TabsList className="grid w-full grid-cols-3 border-b border-gray-200">
              <TabsTrigger className="py-2" value="campaign">
                Campaign
              </TabsTrigger>
              <TabsTrigger className="py-2" value="audience">
                Audience
              </TabsTrigger>
              <TabsTrigger className="py-2" value="nodes">
                Nodes
              </TabsTrigger>
            </TabsList>

            {/* Campaign Settings Tab */}
            <TabsContent value="campaign" className="pt-4 space-y-6">
              <Card className="shadow-sm border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Mail className="w-5 h-5 text-blue-600" />
                    Campaign Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <Label htmlFor="name">Campaign Name</Label>
                    <Input
                      id="name"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="e.g., Welcome Series"
                      autoComplete="off"
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
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveCampaign}
                      disabled={saving}
                      className="flex-1"
                      aria-label="Save Campaign"
                    >
                      <Save className="w-5 h-5 mr-2" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSimulatorOpen(true)}
                      aria-label="Open simulator"
                    >
                      <TestTube className="w-5 h-5 mr-2" />
                      Simulate
                    </Button>
                  </div>
                  {error && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Campaign Stats */}
                  <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-3">Campaign Stats</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm text-blue-800 font-medium">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        <span>Recipients:</span>
                        <span className="ml-auto">{selectedEmails.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        <span>Nodes:</span>
                        <span className="ml-auto">{nodes.length}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Audience Tab */}
            <TabsContent value="audience" className="pt-4">
              <EmailListManager
                selectedEmails={selectedEmails}
                onEmailsSelected={(emails) => setSelectedEmails(emails)}
              />
            </TabsContent>

            {/* Nodes Tab */}
            <TabsContent value="nodes" className="pt-4">
              <Card className="shadow-sm border">
                <CardHeader>
                  <CardTitle className="text-lg">Drag & Drop Nodes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(nodeTypes).map(([type, label]) => (
                      <div
                        key={type}
                        className="p-3 bg-white border rounded-md shadow-sm cursor-move hover:bg-gray-50 hover:shadow-md transition duration-150 flex items-center gap-3 select-none"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("application/reactflow", type);
                          event.currentTarget.style.opacity = "0.5";
                        }}
                        onDragEnd={(event) => {
                          event.currentTarget.style.opacity = "1";
                        }}
                        tabIndex={0}
                        role="button"
                        aria-grabbed="false"
                        aria-label={`Drag node type ${label}`}
                      >
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getNodeStyle(type).background }}
                          aria-hidden="true"
                        />
                        <span className="font-medium">{label}</span>
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
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onNodeClick={onNodeClick}
          fitView
          style={{ background: "#f9fafb" }}
          defaultEdgeOptions={{ animated: true, style: { stroke: "#9ca3af" } }}
        >
          <Controls
            showZoom={true}
            showFitView={true}
            style={{
              background: "rgba(255,255,255,0.95)",
              borderRadius: 6,
              padding: 6,
              boxShadow: "0 1px 6px rgba(0,0,0,0.1)",
            }}
          />
          <MiniMap
            nodeColor={(n) => n.style?.background || "#bbb"}
            nodeStrokeColor={(n) => n.style?.color || "#fff"}
            nodeBorderRadius={4}
          />
          <Background variant="dots" gap={15} size={1} color="#ddd" />
        </ReactFlow>
      </div>

      {/* Node Editor Dialog with confirmation for delete */}
      <Dialog open={nodeDialogOpen} onOpenChange={setNodeDialogOpen}>
        <DialogContent className="max-w-3xl bg-white rounded-lg shadow-lg overflow-auto max-h-[90vh]">
          <DialogHeader className="flex justify-between items-center pr-4">
            <DialogTitle>Configure {selectedNode?.data?.type} Node</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Close node editor"
              onClick={() => setNodeDialogOpen(false)}
            >
              ✕
            </Button>
          </DialogHeader>
          {selectedNode && (
            <EnhancedNodeEditor
              node={selectedNode}
              onUpdate={(data) => {
                setNodes((nds) =>
                  nds.map((node) =>
                    node.id === selectedNode.id
                      ? { ...node, data: { ...node.data, ...data } }
                      : node
                  )
                );
              }}
              onDelete={() => {
                if (
                  window.confirm(
                    "Are you sure you want to delete this node? This action cannot be undone."
                  )
                ) {
                  setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                  setEdges((eds) =>
                    eds.filter(
                      (edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id
                    )
                  );
                  setNodeDialogOpen(false);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Campaign Simulator Dialog */}
      <Dialog open={simulatorOpen} onOpenChange={setSimulatorOpen}>
        <DialogContent className="max-w-4xl bg-white max-h-[90vh] overflow-y-auto rounded-lg shadow-lg p-4">
          <DialogHeader>
            <DialogTitle>Campaign Simulator</DialogTitle>
          </DialogHeader>
          <CampaignSimulator
            campaign={{
              name: campaignName,
              description: campaignDescription,
              schema: {
                nodes: nodes.map((node) => ({
                  id: node.id,
                  type: node.data.type, // Use the actual campaign node type
                  position: node.position,
                  data: {
                    subject: node.data.subject || "",
                    content: node.data.content || "",
                    duration: node.data.duration || { value: 2, unit: "minutes" },
                    condition: node.data.condition || {},
                  },
                })),
                edges: edges,
              },
            }}
            onSimulate={(results) => {
              // You can add custom behaviors here for simulation results
              console.log("Simulation results:", results);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Node Editor with precise timing and safe updates
function EnhancedNodeEditor({ node, onUpdate, onDelete }) {
  const [data, setData] = useState(node.data);

  // Sync state if node changes externally while editing
  useEffect(() => {
    setData(node.data);
  }, [node.data]);

  const handleChange = (field, value) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onUpdate(newData);
  };

  if (node.data.type === "delay") {
    return (
      <div className="space-y-6">
        <TimingSelector
          value={data.duration || { value: 2, unit: "minutes" }}
          onChange={(newDuration) => handleChange("duration", newDuration)}
        />

        <div className="flex justify-between items-center">
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete Node
          </Button>
          <Badge variant="outline" className="text-sm font-medium">
            {data.duration?.value || 2} {data.duration?.unit || "minutes"}
          </Badge>
        </div>
      </div>
    );
  }

  if (node.data.type === "email") {
    return (
      <div className="space-y-6">
        <div>
          <Label htmlFor="subject">Email Subject</Label>
          <Input
            id="subject"
            value={data.subject || ""}
            onChange={(e) => handleChange("subject", e.target.value)}
            placeholder="Enter email subject"
            autoComplete="off"
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
            spellCheck={false}
          />
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm text-gray-700">
          <section>
            <p className="font-semibold mb-1">Template Variables:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <code>{"{{name}}"}</code> - User's name
              </li>
              <li>
                <code>{"{{email}}"}</code> - User's email
              </li>
              <li>
                <code>{"{{company}}"}</code> - User's company
              </li>
            </ul>
          </section>
          <section>
            <p className="font-semibold mb-1">Advanced Variables:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <code>{"{{signup_date}}"}</code> - Registration date
              </li>
              <li>
                <code>{"{{last_login}}"}</code> - Last activity date
              </li>
              <li>
                <code>{"{{plan_type}}"}</code> - Subscription plan
              </li>
            </ul>
          </section>
        </div>
        <div className="flex justify-between items-center">
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete Node
          </Button>
        </div>
      </div>
    );
  }

  // For other node types (start, condition, end)
  return (
    <div className="space-y-4">
      <p className="text-gray-700">
        Configure this <span className="font-semibold">{node.data.type}</span> node.
      </p>
      <div className="flex justify-between items-center">
        <Button variant="destructive" onClick={onDelete}>
          <Trash2 className="w-4 h-4 mr-1" />
          Delete Node
        </Button>
      </div>
    </div>
  );
}
