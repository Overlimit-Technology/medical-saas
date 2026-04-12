export type LeadChannel =
  | "instagram"
  | "whatsapp"
  | "facebook"
  | "telegram"
  | "tiktok"
  | "email"
  | "phone"
  | "website"
  | "referral"
  | "other";

export type LeadPriority = "low" | "medium" | "high" | "urgent";

export type LeadNote = {
  id: string;
  text: string;
  createdAt: string;
};

export type LeadMessage = {
  id: string;
  text: string;
  direction: "inbound" | "outbound";
  channel: LeadChannel;
  createdAt: string;
  attachmentUrl?: string;
  attachmentName?: string;
};

export type LeadActivity = {
  id: string;
  type: string;
  fromValue: string | null;
  toValue: string | null;
  userName: string | null;
  createdAt: string;
};

export type Lead = {
  id: string;
  name: string;
  company: string;
  channel: LeadChannel;
  phone: string;
  email: string;
  sector: string;
  columnId: string;
  priority: LeadPriority;
  estimatedBudget: number | null;
  mainNote: string;
  notes: LeadNote[];
  messages: LeadMessage[];
  activities: LeadActivity[];
  tags: string[];
  archived: boolean;
  converted: boolean;
  convertedPatientId: string | null;
  followUpDate: string | null;
  assignedDoctorId: string | null;
  createdAt: string;
  updatedAt: string;
  scrapedData: Record<string, string>;
};

export type DoctorOption = {
  id: string;
  name: string;
  specialty: string | null;
};

export const CHANNEL_LABELS: Record<LeadChannel, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  telegram: "Telegram",
  tiktok: "TikTok",
  email: "Email",
  phone: "Llamada",
  website: "Sitio Web",
  referral: "Referido",
  other: "Otro",
};

export const PRIORITY_LABELS: Record<LeadPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export const PRIORITY_COLORS: Record<LeadPriority, string> = {
  low: "#6b7280",
  medium: "#f59e0b",
  high: "#f97316",
  urgent: "#ef4444",
};
