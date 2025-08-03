// Organization role constants
export const ORGANIZATION_ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN', 
  SALES_MANAGER: 'SALES_MANAGER',
  CAMPAIGN_MANAGER: 'CAMPAIGN_MANAGER',
  PROJECT_LEAD: 'PROJECT_LEAD',
  MEMBER: 'MEMBER',
} as const;

export type OrganizationRole = typeof ORGANIZATION_ROLES[keyof typeof ORGANIZATION_ROLES];

export const ROLE_LABELS = {
  [ORGANIZATION_ROLES.OWNER]: 'Owner',
  [ORGANIZATION_ROLES.ADMIN]: 'Admin',
  [ORGANIZATION_ROLES.SALES_MANAGER]: 'Sales Manager',
  [ORGANIZATION_ROLES.CAMPAIGN_MANAGER]: 'Campaign Manager',
  [ORGANIZATION_ROLES.PROJECT_LEAD]: 'Project Lead',
  [ORGANIZATION_ROLES.MEMBER]: 'Member',
} as const;

export const ROLE_DESCRIPTIONS = {
  [ORGANIZATION_ROLES.OWNER]: 'Full access to all organization features and settings',
  [ORGANIZATION_ROLES.ADMIN]: 'Administrative access to most organization features',
  [ORGANIZATION_ROLES.SALES_MANAGER]: 'Manages sales processes and lead tracking',
  [ORGANIZATION_ROLES.CAMPAIGN_MANAGER]: 'Manages marketing campaigns and outreach',
  [ORGANIZATION_ROLES.PROJECT_LEAD]: 'Leads project management and task coordination',
  [ORGANIZATION_ROLES.MEMBER]: 'Basic access to organization projects and tasks',
} as const;

export const USER_ROLES_OPTIONS = [
  { value: ORGANIZATION_ROLES.OWNER, label: ROLE_LABELS[ORGANIZATION_ROLES.OWNER] },
  { value: ORGANIZATION_ROLES.ADMIN, label: ROLE_LABELS[ORGANIZATION_ROLES.ADMIN] },
  { value: ORGANIZATION_ROLES.SALES_MANAGER, label: ROLE_LABELS[ORGANIZATION_ROLES.SALES_MANAGER] },
  { value: ORGANIZATION_ROLES.CAMPAIGN_MANAGER, label: ROLE_LABELS[ORGANIZATION_ROLES.CAMPAIGN_MANAGER] },
  { value: ORGANIZATION_ROLES.PROJECT_LEAD, label: ROLE_LABELS[ORGANIZATION_ROLES.PROJECT_LEAD] },
  { value: ORGANIZATION_ROLES.MEMBER, label: ROLE_LABELS[ORGANIZATION_ROLES.MEMBER] },
];

// Helper functions
export function isOwner(role: string): boolean {
  return role === ORGANIZATION_ROLES.OWNER;
}

export function isAdmin(role: string): boolean {
  return role === ORGANIZATION_ROLES.ADMIN;
}

export function isSalesManager(role: string): boolean {
  return role === ORGANIZATION_ROLES.SALES_MANAGER;
}

export function isCampaignManager(role: string): boolean {
  return role === ORGANIZATION_ROLES.CAMPAIGN_MANAGER;
}

export function isProjectLead(role: string): boolean {
  return role === ORGANIZATION_ROLES.PROJECT_LEAD;
}

export function isMember(role: string): boolean {
  return role === ORGANIZATION_ROLES.MEMBER;
}

export function canManageUsers(role: string): boolean {
  return isOwner(role) || isAdmin(role);
}

export function canManageProjects(role: string): boolean {
  return isOwner(role) || isAdmin(role) || isProjectLead(role);
}

export function canManageCampaigns(role: string): boolean {
  return isOwner(role) || isAdmin(role) || isCampaignManager(role);
}

export function canManageSales(role: string): boolean {
  return isOwner(role) || isAdmin(role) || isSalesManager(role);
}
