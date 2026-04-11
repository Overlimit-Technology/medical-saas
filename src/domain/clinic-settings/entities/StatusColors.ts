export const CLINIC_SETTING_COLOR_NAMES = [
  "blue",
  "indigo",
  "emerald",
  "rose",
  "amber",
  "violet",
  "cyan",
  "teal",
  "pink",
  "orange",
  "slate",
] as const;

export type ClinicSettingColorName = (typeof CLINIC_SETTING_COLOR_NAMES)[number];

export const CLINIC_SETTING_APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
] as const;

export type ClinicSettingAppointmentStatus = (typeof CLINIC_SETTING_APPOINTMENT_STATUSES)[number];

export type ClinicStatusColorMap = Partial<
  Record<ClinicSettingAppointmentStatus, ClinicSettingColorName>
>;
