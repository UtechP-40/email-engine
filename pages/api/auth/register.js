import { getDatabase } from "../../../lib/db"
import { hashPassword, generateToken } from "../../../lib/auth"
import { validateEmail, validatePassword, sanitizeInput } from "../../../lib/validation"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { email, password, name, role = "marketer" } = req.body

    // Validation
    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" })
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: "Password must be at least 6 characters" })
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters" })
    }

    const db = await getDatabase()

    // Check if user exists
    const existingUser = await db.collection("users").findOne({
      email: email.toLowerCase(),
    })

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" })
    }

    // Create user
    const hashedPassword = await hashPassword(password)
    const user = {
      email: email.toLowerCase(),
      password: hashedPassword,
      name: sanitizeInput(name),
      role: ["admin", "marketer"].includes(role) ? role : "marketer",
      createdAt: new Date(),
      lastLoginAt: null,
    }

    const result = await db.collection("users").insertOne(user)

    // Generate token
    const token = generateToken({
      userId: result.insertedId,
      email: user.email,
      role: user.role,
    })

    res.status(201).json({
      success: true,
      token,
      user: {
        id: result.insertedId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}
