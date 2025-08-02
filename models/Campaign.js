// models/Campaign.js
import mongoose from "mongoose"

const NodeSchema = new mongoose.Schema({
  id: String,
  type: String,
  position: {
    x: Number,
    y: Number,
  },
  data: {
    subject: String,
    content: String,
    duration: {
      value: Number,
      unit: String, // 'minutes' | 'hours' | 'days'
    },
    condition: mongoose.Schema.Types.Mixed,
  },
})

const EdgeSchema = new mongoose.Schema({
  id: String,
  source: String,
  target: String,
  type: String,
})

const CampaignSchema = new mongoose.Schema({
  name: String,
  description: String,
  schema: {
    nodes: [NodeSchema],
    edges: [EdgeSchema],
  },
  selectedEmails: [String],
  recipients: Number,
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: "draft" },
})

export default mongoose.models.Campaign || mongoose.model("Campaign", CampaignSchema)
