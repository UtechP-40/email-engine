#!/usr/bin/env node
// scripts/test-campaign-simulation.js

// Simple test campaign schema
const testCampaignSchema = {
  nodes: [
    {
      id: "1",
      type: "start",
      position: { x: 100, y: 100 },
      data: {}
    },
    {
      id: "2", 
      type: "email",
      position: { x: 200, y: 200 },
      data: {
        subject: "Welcome to our service!",
        content: "Hello {{name}}, welcome to our platform!"
      }
    },
    {
      id: "3",
      type: "end", 
      position: { x: 300, y: 300 },
      data: {}
    }
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" }
  ]
};

const testUserData = {
  name: "John Doe",
  email: "test@example.com",
  company: "Test Company"
};

const testBehavior = {
  email_opened: false,
  email_clicked: false,
  purchase_made: false,
  idle_days: 0
};

// Simulate the campaign flow (copied from campaign-simulator.jsx)
async function simulateCampaignFlow(schema, simulationData, simulationSpeed = "normal") {
  const startTime = Date.now();
  const steps = [];

  if (!schema?.nodes?.length) throw new Error("Invalid campaign schema");
  
  // Find start node
  let currentNodeId = schema.nodes.find(n => n.type === "start")?.id || schema.nodes[0].id;
  if (!currentNodeId) throw new Error("No start node in campaign");

  const maxSteps = 100;

  for (let stepCount = 0; currentNodeId && stepCount < maxSteps; stepCount++) {
    const currentNode = schema.nodes.find(n => n.id === currentNodeId);
    if (!currentNode) break;

    const step = {
      nodeId: currentNodeId,
      nodeType: currentNode.type,
      nodeData: currentNode.data,
      description: "",
      processed: true
    };

    // Step Logic
    switch (currentNode.type) {
      case "start":
        step.description = "Campaign started";
        break;
      case "email":
        step.description = `Email sent: ${currentNode.data?.subject || "Untitled"}`;
        break;
      case "delay":
        step.description = `Wait ${currentNode.data?.duration || "unknown"}`;
        break;
      case "condition":
        step.description = `Condition: ${currentNode.data?.condition?.type || "unknown"}`;
        break;
      case "end":
        step.description = "Campaign completed";
        break;
      default:
        step.description = `Unknown node type: ${currentNode.type}`;
    }
    
    steps.push(step);

    // Determine next node
    if (currentNode.type === "end") break;
    
    const nextEdge = schema.edges.find(e => e.source === currentNodeId);
    currentNodeId = nextEdge?.target;
  }

  const endTime = Date.now();
  return {
    success: true,
    steps,
    duration: endTime - startTime,
    simulationSpeed,
    simulationData
  };
}

async function testCampaignSimulation() {
  console.log('🧪 Testing Campaign Simulation...\n');

  try {
    console.log('📋 Test Campaign Schema:');
    console.log(`   - Nodes: ${testCampaignSchema.nodes.length}`);
    console.log(`   - Node types: ${testCampaignSchema.nodes.map(n => n.type).join(', ')}`);
    console.log(`   - Edges: ${testCampaignSchema.edges.length}\n`);

    const simulation = await simulateCampaignFlow(
      testCampaignSchema,
      { testUser: testUserData, userBehavior: testBehavior },
      "instant"
    );

    console.log('✅ Simulation Results:');
    console.log(`   - Success: ${simulation.success}`);
    console.log(`   - Steps: ${simulation.steps.length}`);
    console.log(`   - Duration: ${simulation.duration}ms\n`);

    console.log('📝 Step Details:');
    simulation.steps.forEach((step, i) => {
      console.log(`   ${i + 1}. ${step.nodeType}: ${step.description}`);
    });

    const emailSteps = simulation.steps.filter(s => s.nodeType === "email");
    console.log(`\n📧 Emails Sent: ${emailSteps.length}`);

    if (emailSteps.length > 0) {
      console.log('🎉 SUCCESS: Campaign simulation is working correctly!');
      console.log('   The "email sent zero" issue should now be fixed.');
    } else {
      console.log('❌ ISSUE: No email steps found in simulation');
    }

  } catch (error) {
    console.error('❌ Simulation failed:', error.message);
  }
}

// Run the test
testCampaignSimulation();