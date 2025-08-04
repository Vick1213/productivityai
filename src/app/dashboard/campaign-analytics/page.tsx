'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  TrendingUp, 
  Users,
  Mail,
  MessageSquare,
  Calendar,
  Target,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import React from 'react';

interface CampaignStats {
  sent: number;
  opens: number;
  replies: number;
  positives: number;
  openRate: number;
  replyRate: number;
  positiveRate: number;
}

interface Goal {
  id: string;
  name: string;
  description: string | null;
  currentProgress: number;
  totalTarget: number;
  updatedAt: Date;
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  smartleadCampaignId: string;
  goals: Goal[];
  stats?: CampaignStats;
  lastSynced?: Date;
  organization?: {
    id: string;
    name: string;
  } | null;
  integrationAccount?: {
    externalId: string; // This is the client_id
  } | null;
}

// Helper function to extract stats from goals
function extractStatsFromGoals(goals: Goal[]): CampaignStats {
  const stats = {
    sent: 0,
    opens: 0,
    replies: 0,
    positives: 0,
    openRate: 0,
    replyRate: 0,
    positiveRate: 0
  };

  goals.forEach(goal => {
    switch (goal.name) {
      case 'Emails Sent':
        stats.sent = goal.currentProgress;
        break;
      case 'Opens Count':
        stats.opens = goal.currentProgress;
        break;
      case 'Replies Count':
        stats.replies = goal.currentProgress;
        break;
      case 'Positive Replies':
        stats.positives = goal.currentProgress;
        break;
      case 'Open Rate':
        stats.openRate = goal.currentProgress;
        break;
      case 'Reply Rate':
        stats.replyRate = goal.currentProgress;
        break;
      case 'Positive Rate':
        stats.positiveRate = goal.currentProgress;
        break;
    }
  });

  return stats;
}

interface ClientGroup {
  clientId: string;
  clientName: string;
  campaigns: Campaign[];
  combinedStats: CampaignStats;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const UPDATE_INTERVAL = 30 * 1000; // 30 seconds for real-time updates

// Memoized components for performance
const MemoizedStatCard = React.memo(({ title, value, icon: Icon, description, trend }: {
  title: string;
  value: string | number;
  icon: any;
  description?: string;
  trend?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {trend && <p className="text-xs text-green-600">{trend}</p>}
    </CardContent>
  </Card>
));

export default function CampaignAnalyticsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      
      // Filter only SmartLead campaigns and extract stats from goals
      const smartleadProjects = (data.projects || []).filter(
        (p: any) => p.smartleadCampaignId
      ).map((campaign: any) => {
        // Extract stats from goals for each campaign
        const stats = extractStatsFromGoals(campaign.goals || []);
        return {
          ...campaign,
          stats
        };
      });
      
      setCampaigns(smartleadProjects);
      
      // Group campaigns by client
      const clientMap = new Map<string, Campaign[]>();
      
      smartleadProjects.forEach((campaign: Campaign) => {
        // Use integrationAccount.externalId as clientId, or organization name as fallback
        const clientId = campaign.integrationAccount?.externalId || 'unknown';
        const clientName = campaign.organization?.name || `Client ${clientId}`;
        
        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, []);
        }
        clientMap.get(clientId)!.push(campaign);
      });
      
      // Create client groups with combined stats
      const groups: ClientGroup[] = Array.from(clientMap.entries()).map(([clientId, campaigns]) => {
        // Get client name from first campaign
        const clientName = campaigns[0]?.organization?.name || `Client ${clientId}`;
        
        // Combine stats from all campaigns in this client group
        const combinedStats = campaigns.reduce(
          (acc, campaign) => {
            if (campaign.stats) {
              acc.sent += campaign.stats.sent;
              acc.opens += campaign.stats.opens;
              acc.replies += campaign.stats.replies;
              acc.positives += campaign.stats.positives;
            }
            return acc;
          },
          { sent: 0, opens: 0, replies: 0, positives: 0, openRate: 0, replyRate: 0, positiveRate: 0 }
        );
        
        // Calculate percentages
        combinedStats.openRate = combinedStats.sent ? (combinedStats.opens / combinedStats.sent) * 100 : 0;
        combinedStats.replyRate = combinedStats.sent ? (combinedStats.replies / combinedStats.sent) * 100 : 0;
        combinedStats.positiveRate = combinedStats.sent ? (combinedStats.positives / combinedStats.sent) * 100 : 0;
        
        return {
          clientId,
          clientName,
          campaigns,
          combinedStats
        };
      });
      
      setClientGroups(groups);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshCampaignData = async (campaignId: string) => {
    setRefreshing(campaignId);
    try {
      const response = await fetch('/api/integrations/smartleads/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: campaignId }),
      });
      
      if (response.ok) {
        await fetchCampaigns();
      }
    } catch (error) {
      console.error('Error refreshing campaign data:', error);
    } finally {
      setRefreshing(null);
    }
  };

  const refreshClientData = async (clientGroup: ClientGroup) => {
    setRefreshing(clientGroup.clientId);
    try {
      // Refresh all campaigns in this client group
      await Promise.all(
        clientGroup.campaigns.map(campaign => 
          fetch('/api/integrations/smartleads/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: campaign.id }),
          })
        )
      );
      
      await fetchCampaigns();
    } catch (error) {
      console.error('Error refreshing client data:', error);
    } finally {
      setRefreshing(null);
    }
  };

  const getOverallStats = () => {
    const totals = clientGroups.reduce(
      (acc, clientGroup) => {
        acc.sent += clientGroup.combinedStats.sent;
        acc.opens += clientGroup.combinedStats.opens;
        acc.replies += clientGroup.combinedStats.replies;
        acc.positives += clientGroup.combinedStats.positives;
        return acc;
      },
      { sent: 0, opens: 0, replies: 0, positives: 0 }
    );

    return {
      ...totals,
      openRate: totals.sent ? (totals.opens / totals.sent) * 100 : 0,
      replyRate: totals.sent ? (totals.replies / totals.sent) * 100 : 0,
      positiveRate: totals.sent ? (totals.positives / totals.sent) * 100 : 0,
    };
  };

  const overallStats = getOverallStats();

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaign Analytics</h2>
          <p className="text-muted-foreground">Performance insights for your campaigns</p>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaign Analytics</h2>
          <p className="text-muted-foreground">Performance insights and metrics for your campaigns</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border rounded-lg">
            {['7d', '30d', '90d'].map((period) => (
              <Button
                key={period}
                variant={selectedTimeframe === period ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedTimeframe(period as '7d' | '30d' | '90d')}
                className="rounded-none first:rounded-l-lg last:rounded-r-lg"
              >
                {period === '7d' && '7 Days'}
                {period === '30d' && '30 Days'}
                {period === '90d' && '90 Days'}
              </Button>
            ))}
          </div>
          <Badge variant="outline" className="text-sm">
            {clientGroups.length} client{clientGroups.length !== 1 ? 's' : ''} · {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Overall Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MemoizedStatCard 
          title="Total Sent" 
          value={overallStats.sent.toLocaleString()} 
          icon={Mail} 
          description="Across all campaigns" 
        />

        <MemoizedStatCard 
          title="Open Rate" 
          value={`${overallStats.openRate.toFixed(1)}%`} 
          icon={TrendingUp} 
          description={`${overallStats.opens.toLocaleString()} total opens`} 
        />

        <MemoizedStatCard 
          title="Reply Rate" 
          value={`${overallStats.replyRate.toFixed(1)}%`} 
          icon={MessageSquare} 
          description={`${overallStats.replies.toLocaleString()} total replies`} 
        />

        <MemoizedStatCard 
          title="Positive Rate" 
          value={`${overallStats.positiveRate.toFixed(1)}%`} 
          icon={Target} 
          description={`${overallStats.positives.toLocaleString()} positive responses`} 
          trend="↑ 2.5%"
        />
      </div>

      {/* Campaign Performance Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Campaign Performance Overview
          </CardTitle>
          <CardDescription>
            Response rates and engagement metrics across all campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clientGroups.map((clientGroup) => (
              <div key={clientGroup.clientId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{clientGroup.clientName}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {clientGroup.campaigns.length} campaign{clientGroup.campaigns.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground">Open Rate</span>
                      <span className="font-medium">{clientGroup.combinedStats.openRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={clientGroup.combinedStats.openRate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground">Reply Rate</span>
                      <span className="font-medium">{clientGroup.combinedStats.replyRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={clientGroup.combinedStats.replyRate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-muted-foreground">Positive Rate</span>
                      <span className="font-medium text-green-600">{clientGroup.combinedStats.positiveRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={clientGroup.combinedStats.positiveRate} className="h-2 [&>div]:bg-green-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Client Campaign Groups */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold">Client Campaign Performance</h3>
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {clientGroups.map((clientGroup) => (
            <Card key={clientGroup.clientId} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      {clientGroup.clientName}
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {clientGroup.campaigns.length} campaign{clientGroup.campaigns.length !== 1 ? 's' : ''} combined
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant={refreshing === clientGroup.clientId ? "secondary" : "outline"}
                    onClick={() => refreshClientData(clientGroup)}
                    disabled={refreshing === clientGroup.clientId}
                    className="ml-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing === clientGroup.clientId ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Combined Stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">
                      {clientGroup.combinedStats.sent.toLocaleString()}
                    </div>
                    <div className="text-xs text-blue-600">Total Emails Sent</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {clientGroup.combinedStats.opens.toLocaleString()}
                    </div>
                    <div className="text-xs text-green-600">
                      Opens ({clientGroup.combinedStats.openRate.toFixed(1)}%)
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-yellow-600">
                      {clientGroup.combinedStats.replies.toLocaleString()}
                    </div>
                    <div className="text-xs text-yellow-600">
                      Replies ({clientGroup.combinedStats.replyRate.toFixed(1)}%)
                    </div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">
                      {clientGroup.combinedStats.positives.toLocaleString()}
                    </div>
                    <div className="text-xs text-purple-600">
                      Positive ({clientGroup.combinedStats.positiveRate.toFixed(1)}%)
                    </div>
                  </div>
                </div>

                {/* Individual Campaigns */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    Individual Campaigns
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {clientGroup.campaigns.map((campaign) => (
                      <div key={campaign.id} className="bg-gray-50 p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{campaign.name}</span>
                          <Badge variant="outline" className="text-xs">
                            ID: {campaign.smartleadCampaignId}
                          </Badge>
                        </div>
                        {campaign.stats && (
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div className="text-center">
                              <div className="font-bold text-blue-600">{campaign.stats.sent}</div>
                              <div className="text-muted-foreground">Sent</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-green-600">{campaign.stats.openRate.toFixed(1)}%</div>
                              <div className="text-muted-foreground">Opens</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-yellow-600">{campaign.stats.replyRate.toFixed(1)}%</div>
                              <div className="text-muted-foreground">Replies</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-purple-600">{campaign.stats.positiveRate.toFixed(1)}%</div>
                              <div className="text-muted-foreground">Positive</div>
                            </div>
                          </div>
                        )}
                        
                        {/* Campaign Goals/Metrics */}
                        {campaign.goals && campaign.goals.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-xs text-muted-foreground mb-2">Goals Progress</div>
                            {campaign.goals.slice(0, 2).map((goal) => (
                              <div key={goal.id} className="mb-2 last:mb-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium">{goal.name}</span>
                                  <span className="text-xs font-bold">
                                    {goal.currentProgress.toLocaleString()}
                                  </span>
                                </div>
                                <Progress 
                                  value={goal.totalTarget > 0 ? (goal.currentProgress / goal.totalTarget) * 100 : 0} 
                                  className="h-1"
                                />
                              </div>
                            ))}
                            {campaign.goals.length > 2 && (
                              <div className="text-xs text-muted-foreground text-center">
                                +{campaign.goals.length - 2} more goals
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {clientGroups.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <PieChart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Campaign Data</h3>
            <p className="text-muted-foreground">
              No SmartLead campaigns found. Contact your administrator to set up campaign tracking.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
