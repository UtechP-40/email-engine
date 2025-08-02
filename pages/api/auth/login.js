import { getDatabase } from "../../../lib/db"
import { comparePassword, generateToken } from "../../../lib/auth"
import { validateEmail } from "../../../lib/validation"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { email, password } = req.body

    if (!validateEmail(email) || !password) {
      return res.status(400).json({ error: "Invalid email or password" })
    }

    const db = await getDatabase()

    const user = await db.collection("users").findOne({
      email: email.toLowerCase(),
    })

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const isValidPassword = await comparePassword(password, user.password)

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Update last login
    await db.collection("users").updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } })

    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
    })

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}
