"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

/**
 * SettingsPage – /dashboard/settings
 * ---------------------------------------------------------------------
 * A simple preferences screen that lets the user:
 *   • jot down free-form preferences / instructions for the AI assistant
 *   • define a "Do-not-Disturb" sleep window (from / to)
 *   • save an OpenAI API key (masked)
 *   • toggle experimental features
 *
 * Uses shadcn/ui primitives + Tailwind for quick styling.
 * Persists changes via POST /api/settings (you can wire this to Prisma).
 */

export default function SettingsPage() {
  const [form, setForm] = useState({
    preferences: "",
    sleepStart: "22:00",
    sleepEnd: "07:00",
    openaiKey: "",
    enableBeta: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (checked: boolean) => setForm((p) => ({ ...p, enableBeta: checked }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast.success("Settings saved!");
    } else {
      toast.error("Something went wrong. Try again.");
    }
  };

  return (
    <div className="container mx-auto max-w-3xl py-10 animate-fadeIn">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Preferences &amp; Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Preferences */}
            <div>
              <Label htmlFor="preferences" className="mb-1 block">
                Personal preferences / prompts
              </Label>
              <Textarea
                id="preferences"
                name="preferences"
                value={form.preferences}
                onChange={handleChange}
                rows={4}
                placeholder="E.g. ‟Only schedule deep-work blocks between 9-12 am″"
              />
            </div>

            {/* Sleep Window */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sleepStart" className="mb-1 block">
                  Sleep start
                </Label>
                <Input
                  type="time"
                  id="sleepStart"
                  name="sleepStart"
                  value={form.sleepStart}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="sleepEnd" className="mb-1 block">
                  Sleep end
                </Label>
                <Input
                  type="time"
                  id="sleepEnd"
                  name="sleepEnd"
                  value={form.sleepEnd}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* OpenAI Key */}
            <div>
              <Label htmlFor="openaiKey" className="mb-1 block">
                OpenAI API key
              </Label>
              <Input
                type="password"
                id="openaiKey"
                name="openaiKey"
                value={form.openaiKey}
                onChange={handleChange}
                placeholder="sk-..."
              />
            </div>

            {/* Beta toggle */}
            <div className="flex items-center gap-3">
              <Switch id="enableBeta" checked={form.enableBeta} onCheckedChange={handleToggle} />
              <Label htmlFor="enableBeta">Enable beta features</Label>
            </div>

            <Button type="submit" className="w-full sm:w-auto">
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );}