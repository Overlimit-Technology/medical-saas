import { prisma } from "@/lib/prisma";
import { normalizePermissions, type UserPermission } from "@/lib/permissions";
import {
  PLATFORM_MODULES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type PlatformRole,
} from "@/presentation/superadmin/platformConstants";
import type {
  SuperAdminActivityRow,
  SuperAdminClinicRow,
  SuperAdminModuleRow,
  SuperAdminPlatformData,
  SuperAdminRoleRow,
  SuperAdminTrialRow,
  SuperAdminUserRow,
} from "@/presentation/superadmin/platformTypes";

const DAY_MS = 86_400_000;
const TRIAL_DAYS = 30;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function displayName(user: {
  email: string;
  profile?: { firstName: string; lastName: string } | null;
}) {
  const fullName = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email;
}

function platformRole(user: { role: "ADMIN" | "DOCTOR" | "SECRETARY"; isSuperAdmin: boolean }): PlatformRole {
  return user.isSuperAdmin ? "SUPER_ADMIN" : user.role;
}

function daysSince(start: Date, now: Date) {
  return Math.max(0, Math.floor((startOfDay(now).getTime() - startOfDay(start).getTime()) / DAY_MS));
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function formatDelta(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function timeAgo(value: Date) {
  const diffMs = Math.max(0, Date.now() - value.getTime());
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

function userHasModule(user: Pick<SuperAdminUserRow, "isSuperAdmin" | "permissions">, key: UserPermission) {
  return user.isSuperAdmin || user.permissions.includes(key);
}

function inferPlan(input: { isActive: boolean; createdAt: Date; activeUsers: number }, now: Date) {
  if (!input.isActive) return "Inactiva" as const;
  if (daysSince(input.createdAt, now) < TRIAL_DAYS) return "Trial" as const;
  return input.activeUsers >= 8 ? ("Pro" as const) : ("Starter" as const);
}

export async function getSuperAdminPlatformData(): Promise<SuperAdminPlatformData> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = monthStart;

  const [clinicsRaw, usersRaw, alertsRaw] = await Promise.all([
    prisma.clinic.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        city: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          orderBy: [{ user: { profile: { firstName: "asc" } } }, { user: { email: "asc" } }],
          select: {
            id: true,
            status: true,
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                status: true,
                isSuperAdmin: true,
                usesNewPlatform: true,
                permissions: true,
                createdAt: true,
                lastLoginAt: true,
                profile: { select: { firstName: true, lastName: true } },
                doctorProfile: { select: { specialty: true } },
              },
            },
          },
        },
        _count: {
          select: {
            patients: true,
            boxes: true,
            appointments: true,
            clinicalVisits: true,
            observations: true,
            formTemplates: true,
            clinicalRecords: true,
            internalAlerts: true,
            crmLeads: true,
            cashMovements: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isSuperAdmin: true,
        usesNewPlatform: true,
        permissions: true,
        createdAt: true,
        lastLoginAt: true,
        profile: { select: { firstName: true, lastName: true } },
        doctorProfile: { select: { specialty: true } },
        clinicMemberships: {
          where: { status: "ACTIVE" },
          orderBy: { clinic: { name: "asc" } },
          select: {
            clinicId: true,
            clinic: { select: { name: true } },
          },
        },
      },
    }),
    prisma.internalAlert.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        eventType: true,
        createdAt: true,
        clinic: { select: { name: true } },
      },
    }),
  ]);

  const users: SuperAdminUserRow[] = usersRaw.map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    platformRole: platformRole(user),
    status: user.status,
    isSuperAdmin: user.isSuperAdmin,
    usesNewPlatform: user.usesNewPlatform,
    permissions: normalizePermissions(user.permissions),
    firstName: user.profile?.firstName ?? "",
    lastName: user.profile?.lastName ?? "",
    specialty: user.doctorProfile?.specialty ?? "",
    clinicIds: user.clinicMemberships.map((membership) => membership.clinicId),
    clinicNames: user.clinicMemberships.map((membership) => membership.clinic.name),
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: toIso(user.lastLoginAt),
  }));

  const userById = new Map(users.map((user) => [user.id, user]));

  const clinicsWithoutUsage = clinicsRaw.map((clinic) => {
    const clinicUsers = clinic.memberships
      .map((membership) => userById.get(membership.user.id))
      .filter((user): user is SuperAdminUserRow => Boolean(user));
    const activeUsers = clinicUsers.filter((user) => user.status === "ACTIVE").length;
    const inactiveUsers = clinicUsers.length - activeUsers;
    const activeModules = PLATFORM_MODULES.filter((module) =>
      clinicUsers.some((user) => user.status === "ACTIVE" && userHasModule(user, module.key))
    ).map((module) => module.key);
    const counts = clinic._count;
    const totalRecords =
      counts.patients +
      counts.boxes +
      counts.appointments +
      counts.clinicalVisits +
      counts.observations +
      counts.formTemplates +
      counts.clinicalRecords +
      counts.internalAlerts +
      counts.crmLeads +
      counts.cashMovements +
      clinic.memberships.length;

    return {
      id: clinic.id,
      name: clinic.name,
      city: clinic.city,
      isActive: clinic.isActive,
      createdAt: clinic.createdAt.toISOString(),
      updatedAt: clinic.updatedAt.toISOString(),
      plan: inferPlan({ isActive: clinic.isActive, createdAt: clinic.createdAt, activeUsers }, now),
      activeModules,
      users: clinicUsers,
      totalUsers: clinicUsers.length,
      activeUsers,
      inactiveUsers,
      doctors: clinicUsers.filter((user) => user.role === "DOCTOR").length,
      admins: clinicUsers.filter((user) => user.role === "ADMIN").length,
      secretaries: clinicUsers.filter((user) => user.role === "SECRETARY").length,
      resources: {
        patients: counts.patients,
        appointments: counts.appointments,
        clinicalVisits: counts.clinicalVisits,
        observations: counts.observations,
        formTemplates: counts.formTemplates,
        clinicalRecords: counts.clinicalRecords,
        alerts: counts.internalAlerts,
        leads: counts.crmLeads,
        cashMovements: counts.cashMovements,
        boxes: counts.boxes,
        memberships: clinic.memberships.length,
        totalRecords,
        usagePercent: 0,
      },
    };
  });

  const maxRecords = Math.max(1, ...clinicsWithoutUsage.map((clinic) => clinic.resources.totalRecords));
  const clinics: SuperAdminClinicRow[] = clinicsWithoutUsage.map((clinic) => ({
    ...clinic,
    resources: {
      ...clinic.resources,
      usagePercent: Math.round((clinic.resources.totalRecords / maxRecords) * 100),
    },
  }));

  const roles: SuperAdminRoleRow[] = (["SUPER_ADMIN", "ADMIN", "DOCTOR", "SECRETARY"] as const).map((role) => {
    const roleUsers = users.filter((user) => user.platformRole === role);
    return {
      role,
      label: ROLE_LABELS[role],
      description: ROLE_DESCRIPTIONS[role],
      users: roleUsers.length,
      activeUsers: roleUsers.filter((user) => user.status === "ACTIVE").length,
      suspendedUsers: roleUsers.filter((user) => user.status !== "ACTIVE").length,
      permissions: PLATFORM_MODULES.map((module) => {
        const enabledUsers = roleUsers.filter((user) => userHasModule(user, module.key)).length;
        return {
          key: module.key,
          enabledUsers,
          totalUsers: roleUsers.length,
          enabledPercent: roleUsers.length ? Math.round((enabledUsers / roleUsers.length) * 100) : 0,
        };
      }),
    };
  });

  const modules: SuperAdminModuleRow[] = PLATFORM_MODULES.map((module) => ({
    key: module.key,
    label: module.label,
    description: module.description,
    category: module.category,
    clinicsEnabled: clinics.filter((clinic) => clinic.activeModules.includes(module.key)).length,
    usersEnabled: users.filter((user) => userHasModule(user, module.key)).length,
    roleAccess: roles.map((role) => {
      const permission = role.permissions.find((item) => item.key === module.key);
      return {
        role: role.role,
        enabledUsers: permission?.enabledUsers ?? 0,
        totalUsers: role.users,
        enabledPercent: permission?.enabledPercent ?? 0,
      };
    }),
  }));

  const trials: SuperAdminTrialRow[] = clinicsRaw.map((clinic) => {
    const usedDays = Math.min(TRIAL_DAYS, daysSince(clinic.createdAt, now));
    const remainingDays = Math.max(0, TRIAL_DAYS - usedDays);
    const endAt = new Date(clinic.createdAt.getTime() + TRIAL_DAYS * DAY_MS);
    const adminUser = clinic.memberships
      .map((membership) => userById.get(membership.user.id))
      .find((user) => user?.role === "ADMIN");
    const contact = adminUser ?? clinic.memberships.map((membership) => userById.get(membership.user.id)).find(Boolean);
    const status = !clinic.isActive ? "expired" : remainingDays > 0 ? "active" : "converted";

    return {
      clinicId: clinic.id,
      clinicName: clinic.name,
      contactName: contact ? [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() || contact.email : "Sin contacto",
      contactEmail: contact?.email ?? "sin-correo@zensya.local",
      startAt: clinic.createdAt.toISOString(),
      endAt: endAt.toISOString(),
      totalDays: TRIAL_DAYS,
      usedDays,
      remainingDays,
      status,
      totalUsers: clinic.memberships.length,
    };
  });

  const countByRange = <T extends { createdAt: string | Date }>(items: T[], from: Date, to?: Date) =>
    items.filter((item) => {
      const createdAt = typeof item.createdAt === "string" ? new Date(item.createdAt) : item.createdAt;
      return createdAt >= from && (!to || createdAt < to);
    }).length;

  const newClinicsMonth = countByRange(clinicsRaw, monthStart);
  const newClinicsPreviousMonth = countByRange(clinicsRaw, prevMonthStart, prevMonthEnd);
  const newUsersMonth = countByRange(usersRaw, monthStart);
  const newUsersPreviousMonth = countByRange(usersRaw, prevMonthStart, prevMonthEnd);

  const clinicEvents: SuperAdminActivityRow[] = clinicsRaw
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map((clinic) => ({
      id: `clinic-${clinic.id}`,
      text: `Clinica ${clinic.name} fue creada`,
      timeLabel: timeAgo(clinic.createdAt),
      tone: "teal",
    }));

  const userEvents: SuperAdminActivityRow[] = usersRaw.slice(0, 5).map((user) => ({
    id: `user-${user.id}`,
    text: `Usuario ${displayName(user)} fue creado`,
    timeLabel: timeAgo(user.createdAt),
    tone: "success",
  }));

  const alertEvents: SuperAdminActivityRow[] = alertsRaw.map((alert) => ({
    id: `alert-${alert.id}`,
    text: `${alert.title} - ${alert.clinic.name}`,
    timeLabel: timeAgo(alert.createdAt),
    tone:
      alert.eventType === "APPOINTMENT_CONFLICT" || alert.eventType === "PAYMENT_PENDING"
        ? "warning"
        : "teal",
  }));

  const activity = [...clinicEvents, ...userEvents, ...alertEvents]
    .sort((a, b) => {
      const aDate = a.id.startsWith("clinic-")
        ? clinicsRaw.find((clinic) => `clinic-${clinic.id}` === a.id)?.createdAt.getTime() ?? 0
        : a.id.startsWith("user-")
          ? usersRaw.find((user) => `user-${user.id}` === a.id)?.createdAt.getTime() ?? 0
          : alertsRaw.find((alert) => `alert-${alert.id}` === a.id)?.createdAt.getTime() ?? 0;
      const bDate = b.id.startsWith("clinic-")
        ? clinicsRaw.find((clinic) => `clinic-${clinic.id}` === b.id)?.createdAt.getTime() ?? 0
        : b.id.startsWith("user-")
          ? usersRaw.find((user) => `user-${user.id}` === b.id)?.createdAt.getTime() ?? 0
          : alertsRaw.find((alert) => `alert-${alert.id}` === b.id)?.createdAt.getTime() ?? 0;
      return bDate - aDate;
    })
    .slice(0, 8);

  const totalRecords = clinics.reduce((sum, clinic) => sum + clinic.resources.totalRecords, 0);
  const averageUsagePercent = clinics.length
    ? Math.round(clinics.reduce((sum, clinic) => sum + clinic.resources.usagePercent, 0) / clinics.length)
    : 0;

  return {
    generatedAt: now.toISOString(),
    stats: {
      totalClinics: clinics.length,
      activeClinics: clinics.filter((clinic) => clinic.isActive).length,
      totalUsers: users.length,
      activeUsers: users.filter((user) => user.status === "ACTIVE").length,
      newClinicsMonth,
      newClinicsDelta: formatDelta(newClinicsMonth, newClinicsPreviousMonth),
      newUsersMonth,
      newUsersDelta: formatDelta(newUsersMonth, newUsersPreviousMonth),
      activeTrials: trials.filter((trial) => trial.status === "active").length,
      trialsExpiringSoon: trials.filter((trial) => trial.status === "active" && trial.remainingDays <= 7).length,
      totalRecords,
      averageUsagePercent,
    },
    clinics,
    users,
    roles,
    modules,
    trials,
    activity,
  };
}
