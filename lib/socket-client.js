import { io } from "socket.io-client"

let socket
let reconnectAttempts = 0
const maxReconnectAttempts = 5

export async function initSocket() {
  if (!socket) {
    try {
      // Ensure server is initialized
      await fetch("/api/socket")
      
      socket = io({
        path: "/api/socket_io",
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      })

      // Connection event handlers
      socket.on("connect", () => {
        console.log("✅ Socket connected:", socket.id)
        reconnectAttempts = 0
      })

      socket.on("disconnect", (reason) => {
        console.log("🔌 Socket disconnected:", reason)
        if (reason === "io server disconnect") {
          // Server initiated disconnect, reconnect manually
          socket.connect()
        }
      })

      socket.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error.message)
        reconnectAttempts++
        
        if (reconnectAttempts >= maxReconnectAttempts) {
          console.error("Max reconnection attempts reached. Socket functionality disabled.")
        }
      })

      socket.on("reconnect", (attemptNumber) => {
        console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`)
        reconnectAttempts = 0
      })

      socket.on("reconnect_error", (error) => {
        console.error("🔄❌ Socket reconnection failed:", error.message)
      })

      // Campaign-specific event handlers
      socket.on("campaign-status", (data) => {
        console.log("📧 Campaign status update:", data)
        // Emit custom event for components to listen to
        window.dispatchEvent(new CustomEvent("campaign-status-update", { detail: data }))
      })

      socket.on("campaign-error", (data) => {
        console.error("📧❌ Campaign error:", data)
        window.dispatchEvent(new CustomEvent("campaign-error", { detail: data }))
      })

    } catch (error) {
      console.error("Socket initialization failed:", error.message)
      // Don't throw error, just skip socket functionality
    }
  }
  return socket
}

export function getSocket() {
  return socket
}

export function joinCampaign(campaignId) {
  if (socket && socket.connected) {
    socket.emit("join-campaign", campaignId)
    console.log(`🟢 Joined campaign room: ${campaignId}`)
  } else {
    console.warn("Cannot join campaign: Socket not connected")
  }
}

export function leaveCampaign(campaignId) {
  if (socket && socket.connected) {
    socket.emit("leave-campaign", campaignId)
    console.log(`🔴 Left campaign room: ${campaignId}`)
  }
}

export function emitCampaignEvent(campaignId, eventType, data) {
  if (socket && socket.connected) {
    socket.emit("campaign-event", { campaignId, eventType, data })
  }
}

export function isSocketConnected() {
  return socket && socket.connected
}
