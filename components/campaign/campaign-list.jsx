"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Play, Pause, Trash2, BarChart3, LoaderCircle } from "lucide-react"

// Simple skeleton shimmer for loading state
function CampaignSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="animate-pulse bg-gray-50/50">
          <CardHeader>
            <div className="h-4 w-2/3 bg-gray-200 mb-3 rounded" />
            <div className="h-3 w-1/3 bg-gray-100 rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-3 w-1/2 bg-gray-100 mb-2 rounded" />
            <div className="h-3 w-12 bg-gray-100 mb-6 rounded" />
            <div className="flex gap-2">
              <div className="h-7 w-14 rounded bg-gray-200" />
              <div className="h-7 w-14 rounded bg-gray-200" />
              <div className="h-7 w-8 rounded bg-gray-200" />
              <div className="h-7 w-8 rounded bg-gray-200" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Color and icon for status badge
function getStatusBadge(status) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1" aria-label="Active">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          Active
        </Badge>
      )
    case "paused":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1" aria-label="Paused">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
          Paused
        </Badge>
      )
    case "completed":
      return (
        <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1" aria-label="Completed">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
          Completed
        </Badge>
      )
    case "draft":
    default:
      return (
        <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1" aria-label="Draft">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
          Draft
        </Badge>
      )
  }
}

export default function CampaignList({ onCreateNew, onEdit, onViewAnalytics }) {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchCampaigns()
    // eslint-disable-next-line
  }, [])

  const fetchCampaigns = async () => {
    setLoading(true)
    setError("")
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/campaigns", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) setCampaigns(data.campaigns)
      else setError(data.error || "Failed to fetch campaigns")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // for Start/Pause status
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
      if (response.ok)
        setCampaigns((prev) =>
          prev.map((c) =>
            c._id === campaignId ? { ...c, status } : c
          )
        )
    } catch (error) {
      alert("Failed to update campaign status")
    }
  }

  // delete with confirmation
  const deleteCampaign = async (campaignId) => {
    if (!window.confirm("Are you sure you want to delete this campaign?")) return
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok)
        setCampaigns((prev) => prev.filter((c) => c._id !== campaignId))
    } catch (error) {
      alert("Failed to delete campaign.")
    }
  }

  // Responsive, Clean UI
  return (
    <div className="max-w-7xl mx-auto px-2 md:px-6 py-8 space-y-7">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold leading-tight">Email Campaigns</h1>
          <p className="text-gray-600 mt-1 text-base">Manage your automated email campaigns</p>
        </div>
        <Button
          onClick={onCreateNew}
          className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          New Campaign
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <CampaignSkeleton />
      ) : campaigns.length === 0 ? (
        <Card className="shadow-lg border-dashed border-2 border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-14">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-gray-600 mb-5">Create your first email campaign to get started.</p>
              <Button onClick={onCreateNew} className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Create Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card
              key={campaign._id}
              className="shadow-sm hover:shadow-lg group transition-shadow border border-gray-100 hover:border-blue-300 rounded-xl h-full flex flex-col justify-between"
              tabIndex={0}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-semibold truncate max-w-xs">{campaign.name}</CardTitle>
                    <CardDescription className="mt-1 text-sm line-clamp-2 text-gray-500 min-h-[22px]">
                      {campaign.description || <span className="italic text-gray-400">No description</span>}
                    </CardDescription>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex gap-8 text-xs text-gray-500 mt-1">
                  <div>
                    <span className="font-medium text-gray-900">{new Date(campaign.createdAt).toLocaleDateString()}</span>
                    <span className="ml-1">Created</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{campaign.schema?.nodes?.length || 0}</span>
                    <span className="ml-1">Nodes</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(campaign)}
                    className="flex items-center gap-1"
                    aria-label="Edit"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewAnalytics(campaign._id)}
                    className="flex items-center gap-1"
                    aria-label="View analytics"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Analytics
                  </Button>
                  {campaign.status === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateCampaignStatus(campaign._id, "paused")}
                      className="flex items-center gap-1"
                      aria-label="Pause"
                    >
                      <Pause className="w-4 h-4" /> Pause
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateCampaignStatus(campaign._id, "active")}
                      className="flex items-center gap-1"
                      aria-label="Start"
                    >
                      <Play className="w-4 h-4" /> Start
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteCampaign(campaign._id)}
                    className="flex items-center gap-1"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
