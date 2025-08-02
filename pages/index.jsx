"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import LoginForm from "../components/auth/login-form"
import RegisterForm from "../components/auth/register-form"
import CampaignList from "../components/campaign/campaign-list"
import EnhancedCampaignBuilder from "../components/campaign/enhanced-campaign-builder"
import CampaignSimulator from "../components/campaign/campaign-simulator"
import AnalyticsDashboard from "../components/analytics/analytics-dashboard"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, User, Mail } from "lucide-react"
import { initSocket } from "../lib/socket-client"
import { motion, AnimatePresence } from "framer-motion"
import './globals.css'
export default function Home() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [currentView, setCurrentView] = useState("campaigns")
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [authMode, setAuthMode] = useState("login")
  const router = useRouter()

  useEffect(() => {
    // Check for existing auth
    const savedToken = localStorage.getItem("token")
    const savedUser = localStorage.getItem("user")

    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
      initSocket()
    }
  }, [])

  const handleLogin = (userData, userToken) => {
    setUser(userData)
    setToken(userToken)
    initSocket()
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
    setToken(null)
    setCurrentView("campaigns")
    setSelectedCampaign(null)
  }

  const handleCreateCampaign = () => {
    setSelectedCampaign(null)
    setCurrentView("builder")
  }

  const handleEditCampaign = (campaign) => {
    setSelectedCampaign(campaign)
    setCurrentView("builder")
  }

  const handleViewAnalytics = (campaignId) => {
    setSelectedCampaign({ _id: campaignId })
    setCurrentView("analytics")
  }

  const handleSaveCampaign = async (campaignData) => {
    const url = selectedCampaign ? `/api/campaigns/${selectedCampaign._id}` : "/api/campaigns"

    const method = selectedCampaign ? "PUT" : "POST"

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(campaignData),
    })

    const data = await response.json()

    if (data.success) {
      setCurrentView("campaigns")
      setSelectedCampaign(null)
    } else {
      throw new Error(data.error || "Failed to save campaign")
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Campaign Engine</h1>
            <p className="text-gray-600">Build and manage automated email campaigns</p>
          </div>

          <Tabs value={authMode} onValueChange={setAuthMode}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm onLogin={handleLogin} />
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm onRegister={handleLogin} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced header with gradient background */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <h1 className="text-xl font-semibold">Email Campaign Engine</h1>
              </div>
            </div>

            <nav className="flex space-x-4">
              <Button
                variant={currentView === "campaigns" ? "default" : "ghost"}
                onClick={() => setCurrentView("campaigns")}
              >
                Campaigns
              </Button>
              {selectedCampaign && (
                <>
                  <Button
                    variant={currentView === "builder" ? "default" : "ghost"}
                    onClick={() => setCurrentView("builder")}
                  >
                    Builder
                  </Button>
                  <Button
                    variant={currentView === "simulator" ? "default" : "ghost"}
                    onClick={() => setCurrentView("simulator")}
                  >
                    Simulator
                  </Button>
                  <Button
                    variant={currentView === "analytics" ? "default" : "ghost"}
                    onClick={() => setCurrentView("analytics")}
                  >
                    Analytics
                  </Button>
                </>
              )}
            </nav>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span className="text-sm text-gray-700">{user.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Wrap main content with animations */}
      <AnimatePresence mode="wait">
        <motion.main
          key={currentView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        >
          {currentView === "campaigns" && (
            <CampaignList
              onCreateNew={handleCreateCampaign}
              onEdit={handleEditCampaign}
              onViewAnalytics={handleViewAnalytics}
            />
          )}

          {currentView === "builder" && <EnhancedCampaignBuilder campaign={selectedCampaign} onSave={handleSaveCampaign} />}

          {currentView === "simulator" && selectedCampaign && <CampaignSimulator campaignId={selectedCampaign._id} />}

          {currentView === "analytics" && selectedCampaign && <AnalyticsDashboard campaignId={selectedCampaign._id} />}
        </motion.main>
      </AnimatePresence>
    </div>
  )
}
