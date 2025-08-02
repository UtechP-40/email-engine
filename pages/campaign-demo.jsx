import { useState } from "react"
import EnhancedCampaignBuilder from "../components/campaign/enhanced-campaign-builder"

export default function CampaignDemo() {
  const [campaign, setCampaign] = useState(null)

  const handleSave = async (campaignData) => {
    console.log("Saving campaign:", campaignData)
    setCampaign(campaignData)
    
    // Here you would normally save to your database
    // const response = await fetch('/api/campaigns', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(campaignData)
    // })
    
    alert("Campaign saved successfully!")
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-4">
        <h1 className="text-3xl font-bold mb-6">Enhanced Campaign Builder Demo</h1>
        <EnhancedCampaignBuilder 
          campaign={campaign}
          onSave={handleSave}
        />
      </div>
    </div>
  )
}