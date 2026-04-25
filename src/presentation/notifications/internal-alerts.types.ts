import type { InternalAlert } from "@/domain/internal-alerts/entities/InternalAlert";

export type NotificationPanelTone = "info" | "warning" | "neutral";

export type NotificationPanelItem = {
  id: string;
  title: string;
  description: string;
  timeLabel: string;
  tone: NotificationPanelTone;
  categoryLabel: string;
  isRead: boolean;
  primaryAction: string | null;
  href?: string;
  metadata: string[];
  source: InternalAlert;
};

export type NotificationSidebarSections = {
  unread: NotificationPanelItem[];
  recent: NotificationPanelItem[];
};
