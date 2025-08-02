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

  // Validate nodes
  for (const node of schema.nodes) {
    if (!node.id || !node.type) {
      return { valid: false, error: "Each node must have id and type" }
    }

    if (node.type === "email" && (!node.data.subject || !node.data.content)) {
      return { valid: false, error: "Email nodes must have subject and content" }
    }

    if (node.type === "delay" && !node.data.duration) {
      return { valid: false, error: "Delay nodes must have duration" }
    }

    if (node.type === "condition" && !node.data.condition) {
      return { valid: false, error: "Condition nodes must have condition logic" }
    }
  }

  return { valid: true }
}
