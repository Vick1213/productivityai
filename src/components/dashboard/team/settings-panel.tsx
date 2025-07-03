"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Check, 
  Loader2, 
  Save, 
  Users, 
  Building, 
  Link as LinkIcon,
  AlertTriangle,
  Lock
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@clerk/nextjs";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type Organization = {
  id: string;
  name: string;
  clientId?: string;
};

type SmartleadsCampaign = {
  id: string;
  name: string;
  isSelected: boolean;
};

const USER_ROLES = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "MEMBER", label: "Member" },
];

export function OrganizationSettingsPanel({ 
  organizationId 
}: { 
  organizationId: string;
}) {
    const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  
  // Organization state
  const [organization, setOrganization] = useState<Organization>({ id: organizationId, name: "" });

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [isOwner, setIsOwner] = useState(false);
  
  // Smartleads integration state
  const [smartleadsApiKey, setSmartleadsApiKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [isIntegrationValid, setIsIntegrationValid] = useState(false);
  const [campaigns, setCampaigns] = useState<SmartleadsCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // Load initial data
  useEffect(() => {
    fetchOrganizationData();
  }, [organizationId]);

  const fetchOrganizationData = async () => {
    setIsLoading(true);
    try {
      // Use the API from orgs/[orgId]/route.ts
      const orgResponse = await fetch(`/api/orgs/${organizationId}`);
      
      if (!orgResponse.ok) {
        throw new Error("Failed to load organization data");
      }
      
      const orgData = await orgResponse.json();
      
      setOrganization({
        id: orgData.id,
        name: orgData.name,
        clientId: orgData.clientId
      });
      
      // Set users from members array
      setUsers(orgData.members.map((member: any) => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        role: member.role || "MEMBER"
      })));
      
      // Find current user's role
      const currentUser = orgData.members.find((member: any) => member.id === userId);
      
      if (currentUser) {
        setCurrentUserRole(currentUser.role || "MEMBER");
        setIsOwner(currentUser.role === "OWNER");
      }
      
      // Fetch integration settings if available
      try {
        const integrationResponse = await fetch(`/api/orgs/${organizationId}/integrations`);
        if (integrationResponse.ok) {
          const integrationData = await integrationResponse.json();
          if (integrationData.smartleads) {
            setSmartleadsApiKey(integrationData.smartleads.apiKey || "");
            setClientId(integrationData.smartleads.clientId || "");
            setIsIntegrationValid(!!integrationData.smartleads.apiKey && !!integrationData.smartleads.clientId);
          }
        }
      } catch (error) {
        // Integration might not be set up yet, no need to show error
        console.log("No integration settings found");
      }
      
    } catch (error) {
      console.error("Failed to load organization data:", error);
      toast.error("Failed to load organization settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGeneralSettings = async () => {
    if (!isOwner) {
      toast.error("Only organization owners can update settings");
      return;
    }
    
    setIsSaving(true);
    try {
      // Need to implement a PATCH endpoint for /api/orgs/[orgId]
      const response = await fetch(`/api/orgs/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: organization.name, clientId: organization.clientId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update organization");
      }
      
      toast.success("Organization settings updated successfully");
    } catch (error) {
      console.error("Failed to update organization:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update organization settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    if (!isOwner) {
      toast.error("Only organization owners can change user roles");
      return;
    }

    // Validate the role value
    const validRoles = ["OWNER", "ADMIN", "MEMBER"];
    if (!validRoles.includes(newRole)) {
      toast.error(`Invalid role: ${newRole}. Must be one of: ${validRoles.join(", ")}`);
      return;
    }

    try {
      console.log(`Updating user ${userId} to role ${newRole}`);
      
      // Updated endpoint to match your API structure
      const response = await fetch(`/api/orgs/${organizationId}/members`, {
        method: "PATCH", // or POST depending on your API implementation
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: userId,
          role: newRole 
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error("Role update error response:", data);
        throw new Error(data.error || "Failed to update user role");
      }
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      toast.success("User role updated successfully");
    } catch (error) {
      console.error("Failed to update user role:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update user role");
    }
  };

  const handleVerifySmartleadsIntegration = async () => {
    if (!isOwner) {
      toast.error("Only organization owners can manage integrations");
      return;
    }

    if (!smartleadsApiKey || !clientId) {
      toast.error("API key and Client ID are required");
      return;
    }

    setLoadingCampaigns(true);
    try {
      // Would need to implement this endpoint
      const response = await fetch(`/api/integrations/smartleads/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          apiKey: smartleadsApiKey, 
          clientId: clientId,
          organizationId: organizationId
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to verify integration");
      }
      
      const data = await response.json();
      
      setIsIntegrationValid(true);
      setCampaigns(data.campaigns.map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        isSelected: false
      })));
      
      toast.success("SmartLeads integration verified successfully");
    } catch (error) {
      console.error("Failed to verify SmartLeads integration:", error);
      toast.error(error instanceof Error ? error.message : "Failed to verify integration");
      setIsIntegrationValid(false);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleSaveSmartleadsIntegration = async () => {
    if (!isOwner) {
      toast.error("Only organization owners can manage integrations");
      return;
    }

    setIsSaving(true);
    try {
      // Need to implement this endpoint
      const response = await fetch(`/api/orgs/${organizationId}/integrations/smartleads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: smartleadsApiKey,
          clientId: clientId,
          selectedCampaigns: campaigns.filter(c => c.isSelected).map(c => c.id)
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save integration");
      }
      
      toast.success("SmartLeads integration saved successfully");
    } catch (error) {
      console.error("Failed to save SmartLeads integration:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save integration settings");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCampaignSelection = (campaignId: string) => {
    setCampaigns(campaigns.map(campaign => 
      campaign.id === campaignId ? { ...campaign, isSelected: !campaign.isSelected } : campaign
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Access control notice component
  const OwnerOnlyBadge = () => (
    <Badge variant="outline" className="ml-2">
      <Lock className="w-3 h-3 mr-1" />
      Owner only
    </Badge>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        {!isOwner && (
          <Badge variant="secondary">
            <Lock className="w-4 h-4 mr-2" />
            View only mode - Contact an organization owner to make changes
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            <span>General</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            <span>Integrations</span>
          </TabsTrigger>
        </TabsList>
        
        {/* General Settings Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                General Settings
                {!isOwner && <OwnerOnlyBadge />}
              </CardTitle>
              <CardDescription>
                Manage your organization's basic information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={organization.name}
                  onChange={(e) => setOrganization({...organization, name: e.target.value})}
                  placeholder="Enter organization name"
                  disabled={!isOwner}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-id">Client ID (Optional)</Label>
                <Input
                  id="client-id"
                  value={organization.clientId || ""}
                  onChange={(e) => setOrganization({...organization, clientId: e.target.value})}
                  placeholder="Enter client ID (optional)"
                  disabled={!isOwner}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveGeneralSettings} 
                disabled={isSaving || !isOwner}
                className="ml-auto"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                User Permissions
                {!isOwner && <OwnerOnlyBadge />}
              </CardTitle>
              <CardDescription>
                Manage user roles and permissions within your organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    {isOwner && <TableHead className="w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {isOwner ? (
                          <Select 
                            defaultValue={user.role} 
                            onValueChange={(value) => handleUpdateUserRole(user.id, value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {USER_ROLES.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">
                            {user.role || "MEMBER"}
                          </Badge>
                        )}
                      </TableCell>
                      {isOwner && (
                        <TableCell>
                          <Button variant="outline" size="sm">
                            Remove
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter>
              {isOwner && (
                <Button className="ml-auto">
                  <Users className="w-4 h-4 mr-2" />
                  Invite Users
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                SmartLeads Integration
                {!isOwner && <OwnerOnlyBadge />}
              </CardTitle>
              <CardDescription>
                Connect your SmartLeads account to import campaigns and track performance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="api-key">SmartLeads API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={smartleadsApiKey}
                    onChange={(e) => setSmartleadsApiKey(e.target.value)}
                    placeholder="Enter your SmartLeads API key"
                    disabled={!isOwner}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-id">Client ID</Label>
                  <Input
                    id="client-id"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Enter your SmartLeads Client ID"
                    disabled={!isOwner}
                  />
                </div>
              </div>
              
              {isOwner && (
                <div className="flex justify-end">
                  <Button 
                    onClick={handleVerifySmartleadsIntegration}
                    disabled={!smartleadsApiKey || !clientId || loadingCampaigns}
                  >
                    {loadingCampaigns ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Verify & Load Campaigns
                      </>
                    )}
                  </Button>
                </div>
              )}

              {isIntegrationValid && (
                <div className="pt-4 border-t">
                  <h3 className="mb-4 font-medium">Select Campaigns to Import</h3>
                  
                  {campaigns.length === 0 ? (
                    <div className="flex items-center p-4 rounded-md bg-muted">
                      <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                      <p className="text-sm">No campaigns found in this SmartLeads account.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {campaigns.map((campaign) => (
                        <div key={campaign.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`campaign-${campaign.id}`}
                            checked={campaign.isSelected}
                            onCheckedChange={() => isOwner && toggleCampaignSelection(campaign.id)}
                            disabled={!isOwner}
                          />
                          <Label htmlFor={`campaign-${campaign.id}`} className="flex-1">
                            {campaign.name}
                          </Label>
                          <Badge variant="outline" className="ml-auto">
                            Campaign ID: {campaign.id}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            {isOwner && isIntegrationValid && (
              <CardFooter>
                <Button 
                  onClick={handleSaveSmartleadsIntegration} 
                  disabled={isSaving || !isIntegrationValid || campaigns.filter(c => c.isSelected).length === 0}
                  className="ml-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Integration Settings
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default OrganizationSettingsPanel;