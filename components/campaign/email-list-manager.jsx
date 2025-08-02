"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Upload, Download, Users, Mail, FileText, CheckCircle,
  AlertTriangle, X, Search
} from "lucide-react"
import Papa from "papaparse"

const MAX_UPLOAD = 10000

export default function EmailListManager({ onEmailsSelected, selectedEmails = [] }) {
  const [activeTab, setActiveTab] = useState("upload")
  const [emailList, setEmailList] = useState([])                 // All loaded emails
  const [manualEmails, setManualEmails] = useState("")
  const [uploadStatus, setUploadStatus] = useState(null)
  const [selectedEmailIds, setSelectedEmailIds] = useState(new Set(selectedEmails.map(e => e.email)))
  const [dbSegment, setDbSegment] = useState("")
  const [dbLimit, setDbLimit] = useState(1000)
  const [search, setSearch] = useState("")
  const fileInputRef = useRef(null)

  // --- CSV Upload handler
  const handleFileUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadStatus({ type: "loading", message: "Processing file..." })

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          let emails = results.data.map((row, index) => {
            const email = (
              row.email || row.Email || row.EMAIL ||
              row['Email Address'] || row['email_address'] ||
              Object.values(row)[0]
            )
            const name = (
              row.name || row.Name || row.NAME ||
              row['Full Name'] || row.fullname || row.full_name ||
              row.firstName || row.first_name || row['First Name'] ||
              (email?.split("@")[0])
            )
            const company = (
              row.company || row.Company || row.COMPANY ||
              row.organization || row.Organization || ""
            )
            // Validate
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!email || !emailRegex.test(String(email).trim().toLowerCase()))
              return null

            return {
              id: `csv_${index}_${String(email).trim().toLowerCase()}`,
              email: String(email).trim().toLowerCase(),
              name: name?.trim() || email.split("@")[0],
              company: company?.trim() || "",
              source: "csv_upload",
              uploadedAt: new Date().toISOString()
            }
          }).filter(Boolean)
          // Remove duplicates, cap at MAX_UPLOAD
          const unique = dedupeByEmail(emails).slice(0, MAX_UPLOAD)
          setEmailList(unique)
          setUploadStatus({
            type: "success",
            message: `Imported ${unique.length} unique emails`
          })
          const newIds = new Set(unique.map(e => e.email))
          setSelectedEmailIds(newIds)
          onEmailsSelected(unique)
        } catch (error) {
          setUploadStatus({
            type: "error",
            message: `Error processing file: ${error.message}`
          })
        }
      },
      error: (error) => {
        setUploadStatus({
          type: "error",
          message: `Error: ${error.message}`
        })
      }
    })
  }

  // Manual Email Entry Handler
  const handleManualEmails = () => {
    if (!manualEmails.trim()) return
    const lines = manualEmails.split('\n').filter(l => l.trim())
    let entries = []
    lines.forEach((line, idx) => {
      const parts = line.split(',').map(p => p.trim())
      // Accept: email, [name], [company]
      const email = parts[0]
      const name = parts[1] || (email ? email.split("@")[0] : "")
      const company = parts[2] || ""
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (email && emailRegex.test(email)) {
        entries.push({
          id: `manual_${idx}_${email}`,
          email: email.toLowerCase(),
          name,
          company,
          source: "manual_entry",
          uploadedAt: new Date().toISOString()
        })
      }
    })
    // Dedupe and Merge
    const allEmails = dedupeByEmail([...emailList, ...entries])
    setEmailList(allEmails)
    setManualEmails("")
    setUploadStatus({
      type: "success",
      message: `Added ${entries.length} valid emails`
    })
    // Update selection: keep previously checked, select newly added
    const newIds = new Set([...selectedEmailIds, ...entries.map(e => e.email)])
    setSelectedEmailIds(newIds)
    onEmailsSelected(allEmails.filter(e => newIds.has(e.email)))
  }

  // Dedupe utility
  function dedupeByEmail(list) {
    const seen = new Set()
    return list.filter(e => {
      if (seen.has(e.email)) return false
      seen.add(e.email)
      return true
    })
  }

  // Select checkbox handlers
  const handleEmailSelection = (email, checked) => {
    const newSet = new Set(selectedEmailIds)
    if (checked) newSet.add(email.email)
    else newSet.delete(email.email)
    setSelectedEmailIds(newSet)
    onEmailsSelected(emailList.filter(e => newSet.has(e.email)))
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      const all = new Set((filteredEmails.length ? filteredEmails : emailList).map(e => e.email))
      setSelectedEmailIds(all)
      onEmailsSelected(emailList.filter(e => all.has(e.email)))
    } else {
      setSelectedEmailIds(new Set())
      onEmailsSelected([])
    }
  }

  // Database loading stub
  async function handleLoadDatabase() {
    setUploadStatus({ type: "loading", message: "Loading from database..." })
    setTimeout(() => {
      // Simulated records for demo
      const demo = Array.from({ length: Math.min(dbLimit, 200) }).map((_, i) => ({
        id: `db_${i}`,
        email: `user${i}@${dbSegment || 'segment'}.com`,
        name: `User ${i}`,
        company: dbSegment.replace("_", " ") || "Company",
        source: "database",
        uploadedAt: new Date().toISOString()
      }))
      const all = dedupeByEmail([...emailList, ...demo])
      setEmailList(all)
      setUploadStatus({
        type: "success",
        message: `Loaded ${demo.length} records from "${dbSegment || 'segment'}"`
      })
      const newIds = new Set([...selectedEmailIds, ...demo.map(e => e.email)])
      setSelectedEmailIds(newIds)
      onEmailsSelected(all.filter(e => newIds.has(e.email)))
    }, 800) // Fake db latency
  }

  // Download Template CSV
  const downloadTemplate = () => {
    const sample = "email,name,company\njohn@example.com,John Doe,Acme Corp\njane@example.com,Jane Smith,Tech Inc"
    const blob = new Blob([sample], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = "email_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  // Filter by search
  const filteredEmails = search.length > 0
    ? emailList.filter(e =>
        e.email.includes(search.toLowerCase()) ||
        (e.name && e.name.toLowerCase().includes(search.toLowerCase())) ||
        (e.company && e.company.toLowerCase().includes(search.toLowerCase()))
      )
    : emailList

  // --- UI Starts here
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="shadow-xl border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Email List Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 bg-gray-50 rounded mb-2">
              <TabsTrigger value="upload" className="rounded-l">📁 Upload CSV</TabsTrigger>
              <TabsTrigger value="manual">✏️ Manual Entry</TabsTrigger>
              <TabsTrigger value="database" className="rounded-r">🗄️ From Database</TabsTrigger>
            </TabsList>

            {/* --- Upload Tab --- */}
            <TabsContent value="upload" className="space-y-5">
              <div className="border-2 border-dashed border-gray-300 rounded-lg py-8 px-4 text-center bg-gradient-to-tr from-gray-100 to-white">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-1">Upload Email List</h3>
                <p className="text-gray-600 mb-4">
                  Upload a CSV with email addresses, names, and company
                </p>

                <div className="flex flex-col md:flex-row gap-2 justify-center mb-2">
                  <Button variant="default" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose CSV File
                  </Button>
                  <Button variant="outline" color="cyan" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <p className="mt-4 text-sm text-gray-500">
                  <b>Format:</b> <code>email, name, company</code> (Email required)
                  <br />
                  <small className="text-gray-400">Max {MAX_UPLOAD} entries per upload</small>
                </p>
              </div>
            </TabsContent>

            {/* --- Manual Entry Tab --- */}
            <TabsContent value="manual" className="space-y-4">
              <div>
                <Label htmlFor="manual-emails">Enter Emails</Label>
                <Textarea
                  id="manual-emails"
                  value={manualEmails}
                  onChange={(e) => setManualEmails(e.target.value)}
                  placeholder="john@example.com, John Doe, Acme Corp&#10;jane@example.com, Jane Smith, Tech Inc"
                  rows={8}
                  autoFocus={activeTab === "manual"}
                  className="font-mono text-sm rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: <code>email, name, company</code> (1 per line)
                </p>
              </div>
              <Button
                disabled={!manualEmails.trim()}
                onClick={handleManualEmails}>
                <Mail className="w-4 h-4 mr-2" />
                Add Emails
              </Button>
            </TabsContent>

            {/* --- Database Segment Tab --- */}
            <TabsContent value="database" className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>User Segment</Label>
                  <Select
                    value={dbSegment}
                    onValueChange={setDbSegment}
                    aria-label="Choose segment"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select segment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_users">All Users</SelectItem>
                      <SelectItem value="new_signups">New Signups (30 days)</SelectItem>
                      <SelectItem value="trial_users">Trial Users</SelectItem>
                      <SelectItem value="paying_customers">Paying Customers</SelectItem>
                      <SelectItem value="inactive_users">Inactive Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Max Recipients</Label>
                  <Input
                    type="number"
                    min={1}
                    max={MAX_UPLOAD}
                    value={dbLimit}
                    onChange={e => setDbLimit(Math.max(1, Math.min(Number(e.target.value) || 1, MAX_UPLOAD)))}
                  />
                </div>
              </div>
              <Button
                onClick={handleLoadDatabase}
                disabled={!dbSegment}
                className="w-full sm:w-auto"
              >
                <Users className="w-4 h-4 mr-2" />
                Load from Database
              </Button>
            </TabsContent>
          </Tabs>
          {/* --- Upload Status Feedback */}
          {uploadStatus && (
            <Alert className={`mt-4 rounded-lg border flex items-center gap-2 ${
              uploadStatus.type === "success" ? "border-green-200 bg-green-50" :
              uploadStatus.type === "error" ? "border-red-200 bg-red-50" :
              "border-blue-200 bg-blue-50"
            }`}>
              {uploadStatus.type === "success" && <CheckCircle className="w-5 h-5 text-green-600" />}
              {uploadStatus.type === "error" && <AlertTriangle className="w-5 h-5 text-red-600" />}
              {uploadStatus.type === "loading" && <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
              <AlertDescription className={
                uploadStatus.type === "success" ? "text-green-700" :
                uploadStatus.type === "error" ? "text-red-700" :
                "text-blue-700"
              }>
                {uploadStatus.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* --- Email List --- */}
      {emailList.length > 0 && (
        <Card className="shadow-lg border">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                Email List <span className="font-normal text-base text-gray-500">({emailList.length})</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative rounded-lg border bg-white flex items-center px-2 py-1">
                  <Search className="w-4 h-4 text-gray-400 mr-1" />
                  <Input
                    type="text"
                    className="h-6 border-none focus:ring-0 p-0 bg-transparent w-32"
                    placeholder="Search email/name"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <Badge variant="outline" className="px-3">
                  {selectedEmailIds.size} selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmailList([])
                    setSelectedEmailIds(new Set())
                    setSearch("")
                    onEmailsSelected([])
                  }}
                >
                  <X className="w-4 h-4" /> Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Select All */}
              <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded font-medium">
                <Checkbox
                  id="select-all"
                  checked={filteredEmails.length > 0 && selectedEmailIds.size === filteredEmails.length}
                  indeterminate={selectedEmailIds.size > 0 && selectedEmailIds.size < filteredEmails.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
                <Label htmlFor="select-all">
                  Select All {filteredEmails.length > 0 && `(${filteredEmails.length})`}
                </Label>
                {search && (
                  <span className="text-xs text-gray-400 ml-3">
                    Showing search matches ({filteredEmails.length})
                  </span>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">✓</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(filteredEmails.length > 0 ? filteredEmails : emailList).map((email) => (
                      <TableRow key={email.id} className="hover:bg-blue-50 transition">
                        <TableCell>
                          <Checkbox
                            checked={selectedEmailIds.has(email.email)}
                            onCheckedChange={(checked) => handleEmailSelection(email, checked)}
                            aria-label={`Select ${email.email}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{email.email}</TableCell>
                        <TableCell className="truncate">{email.name}</TableCell>
                        <TableCell className="truncate">{email.company}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs px-2">
                            {email.source === "csv_upload"
                              ? "CSV"
                              : email.source === "manual_entry"
                                ? "Manual"
                                : "Database"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-gray-400">
                {filteredEmails.length} displayed / {emailList.length} total emails.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
