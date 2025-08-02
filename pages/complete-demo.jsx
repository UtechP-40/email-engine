import { useState } from "react"
import EnhancedCampaignBuilder from "../components/campaign/enhanced-campaign-builder"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Mail, Users, Clock, TestTube } from "lucide-react"

export default function CompleteDemo() {
  const [campaign, setCampaign] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null)

  const handleSave = async (campaignData) => {
    console.log("Campaign saved:", campaignData)
    setCampaign(campaignData)
    setSaveStatus("success")
    
    // Show success message
    setTimeout(() => setSaveStatus(null), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">✅ Complete Campaign Builder</h1>
          <p className="text-blue-100 mb-4">
            All issues fixed: Email Upload, Working Simulator, 2-Minute Intervals, Fixed UI
          </p>
          
          {/* Feature Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <span className="text-sm">Email Upload</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <span className="text-sm">Working Simulator</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <span className="text-sm">2-Min Intervals</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <span className="text-sm">Fixed UI/Dropdowns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus === "success" && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mx-6 mt-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
            <p className="text-green-700 font-medium">Campaign saved successfully!</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="max-w-7xl mx-auto p-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              How to Use the Complete System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50">Step 1</Badge>
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Upload Emails</span>
                </div>
                <p className="text-sm text-gray-600">
                  Go to "Audience" tab → Upload CSV or enter emails manually
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50">Step 2</Badge>
                  <Clock className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Build Flow</span>
                </div>
                <p className="text-sm text-gray-600">
                  Drag nodes from "Nodes" tab → Set 2-minute delays → Connect with arrows
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-purple-50">Step 3</Badge>
                  <TestTube className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">Test & Save</span>
                </div>
                <p className="text-sm text-gray-600">
                  Click "Simulate" to test → Click "Save" to store campaign
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Builder */}
        <EnhancedCampaignBuilder 
          campaign={campaign}
          onSave={handleSave}
        />

        {/* Campaign Preview */}
        {campaign && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Campaign Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Campaign Name</p>
                  <p className="font-medium">{campaign.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Recipients</p>
                  <p className="font-medium">{campaign.recipients || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nodes</p>
                  <p className="font-medium">{campaign.schema?.nodes?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium">{new Date(campaign.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}