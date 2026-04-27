export type AuthSession = {
  userId: string | null;
  role: string | null;
  isSuperAdmin: boolean;
  permissions: string[];
  usesNewPlatform: boolean;
  mustChangePassword: boolean;
};
