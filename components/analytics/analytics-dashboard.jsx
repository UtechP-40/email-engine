"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Mail, Eye, MousePointer, Users, TrendingUp, Activity } from "lucide-react"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

function AnimatedCounter({ value, duration = 1000 }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = Number.parseInt(value)
    const timer = setInterval(() => {
      start += end / (duration / 16)
      setCount(Math.floor(start))
      if (start >= end) {
        clearInterval(timer)
        setCount(end)
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value, duration])

  return <span>{count}</span>
}

export default function AnalyticsDashboard({ campaignId }) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (campaignId) {
      fetchAnalytics()
    }
  }, [campaignId])

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/analytics/${campaignId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setAnalytics(data.analytics)
      } else {
        setError(data.error || "Failed to fetch analytics")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading analytics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!analytics) {
    return (
      <Alert>
        <AlertDescription>No analytics data available</AlertDescription>
      </Alert>
    )
  }

  const { overview, timeSeriesData, nodePerformance } = analytics

  const pieData = [
    { name: "Sent", value: overview.emailsSent, color: "#0088FE" },
    { name: "Opened", value: overview.emailsOpened, color: "#00C49F" },
    { name: "Clicked", value: overview.emailsClicked, color: "#FFBB28" },
    { name: "Purchased", value: overview.purchases, color: "#FF8042" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Campaign Analytics</h2>
        <p className="text-gray-600">Detailed performance metrics for your email campaign</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Total Runs</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              <AnimatedCounter value={overview.totalRuns} />
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{overview.activeRuns} active</Badge>
              <Badge variant="outline">{overview.completedRuns} completed</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              <AnimatedCounter value={overview.emailsSent} />
            </div>
            <p className="text-xs text-muted-foreground">Total emails delivered</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              <AnimatedCounter value={overview.openRate} />%
            </div>
            <p className="text-xs text-muted-foreground">
              {overview.emailsOpened} of {overview.emailsSent} opened
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              <AnimatedCounter value={overview.clickRate} />%
            </div>
            <p className="text-xs text-muted-foreground">
              {overview.emailsClicked} of {overview.emailsSent} clicked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Time Series Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Performance Over Time
            </CardTitle>
            <CardDescription>Email activity in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                <YAxis />
                <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                <Line type="monotone" dataKey="sent" stroke="#0088FE" strokeWidth={2} name="Sent" />
                <Line type="monotone" dataKey="opened" stroke="#00C49F" strokeWidth={2} name="Opened" />
                <Line type="monotone" dataKey="clicked" stroke="#FFBB28" strokeWidth={2} name="Clicked" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Funnel Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Conversion Funnel
            </CardTitle>
            <CardDescription>User engagement breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Node Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Email Node Performance</CardTitle>
          <CardDescription>Performance metrics for each email in your campaign</CardDescription>
        </CardHeader>
        <CardContent>
          {nodePerformance.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No email nodes found in this campaign</div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={nodePerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nodeName" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sent" fill="#0088FE" name="Sent" />
                <Bar dataKey="opened" fill="#00C49F" name="Opened" />
                <Bar dataKey="clicked" fill="#FFBB28" name="Clicked" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detailed Node Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Node Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Email Subject</th>
                  <th className="text-right p-2">Sent</th>
                  <th className="text-right p-2">Opened</th>
                  <th className="text-right p-2">Clicked</th>
                  <th className="text-right p-2">Open Rate</th>
                  <th className="text-right p-2">Click Rate</th>
                </tr>
              </thead>
              <tbody>
                {nodePerformance.map((node) => (
                  <tr key={node.nodeId} className="border-b">
                    <td className="p-2 font-medium">{node.nodeName}</td>
                    <td className="text-right p-2">{node.sent}</td>
                    <td className="text-right p-2">{node.opened}</td>
                    <td className="text-right p-2">{node.clicked}</td>
                    <td className="text-right p-2">{node.openRate}%</td>
                    <td className="text-right p-2">{node.clickRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
