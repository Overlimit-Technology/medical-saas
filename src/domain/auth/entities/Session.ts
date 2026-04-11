export type AuthSession = {
  userId: string | null;
  role: string | null;
  isSuperAdmin: boolean;
  permissions: string[];
  mustChangePassword: boolean;
};
