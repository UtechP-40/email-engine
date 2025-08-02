"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Play, Pause, Trash2, BarChart3 } from "lucide-react"

export default function CampaignList({ onCreateNew, onEdit, onViewAnalytics }) {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/campaigns", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        setCampaigns(data.campaigns)
      } else {
        setError(data.error || "Failed to fetch campaigns")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const updateCampaignStatus = async (campaignId, status) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        setCampaigns(campaigns.map((campaign) => (campaign._id === campaignId ? { ...campaign, status } : campaign)))
      }
    } catch (error) {
      console.error("Failed to update campaign status:", error)
    }
  }

  const deleteCampaign = async (campaignId) => {
    if (!confirm("Are you sure you want to delete this campaign?")) {
      return
    }

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setCampaigns(campaigns.filter((campaign) => campaign._id !== campaignId))
      }
    } catch (error) {
      console.error("Failed to delete campaign:", error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "paused":
        return "bg-yellow-100 text-yellow-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading campaigns...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-gray-600 mt-2">Manage your automated email campaigns</p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-gray-600 mb-4">Create your first email campaign to get started</p>
              <Button onClick={onCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <CardDescription className="mt-1">{campaign.description || "No description"}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <p>Created: {new Date(campaign.createdAt).toLocaleDateString()}</p>
                    <p>Nodes: {campaign.schema?.nodes?.length || 0}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(campaign)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>

                    <Button variant="outline" size="sm" onClick={() => onViewAnalytics(campaign._id)}>
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Analytics
                    </Button>

                    {campaign.status === "active" ? (
                      <Button variant="outline" size="sm" onClick={() => updateCampaignStatus(campaign._id, "paused")}>
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => updateCampaignStatus(campaign._id, "active")}>
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Button>
                    )}

                    <Button variant="destructive" size="sm" onClick={() => deleteCampaign(campaign._id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
