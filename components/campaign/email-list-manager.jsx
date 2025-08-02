"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Download, Users, Mail, FileText, CheckCircle, AlertTriangle, X } from "lucide-react"
import Papa from "papaparse"

function EmailListManager({ onEmailsSelected, selectedEmails = [] }) {
  const [activeTab, setActiveTab] = useState("upload")
  const [emailList, setEmailList] = useState([])
  const [manualEmails, setManualEmails] = useState("")
  const [uploadStatus, setUploadStatus] = useState(null)
  const [selectedEmailIds, setSelectedEmailIds] = useState(new Set(selectedEmails.map(e => e.email)))
  const fileInputRef = useRef(null)

  // Handle CSV file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploadStatus({ type: "loading", message: "Processing file..." })

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const emails = results.data.map((row, index) => {
            // Try different column name variations
            const email = row.email || row.Email || row.EMAIL || 
                         row['Email Address'] || row['email_address'] || 
                         Object.values(row)[0] // First column if no header match

            const name = row.name || row.Name || row.NAME || 
                        row['Full Name'] || row.fullname || row.full_name ||
                        row.firstName || row.first_name || row['First Name'] ||
                        email?.split('@')[0] // Use email prefix as fallback

            const company = row.company || row.Company || row.COMPANY || 
                           row.organization || row.Organization || ""

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!email || !emailRegex.test(email)) {
              return null // Skip invalid emails
            }

            return {
              id: `email_${index}`,
              email: email.toLowerCase().trim(),
              name: name?.trim() || email.split('@')[0],
              company: company?.trim() || "",
              source: "csv_upload",
              uploadedAt: new Date().toISOString()
            }
          }).filter(Boolean) // Remove null entries

          // Remove duplicates
          const uniqueEmails = emails.filter((email, index, self) => 
            index === self.findIndex(e => e.email === email.email)
          )

          setEmailList(uniqueEmails)
          setUploadStatus({ 
            type: "success", 
            message: `Successfully imported ${uniqueEmails.length} unique emails` 
          })

          // Auto-select all uploaded emails
          const newSelectedIds = new Set(uniqueEmails.map(e => e.email))
          setSelectedEmailIds(newSelectedIds)
          onEmailsSelected(uniqueEmails)

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
          message: `Error reading file: ${error.message}` 
        })
      }
    })
  }

  // Handle manual email entry
  const handleManualEmails = () => {
    if (!manualEmails.trim()) return

    const lines = manualEmails.split('\n').filter(line => line.trim())
    const emails = []

    lines.forEach((line, index) => {
      const parts = line.split(',').map(p => p.trim())
      const email = parts[0]
      const name = parts[1] || email.split('@')[0]
      const company = parts[2] || ""

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (email && emailRegex.test(email)) {
        emails.push({
          id: `manual_${index}`,
          email: email.toLowerCase(),
          name,
          company,
          source: "manual_entry",
          uploadedAt: new Date().toISOString()
        })
      }
    })

    // Remove duplicates and merge with existing
    const allEmails = [...emailList, ...emails]
    const uniqueEmails = allEmails.filter((email, index, self) => 
      index === self.findIndex(e => e.email === email.email)
    )

    setEmailList(uniqueEmails)
    setManualEmails("")
    setUploadStatus({ 
      type: "success", 
      message: `Added ${emails.length} emails manually` 
    })
  }

  // Handle email selection
  const handleEmailSelection = (email, checked) => {
    const newSelectedIds = new Set(selectedEmailIds)
    
    if (checked) {
      newSelectedIds.add(email.email)
    } else {
      newSelectedIds.delete(email.email)
    }
    
    setSelectedEmailIds(newSelectedIds)
    
    const selectedEmailObjects = emailList.filter(e => newSelectedIds.has(e.email))
    onEmailsSelected(selectedEmailObjects)
  }

  // Select all emails
  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = new Set(emailList.map(e => e.email))
      setSelectedEmailIds(allIds)
      onEmailsSelected(emailList)
    } else {
      setSelectedEmailIds(new Set())
      onEmailsSelected([])
    }
  }

  // Download sample CSV template
  const downloadTemplate = () => {
    const csvContent = "email,name,company\njohn@example.com,John Doe,Acme Corp\njane@example.com,Jane Smith,Tech Inc"
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'email_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Email List Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">📁 Upload CSV</TabsTrigger>
              <TabsTrigger value="manual">✏️ Manual Entry</TabsTrigger>
              <TabsTrigger value="database">🗄️ From Database</TabsTrigger>
            </TabsList>

            {/* CSV Upload Tab */}
            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Upload Email List</h3>
                <p className="text-gray-600 mb-4">
                  Upload a CSV file with email addresses, names, and company info
                </p>
                
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose CSV File
                  </Button>
                  <Button variant="outline" onClick={downloadTemplate}>
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
              </div>

              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">CSV Format Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>First row should contain headers: <code>email, name, company</code></li>
                  <li>Email column is required, name and company are optional</li>
                  <li>Supported formats: .csv files only</li>
                  <li>Maximum 10,000 emails per upload</li>
                </ul>
              </div>
            </TabsContent>

            {/* Manual Entry Tab */}
            <TabsContent value="manual" className="space-y-4">
              <div>
                <Label htmlFor="manual-emails">Enter Email Addresses</Label>
                <Textarea
                  id="manual-emails"
                  value={manualEmails}
                  onChange={(e) => setManualEmails(e.target.value)}
                  placeholder="john@example.com, John Doe, Acme Corp&#10;jane@example.com, Jane Smith, Tech Inc&#10;bob@example.com, Bob Wilson"
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: email, name, company (one per line). Name and company are optional.
                </p>
              </div>
              
              <Button onClick={handleManualEmails} disabled={!manualEmails.trim()}>
                <Mail className="w-4 h-4 mr-2" />
                Add Emails
              </Button>
            </TabsContent>

            {/* Database Tab */}
            <TabsContent value="database" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>User Segment</Label>
                  <Select onValueChange={(value) => {
                    // Load emails from database segment
                    console.log("Loading segment:", value)
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user segment" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="all_users" className="hover:bg-gray-100">All Users</SelectItem>
                      <SelectItem value="new_signups" className="hover:bg-gray-100">New Signups (Last 30 days)</SelectItem>
                      <SelectItem value="trial_users" className="hover:bg-gray-100">Trial Users</SelectItem>
                      <SelectItem value="paying_customers" className="hover:bg-gray-100">Paying Customers</SelectItem>
                      <SelectItem value="inactive_users" className="hover:bg-gray-100">Inactive Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Max Recipients</Label>
                  <Input type="number" placeholder="1000" />
                </div>
              </div>
              
              <Button>
                <Users className="w-4 h-4 mr-2" />
                Load from Database
              </Button>
            </TabsContent>
          </Tabs>

          {/* Upload Status */}
          {uploadStatus && (
            <Alert className={`mt-4 ${
              uploadStatus.type === "success" ? "border-green-200 bg-green-50" :
              uploadStatus.type === "error" ? "border-red-200 bg-red-50" :
              "border-blue-200 bg-blue-50"
            }`}>
              <div className="flex items-center gap-2">
                {uploadStatus.type === "success" && <CheckCircle className="w-4 h-4 text-green-600" />}
                {uploadStatus.type === "error" && <AlertTriangle className="w-4 h-4 text-red-600" />}
                {uploadStatus.type === "loading" && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                <AlertDescription className={
                  uploadStatus.type === "success" ? "text-green-700" :
                  uploadStatus.type === "error" ? "text-red-700" :
                  "text-blue-700"
                }>
                  {uploadStatus.message}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Email List Display */}
      {emailList.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email List ({emailList.length} total)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {selectedEmailIds.size} selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmailList([])
                    setSelectedEmailIds(new Set())
                    onEmailsSelected([])
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Select All Checkbox */}
              <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                <Checkbox
                  id="select-all"
                  checked={selectedEmailIds.size === emailList.length && emailList.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="font-medium">
                  Select All ({emailList.length} emails)
                </Label>
              </div>

              {/* Email Table */}
              <div className="max-h-96 overflow-y-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailList.map((email) => (
                      <TableRow key={email.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedEmailIds.has(email.email)}
                            onCheckedChange={(checked) => handleEmailSelection(email, checked)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{email.email}</TableCell>
                        <TableCell>{email.name}</TableCell>
                        <TableCell>{email.company}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {email.source === "csv_upload" ? "CSV" : 
                             email.source === "manual_entry" ? "Manual" : "Database"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default EmailListManager