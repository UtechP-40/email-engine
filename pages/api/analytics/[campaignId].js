import { getDatabase } from "../../../lib/db"
import { requireAuth } from "../../../lib/auth"
import { ObjectId } from "mongodb"

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { campaignId } = req.query

  if (!ObjectId.isValid(campaignId)) {
    return res.status(400).json({ error: "Invalid campaign ID" })
  }

  try {
    const db = await getDatabase()

    // Verify campaign ownership
    const campaign = await db.collection("campaigns").findOne({
      _id: new ObjectId(campaignId),
      userId: new ObjectId(req.user.userId),
    })

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" })
    }

    // Get campaign runs
    const campaignRuns = await db
      .collection("campaign_runs")
      .find({
        campaignId: new ObjectId(campaignId),
      })
      .toArray()

    // Get events
    const events = await db
      .collection("events")
      .find({
        campaignId: new ObjectId(campaignId),
      })
      .toArray()

    // Calculate metrics
    const totalRuns = campaignRuns.length
    const activeRuns = campaignRuns.filter((run) => run.status === "active").length
    const completedRuns = campaignRuns.filter((run) => run.status === "completed").length

    const emailsSent = events.filter((e) => e.type === "email_sent").length
    const emailsOpened = events.filter((e) => e.type === "email_opened").length
    const emailsClicked = events.filter((e) => e.type === "email_clicked").length
    const purchases = events.filter((e) => e.type === "purchase").length

    const openRate = emailsSent > 0 ? ((emailsOpened / emailsSent) * 100).toFixed(2) : 0
    const clickRate = emailsSent > 0 ? ((emailsClicked / emailsSent) * 100).toFixed(2) : 0
    const conversionRate = emailsSent > 0 ? ((purchases / emailsSent) * 100).toFixed(2) : 0

    // Events over time (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentEvents = events.filter((e) => e.timestamp >= thirtyDaysAgo)

    const eventsByDay = {}
    recentEvents.forEach((event) => {
      const day = event.timestamp.toISOString().split("T")[0]
      if (!eventsByDay[day]) {
        eventsByDay[day] = { date: day, sent: 0, opened: 0, clicked: 0, purchases: 0 }
      }

      if (event.type === "email_sent") eventsByDay[day].sent++
      if (event.type === "email_opened") eventsByDay[day].opened++
      if (event.type === "email_clicked") eventsByDay[day].clicked++
      if (event.type === "purchase") eventsByDay[day].purchases++
    })

    const timeSeriesData = Object.values(eventsByDay).sort((a, b) => new Date(a.date) - new Date(b.date))

    // Node performance
    const nodePerformance = {}
    campaign.schema.nodes.forEach((node) => {
      if (node.type === "email") {
        const nodeSent = events.filter((e) => e.type === "email_sent" && e.data.nodeId === node.id).length
        const nodeOpened = events.filter((e) => e.type === "email_opened" && e.data.nodeId === node.id).length
        const nodeClicked = events.filter((e) => e.type === "email_clicked" && e.data.nodeId === node.id).length

        nodePerformance[node.id] = {
          nodeId: node.id,
          nodeName: node.data.subject || `Email ${node.id}`,
          sent: nodeSent,
          opened: nodeOpened,
          clicked: nodeClicked,
          openRate: nodeSent > 0 ? ((nodeOpened / nodeSent) * 100).toFixed(2) : 0,
          clickRate: nodeSent > 0 ? ((nodeClicked / nodeSent) * 100).toFixed(2) : 0,
        }
      }
    })

    res.json({
      success: true,
      analytics: {
        overview: {
          totalRuns,
          activeRuns,
          completedRuns,
          emailsSent,
          emailsOpened,
          emailsClicked,
          purchases,
          openRate: Number.parseFloat(openRate),
          clickRate: Number.parseFloat(clickRate),
          conversionRate: Number.parseFloat(conversionRate),
        },
        timeSeriesData,
        nodePerformance: Object.values(nodePerformance),
      },
    })
  } catch (error) {
    console.error("Analytics error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

export default requireAuth(handler)
