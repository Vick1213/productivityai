'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  Mail, 
  MessageSquare, 
  User,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

interface CampaignReply {
  id: string;
  leadName: string;
  leadEmail: string;
  status: 'REPLIED' | 'POSITIVE' | 'BOOKED_MEETING' | 'NEGATIVE' | 'NO_RESPONSE';
  replyContent?: string;
  createdAt: string;
  updatedAt: string;
  bookedMeeting?: {
    id: string;
    meetingDate?: string;
    meetingTime?: string;
    meetingLink?: string;
    notes?: string;
  };
}

interface CampaignDetailsProps {
  projectId: string;
  projectName: string;
  smartleadCampaignId?: string;
  isOpen: boolean;
  onClose: () => void;
}



export function CampaignDetailsDialog({
  projectId,
  projectName,
  smartleadCampaignId,
  isOpen,
  onClose
}: CampaignDetailsProps) {
  const [replies, setReplies] = useState<CampaignReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [count, setCount] = useState({
    total: 0,
    positive: 0,
    replied: 0,
    bookedMeetings: 0
  });
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const fetchReplies = async (sync = false) => {
    if (sync) setSyncing(true);
    else setLoading(true);

    try {
      const url = `/api/campaigns/${projectId}/replies${sync ? '?sync=true' : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setReplies(data.replies || []);
        setCount(data.count || { total: 0, positive: 0, replied: 0, bookedMeetings: 0 });
        if (data.lastSynced) {
          setLastSynced(data.lastSynced);
        }
      } else {
        console.error('Failed to fetch replies:', data.error);
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReplies();
    }
  }, [isOpen, projectId]);

  const handleSyncFromSmartlead = () => {
    fetchReplies(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'POSITIVE':
        return <Badge variant="default" className="bg-green-100 text-green-800">Positive</Badge>;
      case 'REPLIED':
        return <Badge variant="secondary">Replied</Badge>;
      case 'BOOKED_MEETING':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Meeting Booked</Badge>;
      case 'NEGATIVE':
        return <Badge variant="destructive">Negative</Badge>;
      default:
        return <Badge variant="outline">No Response</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Campaign Details: {projectName}
          </DialogTitle>
          <DialogDescription>
            {smartleadCampaignId && (
              <span className="text-sm text-muted-foreground">
                SmartLead Campaign ID: {smartleadCampaignId}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{count.total}</div>
              <div className="text-sm text-blue-600">Total Replies</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{count.positive}</div>
              <div className="text-sm text-green-600">Positive</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{count.replied}</div>
              <div className="text-sm text-yellow-600">Replied</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{count.bookedMeetings}</div>
              <div className="text-sm text-purple-600">Meetings</div>
            </div>
          </div>

          {/* Sync Button */}
          {smartleadCampaignId && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Sync with SmartLead</p>
                <p className="text-xs text-muted-foreground">
                  {lastSynced ? `Last synced: ${format(new Date(lastSynced), 'PPp')}` : 'Never synced'}
                </p>
              </div>
              <Button
                onClick={handleSyncFromSmartlead}
                disabled={syncing}
                size="sm"
                className="gap-2 min-w-[100px]"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
              </Button>
            </div>
          )}

          {/* Replies List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Campaign Replies
            </h3>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : replies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No replies found for this campaign</p>
                {smartleadCampaignId && (
                  <p className="text-sm">Try syncing with SmartLead to fetch latest data</p>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {replies.map((reply) => (
                  <div key={reply.id} className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{reply.leadName}</p>
                          <p className="text-sm text-muted-foreground">{reply.leadEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(reply.status)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Navigate to detailed view
                            window.location.href = `/dashboard/campaigns/${projectId}/leads/${encodeURIComponent(reply.leadEmail)}`;
                          }}
                          className="gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Details
                        </Button>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground mt-2">
                      Added: {format(new Date(reply.createdAt), 'PPp')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
