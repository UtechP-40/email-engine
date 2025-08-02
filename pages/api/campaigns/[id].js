import { getDatabase } from "../../../lib/db"
import { requireAuth } from "../../../lib/auth"
import { validateCampaignSchema, sanitizeInput } from "../../../lib/validation"
import { ObjectId } from "mongodb"

async function handler(req, res) {
  const { id } = req.query
  const db = await getDatabase()

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid campaign ID" })
  }

  if (req.method === "GET") {
    try {
      const campaign = await db.collection("campaigns").findOne({
        _id: new ObjectId(id),
        userId: new ObjectId(req.user.userId),
      })

      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" })
      }

      res.json({ campaign })
    } catch (error) {
      console.error("Get campaign error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  } else if (req.method === "PUT") {
    try {
      const { name, description, schema, status } = req.body

      const updates = { updatedAt: new Date() }

      if (name !== undefined) {
        if (name.trim().length < 3) {
          return res.status(400).json({ error: "Campaign name must be at least 3 characters" })
        }
        updates.name = sanitizeInput(name)
      }

      if (description !== undefined) {
        updates.description = sanitizeInput(description)
      }

      if (schema !== undefined) {
        const schemaValidation = validateCampaignSchema(schema)
        if (!schemaValidation.valid) {
          return res.status(400).json({ error: schemaValidation.error })
        }
        updates.schema = schema
      }

      if (status !== undefined) {
        if (!["draft", "active", "paused", "completed"].includes(status)) {
          return res.status(400).json({ error: "Invalid status" })
        }
        updates.status = status
      }

      const result = await db.collection("campaigns").updateOne(
        {
          _id: new ObjectId(id),
          userId: new ObjectId(req.user.userId),
        },
        { $set: updates },
      )

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Campaign not found" })
      }

      res.json({ success: true })
    } catch (error) {
      console.error("Update campaign error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  } else if (req.method === "DELETE") {
    try {
      const result = await db.collection("campaigns").deleteOne({
        _id: new ObjectId(id),
        userId: new ObjectId(req.user.userId),
      })

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Campaign not found" })
      }

      res.json({ success: true })
    } catch (error) {
      console.error("Delete campaign error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  } else {
    res.status(405).json({ error: "Method not allowed" })
  }
}

export default requireAuth(handler)
