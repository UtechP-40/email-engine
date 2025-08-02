import { getDatabase } from "../../../../lib/db"
import { requireAuth } from "../../../../lib/auth"
import { campaignEngine } from "../../../../lib/campaign-engine"
import { ObjectId } from "mongodb"

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { id } = req.query
  const { userData, events = [] } = req.body

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid campaign ID" })
  }

  if (!userData || !userData.email) {
    return res.status(400).json({ error: "User data with email is required" })
  }

  try {
    const db = await getDatabase()

    const campaign = await db.collection("campaigns").findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId),
    })

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" })
    }

    const simulation = await campaignEngine.simulateUserJourney(id, userData, events)

    res.json({
      success: true,
      simulation,
    })
  } catch (error) {
    console.error("Simulate campaign error:", error)
    res.status(500).json({ error: error.message || "Internal server error" })
  }
}

export default requireAuth(handler)
