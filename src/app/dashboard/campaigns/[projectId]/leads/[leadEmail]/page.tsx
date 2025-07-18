'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone,
  MapPin,
  Globe,
  Building,
  MessageSquare,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

interface LeadDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  companyName: string;
  website: string;
  location: string;
  customFields: any;
  linkedinProfile: string;
  companyUrl: string;
  isUnsubscribed: boolean;
  createdAt: string;
}

interface MessageHistoryItem {
  type: 'SENT' | 'REPLY';
  message_id: string;
  stats_id: string;
  time: string;
  email_body: string;
  subject?: string;
  email_seq_number?: string;
  open_count?: number;
  click_count?: number;
  click_details?: any;
}

interface MessageHistory {
  history: MessageHistoryItem[];
  from: string;
  to: string;
}

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { projectId, leadEmail } = params;

  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null);
  const [messageHistory, setMessageHistory] = useState<MessageHistory | null>(null);
  const [loadingLead, setLoadingLead] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId && leadEmail) {
      fetchLeadDetails();
    }
  }, [projectId, leadEmail]);

  const fetchLeadDetails = async () => {
    setLoadingLead(true);
    setError(null);
    try {
      const response = await fetch(`/api/campaigns/${projectId}/leads/${leadEmail}`);
      const data = await response.json();

      if (response.ok) {
        setLeadDetails(data.lead);
      } else {
        setError(data.message || data.error || 'Failed to fetch lead details');
      }
    } catch (error) {
      console.error('Error fetching lead details:', error);
      setError('Failed to fetch lead details');
    } finally {
      setLoadingLead(false);
    }
  };

  const fetchMessageHistory = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const response = await fetch(`/api/campaigns/${projectId}/leads/${leadEmail}/history`);
      const data = await response.json();

      if (response.ok) {
        setMessageHistory(data.messageHistory);
      } else {
        setHistoryError(data.message || data.error || 'Failed to fetch message history');
      }
    } catch (error) {
      console.error('Error fetching message history:', error);
      setHistoryError('Failed to fetch message history');
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Lead Details</h1>
      </div>

      {loadingLead ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : error ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <User className="h-5 w-5" />
                Lead Not Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {error}
                </p>
                <p className="text-sm text-muted-foreground">
                  This could happen if:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>The lead email was not found in your SmartLead account</li>
                  <li>The lead was deleted or merged in SmartLead</li>
                  <li>There's a mismatch between the reply email and the lead email</li>
                </ul>
                <div className="pt-4">
                  <Button 
                    onClick={() => {
                      setError(null);
                      fetchLeadDetails();
                    }}
                    variant="outline"
                    className="gap-2"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : leadDetails ? (
        <div className="space-y-6">
          {/* Lead Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {leadDetails.firstName} {leadDetails.lastName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm">{leadDetails.email}</span>
                  </div>

                  {leadDetails.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Phone:</span>
                      <span className="text-sm">{leadDetails.phoneNumber}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Company:</span>
                    <span className="text-sm">{leadDetails.companyName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Location:</span>
                    <span className="text-sm">{leadDetails.location}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {leadDetails.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Website:</span>
                      <a
                        href={leadDetails.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        {leadDetails.website}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {leadDetails.customFields?.linkedin_url && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">LinkedIn:</span>
                      <a
                        href={leadDetails.customFields.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        View Profile
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Added:</span>
                    <span className="text-sm">{format(new Date(leadDetails.createdAt), 'PPp')}</span>
                  </div>

                  {leadDetails.isUnsubscribed && (
                    <Badge variant="destructive">Unsubscribed</Badge>
                  )}
                </div>
              </div>

              {/* Custom Fields */}
              {leadDetails.customFields && Object.keys(leadDetails.customFields).length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium mb-3">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(leadDetails.customFields).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 capitalize">
                          {key.replace(/_/g, ' ')}:
                        </p>
                        <p className="text-sm">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message History Button */}
              <div className="mt-6 pt-6 border-t">
                <Button
                  onClick={fetchMessageHistory}
                  disabled={loadingHistory}
                  className="gap-2"
                >
                  <MessageSquare className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                  {loadingHistory ? 'Loading...' : 'Load Message History'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Message History */}
          {historyError && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <MessageSquare className="h-5 w-5" />
                  Message History Error
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {historyError}
                  </p>
                  <Button 
                    onClick={() => {
                      setHistoryError(null);
                      fetchMessageHistory();
                    }}
                    variant="outline"
                    className="gap-2"
                  >
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {messageHistory && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Message History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messageHistory.history.map((message, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        message.type === 'SENT'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              message.type === 'SENT' ? 'bg-blue-500' : 'bg-green-500'
                            }`}
                          />
                          <span className="text-sm font-medium">
                            {message.type === 'SENT' ? 'Sent' : 'Reply'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.time), 'PPp')}
                        </span>
                      </div>

                      {message.subject && (
                        <h4 className="font-medium text-sm mb-2">{message.subject}</h4>
                      )}

                      <div
                        className="text-sm text-gray-700 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: message.email_body }}
                      />

                      {message.type === 'SENT' && (message.open_count || message.click_count) && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {message.open_count && (
                              <span>Opens: {message.open_count}</span>
                            )}
                            {message.click_count && (
                              <span>Clicks: {message.click_count}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-muted-foreground">No lead data available</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
