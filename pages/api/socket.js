// pages/api/socket.js
import { Server } from "socket.io"

export default function handler(req, res) {
  if (res.socket.server.io) {
    console.log("✅ Socket already initialized")
  } else {
    console.log("🛠 Initializing Socket.IO...")
    const io = new Server(res.socket.server, {
      path: "/api/socket_io", // optional: custom path to avoid conflicts
      addTrailingSlash: false,
    })
    res.socket.server.io = io

    io.on("connection", (socket) => {
      console.log("🔌 New client:", socket.id)

      socket.on("join-campaign", (campaignId) => {
        socket.join(`campaign-${campaignId}`)
        console.log(`🟢 Client ${socket.id} joined campaign ${campaignId}`)
      })

      socket.on("leave-campaign", (campaignId) => {
        socket.leave(`campaign-${campaignId}`)
        console.log(`🔴 Client ${socket.id} left campaign ${campaignId}`)
      })

      socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id)
      })
    })
  }
  res.end()
}

export const config = {
  api: {
    bodyParser: false,
  },
}
