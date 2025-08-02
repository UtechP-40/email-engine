import { getDatabase } from "../../../lib/db"
import { requireAuth } from "../../../lib/auth"
import { validateCampaignSchema, sanitizeInput } from "../../../lib/validation"
import { ObjectId } from "mongodb"

async function handler(req, res) {
  const db = await getDatabase()

  if (req.method === "GET") {
    try {
      const campaigns = await db
        .collection("campaigns")
        .find({
          userId: new ObjectId(req.user.userId),
        })
        .sort({ createdAt: -1 })
        .toArray()

      res.json({ campaigns })
    } catch (error) {
      console.error("Get campaigns error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  } else if (req.method === "POST") {
    try {
      const { name, description, schema } = req.body

      if (!name || name.trim().length < 3) {
        return res.status(400).json({ error: "Campaign name must be at least 3 characters" })
      }

      if (!schema) {
        return res.status(400).json({ error: "Campaign schema is required" })
      }

      const schemaValidation = validateCampaignSchema(schema)
      if (!schemaValidation.valid) {
        return res.status(400).json({ error: schemaValidation.error })
      }

      const campaign = {
        name: sanitizeInput(name),
        description: sanitizeInput(description || ""),
        schema,
        userId: new ObjectId(req.user.userId),
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = await db.collection("campaigns").insertOne(campaign)

      res.status(201).json({
        success: true,
        campaignId: result.insertedId,
        campaign: { ...campaign, _id: result.insertedId },
      })
    } catch (error) {
      console.error("Create campaign error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  } else {
    res.status(405).json({ error: "Method not allowed" })
  }
}

export default requireAuth(handler)
