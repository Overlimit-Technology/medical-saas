export type AuthSession = {
  userId: string | null;
  role: string | null;
  mustChangePassword: boolean;
};
