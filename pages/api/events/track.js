import { getDatabase } from "../../../lib/db"
import { ObjectId } from "mongodb"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { userId, campaignId, type, data = {} } = req.body

    if (!userId || !campaignId || !type) {
      return res.status(400).json({ error: "userId, campaignId, and type are required" })
    }

    const validTypes = ["email_opened", "email_clicked", "purchase", "page_view", "custom"]
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid event type" })
    }

    const db = await getDatabase()

    const event = {
      userId,
      campaignId: ObjectId.isValid(campaignId) ? new ObjectId(campaignId) : campaignId,
      type,
      data,
      timestamp: new Date(),
      ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
    }

    await db.collection("events").insertOne(event)

    res.json({ success: true })
  } catch (error) {
    console.error("Track event error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}
