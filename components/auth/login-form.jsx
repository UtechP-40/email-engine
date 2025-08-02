"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock } from "lucide-react"

export default function LoginForm({ onLogin }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))
        onLogin(data.user, data.token)
      } else {
        setError(data.error || "Login failed")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-600 via-purple-700 to-pink-700 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Optionally insert a logo or branding here */}
        <div className="text-center">
          <h1 className="text-white text-4xl font-extrabold tracking-tight sm:text-5xl">
            Welcome Back
          </h1>
          <p className="mt-2 text-indigo-200">
            Sign in to access your campaign dashboard
          </p>
        </div>

        <Card className="shadow-xl rounded-2xl border border-white/20 bg-white/90 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-3xl text-gray-900 text-center">
              Sign in
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Enter your email and password below
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="email" className="sr-only">
                  Email address
                </Label>
                <div className="relative rounded-md shadow-sm">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                    <Mail className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 focus:ring-indigo-500 focus:border-indigo-500"
                    aria-invalid={!!error}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="sr-only">
                  Password
                </Label>
                <div className="relative rounded-md shadow-sm">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                    <Lock className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 focus:ring-indigo-500 focus:border-indigo-500"
                    aria-invalid={!!error}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full flex justify-center py-3 text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 font-semibold rounded-lg transition"
                disabled={loading}
                aria-busy={loading}
              >
                {loading && (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" />
                )}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Optional footer or links */}
        <p className="text-center text-indigo-200 text-sm mt-4">
          &copy; {new Date().getFullYear()} Your Company. All rights reserved.
        </p>
      </div>
    </div>
  )
}
