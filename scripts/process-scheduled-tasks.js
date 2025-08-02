import connectDB from "../lib/mongodb"
import Campaign from "../models/Campaign"
import Queue from "../lib/queue"
import ms from "ms"

const convertToMs = ({ value, unit }) => {
  const unitMap = {
    minutes: "m",
    hours: "h",
    days: "d",
  }
  return ms(`${value}${unitMap[unit] || "m"}`)
}

async function processScheduledCampaigns() {
  await connectDB()
  console.log("Processing scheduled tasks...")

  const campaigns = await Campaign.find({ status: "scheduled" })

  for (const campaign of campaigns) {
    const { nodes, edges } = campaign.schema

    const nodeMap = {}
    for (const node of nodes) {
      nodeMap[node.id] = node
    }

    const startNode = nodes.find((n) => n.type === "start")
    if (!startNode) continue

    const traverse = async (nodeId, delayOffset = 0) => {
      const node = nodeMap[nodeId]
      if (!node) return

      if (node.type === "email") {
        const delay = delayOffset
        const jobData = {
          emailList: campaign.selectedEmails,
          subject: node.data.subject,
          content: node.data.content,
          campaignId: campaign._id,
        }

        console.log(` Scheduling email for ${campaign.name} in ${delay}ms`)
        await Queue.add("send-email", jobData, { delay })
      }

      if (node.type === "delay") {
        const delayMs = convertToMs(node.data.duration || { value: 2, unit: "minutes" })
        delayOffset += delayMs
      }

      const nextEdge = edges.find((e) => e.source === nodeId)
      if (nextEdge) {
        await traverse(nextEdge.target, delayOffset)
      }
    }

    await traverse(startNode.id)
  }

  console.log("Done processing campaigns.")
}

processScheduledCampaigns()
