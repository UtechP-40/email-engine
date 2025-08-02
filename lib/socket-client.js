import { io } from "socket.io-client"

let socket

export async function initSocket() {
  if (!socket) {
    try {
      await fetch("/api/socket") // 👈 this ensures the server is initialized
      socket = io({
        path: "/api/socket_io",
        transports: ["polling", "websocket"]
      })
    } catch (error) {
      console.log("Socket initialization skipped:", error.message)
      // Don't throw error, just skip socket functionality
    }
  }
  return socket
}

export function getSocket() {
  return socket
}

export function joinCampaign(campaignId) {
  if (socket) {
    socket.emit("join-campaign", campaignId)
  }
}

export function leaveCampaign(campaignId) {
  if (socket) {
    socket.emit("leave-campaign", campaignId)
  }
}
