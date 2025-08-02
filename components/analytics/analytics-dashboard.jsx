"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { Mail, Eye, MousePointer, Users, TrendingUp, Activity } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

// Smoother animated counter, fixes possible missed final value.
function AnimatedCounter({ value = 0, duration = 900 }) {
  const [count, setCount] = useState(0);
  const raf = useRef();

  useEffect(() => {
    let start = 0;
    const end = Math.max(0, Number(value));
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const next = Math.floor(progress * (end - start) + start);
      setCount(next);
      if (progress < 1) raf.current = requestAnimationFrame(step);
      else setCount(end); // catch rounding on finish
    };
    raf.current = requestAnimationFrame(step);

    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <span aria-live="polite">{count.toLocaleString()}</span>;
}

export default function AnalyticsDashboard({ campaignId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (campaignId) fetchAnalytics();
    // eslint-disable-next-line
  }, [campaignId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/analytics/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setAnalytics(data.analytics);
      else setError(data.error || "Failed to fetch analytics");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Loading/Empty/Error UI
  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="text-lg text-gray-600 animate-pulse">Loading analytics…</div>
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (!analytics) {
    return (
      <Alert>
        <AlertDescription>No analytics data available</AlertDescription>
      </Alert>
    );
  }

  const { overview, timeSeriesData, nodePerformance } = analytics;

  // Defensive fix: ensure values present
  const emailsSent = overview.emailsSent ?? 0;
  const emailsOpened = overview.emailsOpened ?? 0;
  const emailsClicked = overview.emailsClicked ?? 0;
  const purchases = overview.purchases ?? 0;
  const totalRuns = overview.totalRuns ?? 0;
  const activeRuns = overview.activeRuns ?? 0;
  const completedRuns = overview.completedRuns ?? 0;

  // Compute derived rates reliably
  const openRate = emailsSent ? Math.min(100, Math.round((emailsOpened / emailsSent) * 100)) : 0;
  const clickRate = emailsSent ? Math.min(100, Math.round((emailsClicked / emailsSent) * 100)) : 0;

  // Display Pie chart as conversion funnel
  const pieData = [
    { name: "Sent", value: emailsSent, color: COLORS[0] },
    { name: "Opened", value: emailsOpened, color: COLORS[1] },
    { name: "Clicked", value: emailsClicked, color: COLORS[2] },
    { name: "Purchased", value: purchases, color: COLORS[3] },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2 md:px-6 py-8">
      <header>
        <h2 className="text-3xl font-bold mb-1 text-indigo-900">Campaign Analytics</h2>
        <p className="text-gray-600">Detailed performance metrics for your email campaign</p>
      </header>

      {/* Overview Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-blue-900">Total Runs</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-900">
              <AnimatedCounter value={totalRuns} />
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{activeRuns} active</Badge>
              <Badge variant="outline">{completedRuns} completed</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-blue-900">Emails Sent</CardTitle>
            <Mail className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-900">
              <AnimatedCounter value={emailsSent} />
            </div>
            <p className="text-xs text-blue-700 mt-1">Total emails delivered</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-blue-900">Open Rate</CardTitle>
            <Eye className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-900">
              <AnimatedCounter value={openRate} />%
            </div>
            <p className="text-xs text-blue-700">
              {emailsOpened} / {emailsSent} opened
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-blue-900">Click Rate</CardTitle>
            <MousePointer className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-900">
              <AnimatedCounter value={clickRate} />%
            </div>
            <p className="text-xs text-blue-700">
              {emailsClicked} / {emailsSent} clicked
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Charts */}
      <section className="grid gap-8 lg:grid-cols-2">
        {/* Time Series Line Chart */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Performance Over Time
            </CardTitle>
            <CardDescription>Email activity in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {timeSeriesData?.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={v => new Date(v).toLocaleDateString()} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={v => v?.toLocaleString()}
                    labelFormatter={v => new Date(v).toLocaleDateString()}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="sent" stroke="#0088FE" strokeWidth={2} name="Sent" />
                  <Line type="monotone" dataKey="opened" stroke="#00C49F" strokeWidth={2} name="Opened" />
                  <Line type="monotone" dataKey="clicked" stroke="#FFBB28" strokeWidth={2} name="Clicked" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500 py-10">No activity data</div>
            )}
          </CardContent>
        </Card>

        {/* Funnel Pie Chart */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Conversion Funnel
            </CardTitle>
            <CardDescription>User engagement breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={v => v?.toLocaleString()} />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* Node Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Email Node Performance</CardTitle>
          <CardDescription>
            Performance metrics for each email node in your campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Array.isArray(nodePerformance) && nodePerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={nodePerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="nodeName"
                  angle={-40}
                  textAnchor="end"
                  interval={0}
                  height={90}
                  tick={{ fontSize: 12 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={v => v?.toLocaleString()} />
                <Legend />
                <Bar dataKey="sent" fill="#0088FE" name="Sent" />
                <Bar dataKey="opened" fill="#00C49F" name="Opened" />
                <Bar dataKey="clicked" fill="#FFBB28" name="Clicked" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16 text-gray-500">
              No email nodes found in this campaign
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Node Metrics</CardTitle>
          <CardDescription>Actionable stats for individual email nodes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-blue-50 text-blue-900">
                  <th className="p-2 text-left">Email Subject</th>
                  <th className="p-2 text-right">Sent</th>
                  <th className="p-2 text-right">Opened</th>
                  <th className="p-2 text-right">Clicked</th>
                  <th className="p-2 text-right">Open Rate</th>
                  <th className="p-2 text-right">Click Rate</th>
                </tr>
              </thead>
              <tbody>
                {nodePerformance?.map((node, idx) => (
                  <tr key={node.nodeId} className={idx % 2 === 0 ? "" : "bg-blue-50"}>
                    <td className="p-2 font-medium">{node.nodeName}</td>
                    <td className="p-2 text-right">{node.sent?.toLocaleString() ?? 0}</td>
                    <td className="p-2 text-right">{node.opened?.toLocaleString() ?? 0}</td>
                    <td className="p-2 text-right">{node.clicked?.toLocaleString() ?? 0}</td>
                    <td className="p-2 text-right">{node.openRate ? `${Math.round(node.openRate)}%` : "—"}</td>
                    <td className="p-2 text-right">{node.clickRate ? `${Math.round(node.clickRate)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
