'use client';

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { USER_ROLES_OPTIONS, ORGANIZATION_ROLES, canManageUsers } from "@/lib/constants/roles";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Building,
  Users,
  Link as LinkIcon,
  Loader2,
  Check,
  Save,
  AlertTriangle,
  Lock,
} from "lucide-react";

/* ──────────────── types ──────────────── */
type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type Organization = { id: string; name: string };

type SmartleadsClient = { id: string; name: string };

type SmartleadsCampaign = {
  id: string;
  name: string;
  isSelected: boolean;
};

// Use the imported USER_ROLES_OPTIONS instead of defining locally

/* ──────────────── component ──────────────── */
export function OrganizationSettingsPanel({
  organizationId,
}: {
  organizationId: string;
}) {
  const { userId } = useAuth();

  /* loading / saving */
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  /* organisation + members */
  const [organization, setOrganization] = useState<Organization>({
    id: organizationId,
    name: "",
  });
  const [users, setUsers] = useState<User[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  /* SmartLeads – step 1 */
  const [smartleadsApiKey, setSmartleadsApiKey] = useState("");
  const [clients, setClients] = useState<SmartleadsClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");

  /* SmartLeads – step 2 */
  const [campaigns, setCampaigns] = useState<SmartleadsCampaign[]>([]);
  const [loadingSmartleads, setLoadingSmartleads] = useState(false);
  const integrationReady =
    smartleadsApiKey &&
    selectedClientId &&
    campaigns.length > 0 &&
    campaigns.some((c) => c.isSelected);

  /* active tab */
  const [activeTab, setActiveTab] = useState("general");

  /* ────────── fetch organisation & members ────────── */
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/orgs/${organizationId}`);
        if (!res.ok) throw new Error("Failed to fetch organisation");

        const data = await res.json();
        setOrganization({ id: data.id, name: data.name });
        setUsers(
          data.members.map((m: any) => ({
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email,
            role: m.role || "MEMBER",
          })),
        );
        const me = data.members.find((m: any) => m.id === userId);
        setIsOwner(me?.role === "OWNER");
      } catch (e) {
        toast.error("Could not load organisation");
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  /* ────────── handlers ────────── */

  /** General tab */
  const handleSaveGeneral = async () => {
    if (!isOwner) return toast.error("Owner only");
    setIsSaving(true);
    try {
      const res = await fetch(`/api/orgs/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: organization.name }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success("Organisation updated");
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  /** SmartLeads: verify key / load clients or campaigns */
  const handleSmartleadsLoad = async () => {
    if (!isOwner) return toast.error("Owner only");
    if (!smartleadsApiKey) return toast.error("Enter your API key");

    setLoadingSmartleads(true);
    try {
      const body: any = { apiKey: smartleadsApiKey };
      if (selectedClientId) body.clientId = selectedClientId;

      const res = await fetch(`/api/integrations/smartleads/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).message);

      const data = await res.json();
      if (data.mode === "clients") {
        setClients(data.clients);
        toast.success("Choose a client to continue");
      } else {
        setCampaigns(
          data.campaigns.map((c: any) => ({
            id: c.id,
            name: c.name,
            isSelected: false,
          })),
        );
        toast.success("Campaigns loaded");
      }
    } catch (e: any) {
      toast.error(e.message ?? "SmartLeads error");
      setClients([]);
      setCampaigns([]);
    } finally {
      setLoadingSmartleads(false);
    }
  };

  /** Persist SmartLeads selection */
  const handleSaveSmartleads = async () => {
    if (!isOwner) return;
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/orgs/${organizationId}/integrations/smartleads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: smartleadsApiKey,
            clientId: selectedClientId,
            selectedCampaigns: campaigns
              .filter((c) => c.isSelected)
              .map((c) => c.id),
          }),
        },
      );
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Integration saved");
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  /* ────────── helpers ────────── */
  const OwnerOnly = () => (
    <Badge variant="outline" className="ml-2">
      <Lock className="w-3 h-3 mr-1" />
      Owner only
    </Badge>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  /* ────────── UI ────────── */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        {!isOwner && (
          <Badge variant="secondary">
            <Lock className="w-4 h-4 mr-2" />
            View only
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* ─────────── General ─────────── */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                General Settings {!isOwner && <OwnerOnly />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={organization.name}
                  onChange={(e) =>
                    setOrganization({ ...organization, name: e.target.value })
                  }
                  disabled={!isOwner}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSaveGeneral}
                disabled={isSaving || !isOwner}
                className="ml-auto"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Save
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ─────────── Users ─────────── */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                User Permissions {!isOwner && <OwnerOnly />}
              </CardTitle>
              <CardDescription>
                Manage roles for members of this organisation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    {isOwner && <TableHead className="w-[120px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.firstName} {u.lastName}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        {isOwner ? (
                          <Select
                            defaultValue={u.role}
                            onValueChange={async (val) => {
                              try {
                                const r = await fetch(
                                  `/api/orgs/${organizationId}/members`,
                                  {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      userId: u.id,
                                      role: val,
                                    }),
                                  },
                                );
                                if (!r.ok) throw new Error((await r.json()).error);
                                setUsers((prev) =>
                                  prev.map((x) =>
                                    x.id === u.id ? { ...x, role: val } : x,
                                  ),
                                );
                                toast.success("Role updated");
                              } catch (e: any) {
                                toast.error(e.message ?? "Update failed");
                              }
                            }}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {USER_ROLES_OPTIONS.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">{u.role}</Badge>
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
          </Card>
        </TabsContent>

        {/* ─────────── Integrations ─────────── */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                SmartLeads Integration {!isOwner && <OwnerOnly />}
              </CardTitle>
              <CardDescription>
                Enter your SmartLeads API key, pick a client, then select the
                campaigns to import.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* API key */}
              <div className="space-y-2">
                <Label htmlFor="api-key">SmartLeads API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={smartleadsApiKey}
                  onChange={(e) => {
                    setSmartleadsApiKey(e.target.value.trim());
                    setClients([]);
                    setSelectedClientId("");
                    setCampaigns([]);
                  }}
                  disabled={!isOwner}
                />
              </div>

              {/* Client select */}
              {clients.length > 0 && (
                <div className="space-y-2">
                  <Label>Select a Client</Label>
                  <Select
                    value={selectedClientId}
                    onValueChange={(v) => {
                      setSelectedClientId(v);
                      setCampaigns([]);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pick a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Verify / Load button */}
              {isOwner && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSmartleadsLoad}
                    disabled={
                      loadingSmartleads ||
                      !smartleadsApiKey ||
                      (clients.length > 0 && !selectedClientId)
                    }
                  >
                    {loadingSmartleads ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        {clients.length === 0 ? "Verify Key" : "Load Campaigns"}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Campaigns */}
              {campaigns.length > 0 && (
                <div className="pt-4 border-t">
                  <h3 className="mb-4 font-medium">
                    Select campaigns to import
                  </h3>
                  <div className="space-y-3">
                    {campaigns.map((c) => (
                      <div key={c.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`c-${c.id}`}
                          checked={c.isSelected}
                          onCheckedChange={() =>
                            isOwner &&
                            setCampaigns((prev) =>
                              prev.map((p) =>
                                p.id === c.id
                                  ? { ...p, isSelected: !p.isSelected }
                                  : p,
                              ),
                            )
                          }
                        />
                        <Label
                          htmlFor={`c-${c.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          {c.name}
                        </Label>
                        <Badge variant="outline">ID: {c.id}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {campaigns.length === 0 && selectedClientId && !loadingSmartleads && (
                <div className="flex items-center p-4 rounded-md bg-muted">
                  <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                  <p className="text-sm">
                    No campaigns found for this client.
                  </p>
                </div>
              )}
            </CardContent>

            {isOwner && integrationReady && (
              <CardFooter>
                <Button
                  onClick={handleSaveSmartleads}
                  disabled={isSaving || !integrationReady}
                  className="ml-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Save Integration
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
