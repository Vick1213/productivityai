"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrainIcon, KeyIcon, ClockIcon, SettingsIcon } from "lucide-react";
import { toast } from "sonner";

/**
 * SettingsPage – /dashboard/settings
 * ---------------------------------------------------------------------
 * Enhanced preferences screen that lets the user:
 *   • Configure OpenAI API key and model for AI assistant
 *   • Set personal preferences / instructions for the AI assistant
 *   • Define a "Do-not-Disturb" sleep window (from / to)
 *   • Toggle experimental features
 *
 * Uses shadcn/ui primitives + Tailwind for quick styling.
 * Persists changes via POST /api/settings (wired to Prisma).
 */

const AI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Recommended)' },
  { value: 'gpt-4o', label: 'GPT-4o (Advanced)' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Fast)' },
];

export default function SettingsPage() {
  const [form, setForm] = useState({
    preferences: "",
    sleepStart: "22:00",
    sleepEnd: "07:00",
    openaiKey: "",
    openaiModel: "gpt-4o-mini",
    enableBeta: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setForm(data);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (checked: boolean) => setForm((p) => ({ ...p, enableBeta: checked }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success("Settings saved successfully!");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save settings");
      }
    } catch (error) {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl py-10">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-10 animate-fadeIn">
      <div className="space-y-6">
        {/* AI Assistant Settings */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainIcon className="h-5 w-5" />
              AI Assistant Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OpenAI Key */}
            <div>
              <Label htmlFor="openaiKey" className="mb-2 flex items-center gap-2">
                <KeyIcon className="h-4 w-4" />
                OpenAI API Key
              </Label>
              <Input
                type="password"
                id="openaiKey"
                name="openaiKey"
                value={form.openaiKey}
                onChange={handleChange}
                placeholder="sk-..."
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Your personal OpenAI API key for the AI assistant. Get one at{" "}
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  OpenAI Platform
                </a>
              </p>
            </div>

            {/* AI Model */}
            <div>
              <Label htmlFor="openaiModel" className="mb-2 block">
                AI Model
              </Label>
              <Select 
                value={form.openaiModel} 
                onValueChange={(value) => handleSelectChange('openaiModel', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Choose which AI model to use. GPT-4o Mini is recommended for most use cases.
              </p>
            </div>

            {/* AI Preferences */}
            <div>
              <Label htmlFor="preferences" className="mb-2 block">
                AI Assistant Instructions
              </Label>
              <Textarea
                id="preferences"
                name="preferences"
                value={form.preferences}
                onChange={handleChange}
                rows={4}
                placeholder="E.g. 'Focus on actionable insights', 'Prefer concise responses', 'Always include task priorities in suggestions'"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Custom instructions for how the AI assistant should behave and respond.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sleep Window */}
            <div>
              <Label className="mb-3 flex items-center gap-2">
                <ClockIcon className="h-4 w-4" />
                Do Not Disturb Hours
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sleepStart" className="mb-1 block text-sm">
                    Start time
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
                  <Label htmlFor="sleepEnd" className="mb-1 block text-sm">
                    End time
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
              <p className="text-sm text-muted-foreground mt-1">
                Set your quiet hours when you don't want to receive notifications.
              </p>
            </div>

            {/* Beta toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enableBeta" className="font-medium">
                  Enable beta features
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get early access to experimental features and improvements.
                </p>
              </div>
              <Switch id="enableBeta" checked={form.enableBeta} onCheckedChange={handleToggle} />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={saving}
            size="lg"
            className="w-full sm:w-auto"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}