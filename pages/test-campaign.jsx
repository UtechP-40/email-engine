import { useState } from "react"
import EnhancedCampaignBuilder from "../components/campaign/enhanced-campaign-builder"

export default function TestCampaign() {
  const [campaign, setCampaign] = useState(null)

  const handleSave = async (campaignData) => {
    console.log("Campaign saved:", campaignData)
    setCampaign(campaignData)
    alert("Campaign saved successfully!")
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Campaign Builder</h1>
          <p className="text-gray-600 mt-2">
            ✅ Email Upload & Selection | ✅ Working Simulator | ✅ 2-Minute Intervals
          </p>
        </div>
        
        <EnhancedCampaignBuilder 
          campaign={campaign}
          onSave={handleSave}
        />
      </div>
    </div>
  )
}