"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function RegisterForm({ onRegister }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "marketer",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isValid, setIsValid] = useState(false);

  // Basic client-side validation
  useEffect(() => {
    const isEmailValid = /\S+@\S+\.\S+/.test(formData.email.trim());
    const isPasswordValid = formData.password.trim().length >= 6;
    const isNameValid = formData.name.trim().length > 0;
    setIsValid(isEmailValid && isPasswordValid && isNameValid);
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) {
      setError("Please fill all fields correctly.");
      return;
    }
    setLoading(true);
    setError("");

    // Prepare trimmed data
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: formData.role,
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        onRegister(data.user, data.token);
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-indigo-600 via-purple-700 to-pink-700 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20">
        <CardHeader className="pt-10 px-8">
          <CardTitle className="text-3xl font-extrabold text-gray-900 text-center leading-tight">
            Register
          </CardTitle>
          <CardDescription className="text-center text-gray-600 mt-1">
            Create an account to start building email campaigns
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-10 pt-6">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {error && (
              <Alert variant="destructive" className="mb-4" role="alert" aria-live="assertive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="name" className="font-medium text-gray-700">
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                autoComplete="name"
                aria-invalid={error && formData.name.trim() === ""}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <Label htmlFor="email" className="font-medium text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                aria-invalid={error && !/\S+@\S+\.\S+/.test(formData.email)}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <Label htmlFor="password" className="font-medium text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
                aria-invalid={error && formData.password.trim().length < 6}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500"
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="role" className="font-medium text-gray-700">
                Role
              </Label>
              <Select
                id="role"
                value={formData.role}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, role: val }))}
                aria-labelledby="role"
                className="mt-1 w-full"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketer">Marketer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={loading || !isValid}
              className="w-full flex justify-center items-center gap-2"
              aria-disabled={loading || !isValid}
              aria-busy={loading}
            >
              {loading && <Loader2 className="animate-spin h-4 w-4" aria-hidden="true" />}
              Create Account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
