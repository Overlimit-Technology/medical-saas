export const USER_PERMISSIONS = [
  { key: "AGENDA", label: "Agenda" },
  { key: "CLINICAL_VISITS", label: "Cita clinica" },
  { key: "CHAT", label: "Chat" },
  { key: "CHAT_META", label: "Chat Meta" },
  { key: "PATIENTS", label: "Pacientes" },
  { key: "USERS", label: "Usuario" },
  { key: "TREATMENTS", label: "Tratamientos" },
  { key: "BOXES", label: "Boxes" },
  { key: "LEADS", label: "Leads CRM" },
] as const;

export type UserPermission = (typeof USER_PERMISSIONS)[number]["key"];

export function isUserPermission(value: string): value is UserPermission {
  return USER_PERMISSIONS.some((permission) => permission.key === value);
}

export function hasPermission(
  role: string | null | undefined,
  permissions: readonly string[] | null | undefined,
  permission: UserPermission,
  isSuperAdmin = false
) {
  return (role === "ADMIN" && isSuperAdmin) || Boolean(permissions?.includes(permission));
}

export function normalizePermissions(values: readonly string[] | null | undefined) {
  return Array.from(new Set((values ?? []).filter(isUserPermission)));
}
