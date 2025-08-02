// pages/api/socket.js
import { Server } from "socket.io"
import { campaignEngine } from "../../lib/campaign-engine.js"

export default function handler(req, res) {
  if (res.socket.server.io) {
    console.log("✅ Socket already initialized")
  } else {
    console.log("🛠 Initializing Socket.IO...")
    const io = new Server(res.socket.server, {
      path: "/api/socket_io",
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : "*",
        methods: ["GET", "POST"]
      },
      transports: ["polling", "websocket"],
      pingTimeout: 60000,
      pingInterval: 25000,
    })
    
    res.socket.server.io = io
    
    // Connect campaign engine to Socket.IO for real-time updates
    campaignEngine.setSocketIO(io)

    io.on("connection", (socket) => {
      console.log("🔌 New client connected:", socket.id)

      socket.on("join-campaign", (campaignId) => {
        try {
          if (!campaignId) {
            socket.emit("error", { message: "Campaign ID is required" })
            return
          }
          
          socket.join(`campaign-${campaignId}`)
          console.log(`🟢 Client ${socket.id} joined campaign ${campaignId}`)
          
          // Confirm successful join
          socket.emit("campaign-joined", { campaignId })
        } catch (error) {
          console.error(`Error joining campaign ${campaignId}:`, error)
          socket.emit("error", { message: "Failed to join campaign" })
        }
      })

      socket.on("leave-campaign", (campaignId) => {
        try {
          if (!campaignId) {
            socket.emit("error", { message: "Campaign ID is required" })
            return
          }
          
          socket.leave(`campaign-${campaignId}`)
          console.log(`🔴 Client ${socket.id} left campaign ${campaignId}`)
          
          // Confirm successful leave
          socket.emit("campaign-left", { campaignId })
        } catch (error) {
          console.error(`Error leaving campaign ${campaignId}:`, error)
          socket.emit("error", { message: "Failed to leave campaign" })
        }
      })

      socket.on("campaign-event", (data) => {
        try {
          const { campaignId, eventType, eventData } = data
          
          if (!campaignId || !eventType) {
            socket.emit("error", { message: "Campaign ID and event type are required" })
            return
          }
          
          // Broadcast to all clients in the campaign room
          socket.to(`campaign-${campaignId}`).emit("campaign-status", {
            campaignId,
            eventType,
            data: eventData,
            timestamp: new Date(),
            source: socket.id
          })
          
          console.log(`📧 Campaign event broadcasted: ${eventType} for campaign ${campaignId}`)
        } catch (error) {
          console.error("Error handling campaign event:", error)
          socket.emit("error", { message: "Failed to process campaign event" })
        }
      })

      socket.on("disconnect", (reason) => {
        console.log(`❌ Client ${socket.id} disconnected:`, reason)
      })

      socket.on("error", (error) => {
        console.error(`Socket error for client ${socket.id}:`, error)
      })
    })

    // Global error handler
    io.engine.on("connection_error", (err) => {
      console.error("Socket.IO connection error:", err.req, err.code, err.message, err.context)
    })
  }
  res.end()
}

export const config = {
  api: {
    bodyParser: false,
  },
}
