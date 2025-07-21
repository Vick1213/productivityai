"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface EmailPreferences {
  enableEmailReminders: boolean;
  reminderHours: number;
  onlyHighPriority: boolean;
}

interface EligibleTask {
  id: string;
  name: string;
  dueAt: string;
  priority: string;
  project?: string;
  organization?: string;
}

export function EmailNotificationSettings() {
  const [preferences, setPreferences] = useState<EmailPreferences>({
    enableEmailReminders: true,
    reminderHours: 24,
    onlyHighPriority: true
  });
  const [eligibleTasks, setEligibleTasks] = useState<EligibleTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [serviceRunning, setServiceRunning] = useState(false);

  const fetchEligibleTasks = async () => {
    try {
      const response = await fetch('/api/notifications/email');
      if (response.ok) {
        const data = await response.json();
        setEligibleTasks(data.eligibleTasks || []);
      }
    } catch (error) {
      console.error('Error fetching eligible tasks:', error);
    }
  };

  const manageEmailService = async (action: 'start' | 'stop' | 'check') => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/email-service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        
        if (action === 'start') {
          setServiceRunning(true);
        } else if (action === 'stop') {
          setServiceRunning(false);
        } else if (action === 'check') {
          await fetchEligibleTasks();
        }
      } else {
        toast.error('Failed to manage email service');
      }
    } catch (error) {
      toast.error('Error managing email service');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/email', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        await fetchEligibleTasks();
      } else {
        toast.error('Failed to send email notifications');
      }
    } catch (error) {
      toast.error('Error sending email notifications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEligibleTasks();
  }, []);

  const formatDueDate = (dueAt: string) => {
    const date = new Date(dueAt);
    const now = new Date();
    const isOverdue = date < now;
    const hoursUntilDue = Math.abs(date.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return {
      text: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }),
      isOverdue,
      hoursUntilDue: Math.round(hoursUntilDue)
    };
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold mb-2">Email Notifications</h2>
        <p className="text-muted-foreground">
          Configure email reminders for your high priority tasks
        </p>
      </div>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Service Status
          </CardTitle>
          <CardDescription>
            Manage the automated email reminder service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base">Service Status</Label>
              <p className="text-sm text-muted-foreground">
                The email service checks for high priority tasks every 2 hours
              </p>
            </div>
            <Badge variant={serviceRunning ? "default" : "secondary"}>
              {serviceRunning ? "Running" : "Stopped"}
            </Badge>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <Button 
              onClick={() => manageEmailService('start')}
              disabled={loading || serviceRunning}
              variant="default"
              size="sm"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Start Service
            </Button>
            
            <Button 
              onClick={() => manageEmailService('stop')}
              disabled={loading || !serviceRunning}
              variant="outline"
              size="sm"
            >
              Stop Service
            </Button>
            
            <Button 
              onClick={() => manageEmailService('check')}
              disabled={loading}
              variant="secondary"
              size="sm"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Check Now
            </Button>
            
            <Button 
              onClick={sendTestEmail}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              Send Test Emails
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Email Preferences
          </CardTitle>
          <CardDescription>
            Configure when and how you receive email reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enable-emails" className="text-base">
                Enable Email Reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications for due tasks
              </p>
            </div>
            <Switch
              id="enable-emails"
              checked={preferences.enableEmailReminders}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, enableEmailReminders: checked }))
              }
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="high-priority-only" className="text-base">
                High Priority Only
              </Label>
              <p className="text-sm text-muted-foreground">
                Only send emails for HIGH priority tasks
              </p>
            </div>
            <Switch
              id="high-priority-only"
              checked={preferences.onlyHighPriority}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, onlyHighPriority: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Eligible Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Tasks Eligible for Email Reminders
            <Badge variant="secondary">{eligibleTasks.length}</Badge>
          </CardTitle>
          <CardDescription>
            These high priority tasks will receive email reminders based on your settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eligibleTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No tasks need email reminders</p>
              <p className="text-sm">All your high priority tasks are on track!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {eligibleTasks.map((task) => {
                const dueInfo = formatDueDate(task.dueAt);
                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border ${
                      dueInfo.isOverdue 
                        ? 'border-red-200 bg-red-50' 
                        : dueInfo.hoursUntilDue <= 2
                        ? 'border-orange-200 bg-orange-50'
                        : 'border-yellow-200 bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{task.name}</h4>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {dueInfo.text}
                          </span>
                          {task.project && (
                            <span>📁 {task.project}</span>
                          )}
                          {task.organization && (
                            <span>🏢 {task.organization}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge 
                          variant={task.priority === 'HIGH' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {task.priority}
                        </Badge>
                        {dueInfo.isOverdue ? (
                          <Badge variant="destructive" className="text-xs">
                            OVERDUE
                          </Badge>
                        ) : dueInfo.hoursUntilDue <= 2 ? (
                          <Badge variant="default" className="text-xs bg-orange-500">
                            URGENT
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            DUE SOON
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="font-medium text-foreground">
              Make sure you are signed in and your admin has allowed you to use this service.
            </p>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> Email reminders are sent at most once every 12-24 hours per task to avoid spam.
              The service automatically checks for eligible tasks every 2 hours.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
