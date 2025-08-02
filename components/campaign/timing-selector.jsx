import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertTriangle, CheckCircle } from "lucide-react"

function TimingSelector({ value = { value: 2, unit: "minutes" }, onChange }) {
  const [timing, setTiming] = useState(value)

  const handleChange = (field, newValue) => {
    const updated = { ...timing, [field]: newValue }
    setTiming(updated)
    onChange(updated)
  }

  const getTimingWarning = () => {
    const totalMinutes = timing.unit === "minutes" ? timing.value :
                        timing.unit === "hours" ? timing.value * 60 :
                        timing.unit === "days" ? timing.value * 24 * 60 :
                        timing.value * 7 * 24 * 60

    if (totalMinutes < 1) {
      return { type: "error", message: "Minimum interval is 1 minute" }
    } else if (totalMinutes < 5) {
      return { type: "warning", message: "Very short intervals may trigger spam filters" }
    } else if (totalMinutes < 60) {
      return { type: "info", message: "Good for urgent campaigns (flash sales, breaking news)" }
    } else {
      return { type: "success", message: "Optimal timing for regular campaigns" }
    }
  }

  const warning = getTimingWarning()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="timing-value">Wait Duration</Label>
          <Input
            id="timing-value"
            type="number"
            min="1"
            max="999"
            value={timing.value}
            onChange={(e) => handleChange("value", parseInt(e.target.value) || 1)}
            placeholder="2"
          />
        </div>
        <div>
          <Label htmlFor="timing-unit">Time Unit</Label>
          <Select
            value={timing.unit}
            onValueChange={(value) => handleChange("unit", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              <SelectItem value="minutes" className="hover:bg-gray-100">Minutes</SelectItem>
              <SelectItem value="hours" className="hover:bg-gray-100">Hours</SelectItem>
              <SelectItem value="days" className="hover:bg-gray-100">Days</SelectItem>
              <SelectItem value="weeks" className="hover:bg-gray-100">Weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Presets */}
      <div>
        <Label className="text-sm">Quick Presets</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {[
            { label: "2 min", value: 2, unit: "minutes" },
            { label: "5 min", value: 5, unit: "minutes" },
            { label: "15 min", value: 15, unit: "minutes" },
            { label: "1 hour", value: 1, unit: "hours" },
            { label: "1 day", value: 1, unit: "days" },
            { label: "1 week", value: 1, unit: "weeks" },
          ].map((preset) => (
            <Badge
              key={preset.label}
              variant={timing.value === preset.value && timing.unit === preset.unit ? "default" : "outline"}
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => {
                setTiming(preset)
                onChange(preset)
              }}
            >
              {preset.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Timing Preview */}
      <div className={`p-4 rounded-lg ${
        warning.type === "error" ? "bg-red-50" :
        warning.type === "warning" ? "bg-yellow-50" :
        warning.type === "info" ? "bg-blue-50" :
        "bg-green-50"
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <Clock className={`w-4 h-4 ${
            warning.type === "error" ? "text-red-600" :
            warning.type === "warning" ? "text-yellow-600" :
            warning.type === "info" ? "text-blue-600" :
            "text-green-600"
          }`} />
          <h4 className={`font-medium ${
            warning.type === "error" ? "text-red-900" :
            warning.type === "warning" ? "text-yellow-900" :
            warning.type === "info" ? "text-blue-900" :
            "text-green-900"
          }`}>
            Timing Preview
          </h4>
        </div>
        <p className={`text-sm ${
          warning.type === "error" ? "text-red-700" :
          warning.type === "warning" ? "text-yellow-700" :
          warning.type === "info" ? "text-blue-700" :
          "text-green-700"
        }`}>
          Emails will be sent <strong>{timing.value} {timing.unit}</strong> after the previous step
        </p>
        <p className={`text-xs mt-1 ${
          warning.type === "error" ? "text-red-600" :
          warning.type === "warning" ? "text-yellow-600" :
          warning.type === "info" ? "text-blue-600" :
          "text-green-600"
        }`}>
          {warning.type === "error" && <AlertTriangle className="w-3 h-3 inline mr-1" />}
          {warning.type === "warning" && <AlertTriangle className="w-3 h-3 inline mr-1" />}
          {warning.type === "success" && <CheckCircle className="w-3 h-3 inline mr-1" />}
          {warning.message}
        </p>
      </div>

      {/* Use Cases */}
      <div className="text-xs text-gray-600">
        <p className="font-medium mb-1">Common Use Cases:</p>
        <ul className="space-y-1">
          <li><strong>1-5 minutes:</strong> Flash sales, breaking news, urgent alerts</li>
          <li><strong>15-30 minutes:</strong> Event reminders, time-sensitive offers</li>
          <li><strong>1-6 hours:</strong> Follow-ups, abandoned cart recovery</li>
          <li><strong>1-7 days:</strong> Nurture sequences, onboarding series</li>
        </ul>
      </div>
    </div>
  )
}

export default TimingSelector