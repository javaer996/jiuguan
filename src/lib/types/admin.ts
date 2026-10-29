export type AdminUserDTO = {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  role: "user" | "admin";
  status: "active" | "suspended" | "deleted";
  createdAt: string;
  lastLoginAt: string | null;
  deletedAt: string | null;
};

export type AdminInviteDTO = {
  id: string;
  code: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  disabled: boolean;
  note: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
    displayName: string;
  } | null;
};

export type AdminSharedProviderDTO = {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  status: "active" | "disabled";
  apiKeyHint: string | null;
  owner: {
    id: string;
    username: string;
    displayName: string;
  } | null;
  grants: {
    userId: string;
    username: string;
    displayName: string;
    grantedAt: string;
  }[];
};

export type AdminAuditDTO = {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    displayName: string;
  } | null;
};

export type AdminSettingsDTO = {
  registrationEnabled: boolean;
  inviteRequired: boolean;
  siteNotice: string;
};
