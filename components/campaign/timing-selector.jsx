import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";

function TimingSelector({ value = { value: 2, unit: "minutes" }, onChange }) {
  const [timing, setTiming] = useState(value);
  const [inputError, setInputError] = useState(null);

  // Sync internal state when value prop changes
  useEffect(() => {
    setTiming(value);
    setInputError(null);
  }, [value]);

  // Helper to calculate total minutes for validation and warnings
  const totalMinutes = (() => {
    const v = Number(timing.value);
    if (isNaN(v) || v < 1) return 0;
    switch (timing.unit) {
      case "minutes":
        return v;
      case "hours":
        return v * 60;
      case "days":
        return v * 24 * 60;
      case "weeks":
        return v * 7 * 24 * 60;
      default:
        return v;
    }
  })();

  // Determine warning/info/error message
  const getTimingWarning = () => {
    if (totalMinutes < 1) {
      return { type: "error", message: "Minimum interval is 1 minute" };
    } else if (totalMinutes < 5) {
      return {
        type: "warning",
        message: "Very short intervals may trigger spam filters",
      };
    } else if (totalMinutes < 60) {
      return { type: "info", message: "Good for urgent campaigns" };
    } else {
      return { type: "success", message: "Optimal timing for regular campaigns" };
    }
  };

  const warning = getTimingWarning();

  // Handler for number input, prevents invalid inputs and enforces minimum 1
  const handleValueChange = (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) {
      val = 1;
      setInputError("Value adjusted to minimum 1");
    } else if (val > 999) {
      val = 999;
      setInputError("Maximum value allowed is 999");
    } else {
      setInputError(null);
    }
    updateTiming("value", val);
  };

  const handleUnitChange = (unit) => {
    updateTiming("unit", unit);
  };

  const updateTiming = (field, newValue) => {
    const updated = { ...timing, [field]: newValue };
    setTiming(updated);
    onChange(updated);
  };

  // Presets for quick selection
  const presets = [
    { label: "2 min", value: 2, unit: "minutes" },
    { label: "5 min", value: 5, unit: "minutes" },
    { label: "15 min", value: 15, unit: "minutes" },
    { label: "1 hour", value: 1, unit: "hours" },
    { label: "1 day", value: 1, unit: "days" },
    { label: "1 week", value: 1, unit: "weeks" },
  ];

  return (
    <div className="space-y-5 font-sans max-w-lg mx-auto">
      <div className="grid grid-cols-2 gap-5">
        <div>
          <Label htmlFor="timing-value">Wait Duration</Label>
          <Input
            id="timing-value"
            type="number"
            min={1}
            max={999}
            step={1}
            value={timing.value}
            onChange={handleValueChange}
            aria-describedby="timing-error"
            aria-label="Timing value in number"
            className={warning.type === "error" ? "border-red-500" : ""}
          />
          {inputError && (
            <p
              id="timing-error"
              className="mt-1 text-xs text-red-600"
              role="alert"
            >
              {inputError}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="timing-unit">Time Unit</Label>
          <Select
            value={timing.unit}
            onValueChange={handleUnitChange}
            aria-label="Select time unit"
          >
            <SelectTrigger id="timing-unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg">
              <SelectItem value="minutes" className="hover:bg-gray-100">
                Minutes
              </SelectItem>
              <SelectItem value="hours" className="hover:bg-gray-100">
                Hours
              </SelectItem>
              <SelectItem value="days" className="hover:bg-gray-100">
                Days
              </SelectItem>
              <SelectItem value="weeks" className="hover:bg-gray-100">
                Weeks
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Presets */}
      <div>
        <Label className="text-sm font-medium">Quick Presets</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {presets.map((preset) => {
            const isActive =
              timing.value === preset.value && timing.unit === preset.unit;
            return (
              <Badge
                key={preset.label}
                variant={isActive ? "default" : "outline"}
                className="cursor-pointer select-none transition-colors duration-200 hover:bg-gray-100"
                onClick={() => {
                  setTiming(preset);
                  onChange(preset);
                  setInputError(null);
                }}
                aria-pressed={isActive}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setTiming(preset);
                    onChange(preset);
                    setInputError(null);
                  }
                }}
              >
                {preset.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Timing Preview and Warning */}
      <div
        className={`p-4 rounded-lg border-l-4 ${
          warning.type === "error"
            ? "bg-red-50 border-red-500 text-red-700"
            : warning.type === "warning"
            ? "bg-yellow-50 border-yellow-400 text-yellow-700"
            : warning.type === "info"
            ? "bg-blue-50 border-blue-400 text-blue-700"
            : "bg-green-50 border-green-400 text-green-700"
        } transition-colors duration-300`}
        role="region"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 mb-2">
          <Clock
            className={`w-5 h-5 ${
              warning.type === "error"
                ? "text-red-600"
                : warning.type === "warning"
                ? "text-yellow-600"
                : warning.type === "info"
                ? "text-blue-600"
                : "text-green-600"
            }`}
            aria-hidden="true"
          />
          <h4 className="font-semibold text-lg">Timing Preview</h4>
        </div>
        <p className="text-sm">
          Emails will be sent{" "}
          <strong>
            {timing.value} {timing.unit}
          </strong>{" "}
          after the previous step.
        </p>
        <p className="text-xs mt-1 flex items-center gap-1">
          {(warning.type === "error" || warning.type === "warning") && (
            <AlertTriangle
              className="w-4 h-4"
              aria-hidden="true"
              title="Warning"
            />
          )}
          {warning.type === "success" && (
            <CheckCircle
              className="w-4 h-4"
              aria-hidden="true"
              title="Good timing"
            />
          )}
          {warning.message}
        </p>
      </div>

      {/* Use Cases */}
      <div className="text-xs text-gray-600">
        <p className="font-semibold mb-1">Common Use Cases:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>1-5 minutes:</strong> Flash sales, breaking news, urgent
            alerts
          </li>
          <li>
            <strong>15-30 minutes:</strong> Event reminders, time-sensitive
            offers
          </li>
          <li>
            <strong>1-6 hours:</strong> Follow-ups, abandoned cart recovery
          </li>
          <li>
            <strong>1-7 days:</strong> Nurture sequences, onboarding series
          </li>
        </ul>
      </div>
    </div>
  );
}

export default TimingSelector;
