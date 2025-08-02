export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password) {
  return password && password.length >= 6
}

export function sanitizeInput(input) {
  if (typeof input !== "string") return input
  return input.trim().replace(/[<>]/g, "")
}

export function validateCampaignSchema(schema) {
  if (!schema || typeof schema !== "object") {
    return { valid: false, error: "Schema must be an object" }
  }

  if (!schema.nodes || !Array.isArray(schema.nodes)) {
    return { valid: false, error: "Schema must have nodes array" }
  }

  if (!schema.edges || !Array.isArray(schema.edges)) {
    return { valid: false, error: "Schema must have edges array" }
  }

  if (schema.nodes.length === 0) {
    return { valid: false, error: "Schema must have at least one node" }
  }

  // Validate nodes
  for (let i = 0; i < schema.nodes.length; i++) {
    const node = schema.nodes[i]
    
    if (!node.id || !node.type) {
      return { valid: false, error: `Node ${i + 1} must have id and type` }
    }

    // Ensure node has data object
    if (!node.data || typeof node.data !== "object") {
      return { valid: false, error: `Node ${node.id} must have data object` }
    }

    // Validate specific node types
    switch (node.type) {
      case "email":
        if (!node.data.subject && !node.data.content) {
          // Allow empty subject/content for draft campaigns, but warn
          console.warn(`Email node ${node.id} has empty subject or content`)
        }
        break
      
      case "delay":
        if (!node.data.duration) {
          return { valid: false, error: `Delay node ${node.id} must have duration` }
        }
        // Validate duration format
        if (typeof node.data.duration === "object") {
          if (!node.data.duration.value || !node.data.duration.unit) {
            return { valid: false, error: `Delay node ${node.id} duration must have value and unit` }
          }
        } else if (typeof node.data.duration === "string") {
          if (!node.data.duration.match(/^\d+\s*(minutes?|hours?|days?)$/)) {
            return { valid: false, error: `Delay node ${node.id} has invalid duration format` }
          }
        }
        break
      
      case "condition":
        if (!node.data.condition || typeof node.data.condition !== "object") {
          return { valid: false, error: `Condition node ${node.id} must have condition object` }
        }
        if (!node.data.condition.type) {
          return { valid: false, error: `Condition node ${node.id} must have condition type` }
        }
        break
      
      case "start":
      case "end":
        // Start and end nodes don't need additional validation
        break
      
      default:
        console.warn(`Unknown node type: ${node.type} for node ${node.id}`)
    }
  }

  // Validate edges
  const nodeIds = new Set(schema.nodes.map(n => n.id))
  for (let i = 0; i < schema.edges.length; i++) {
    const edge = schema.edges[i]
    
    if (!edge.source || !edge.target) {
      return { valid: false, error: `Edge ${i + 1} must have source and target` }
    }
    
    if (!nodeIds.has(edge.source)) {
      return { valid: false, error: `Edge ${i + 1} references non-existent source node: ${edge.source}` }
    }
    
    if (!nodeIds.has(edge.target)) {
      return { valid: false, error: `Edge ${i + 1} references non-existent target node: ${edge.target}` }
    }
  }

  // Check for at least one start node
  const startNodes = schema.nodes.filter(n => n.type === "start")
  if (startNodes.length === 0) {
    return { valid: false, error: "Schema must have at least one start node" }
  }

  if (startNodes.length > 1) {
    console.warn("Schema has multiple start nodes, only the first will be used")
  }

  return { valid: true }
}
