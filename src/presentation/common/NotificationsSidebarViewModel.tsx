"use client";

import { useMemo, useState } from "react";
import { DEMO_NOTIFICATIONS } from "@/presentation/notifications/notifications-demo";

export function useNotificationsSidebarViewModel() {
  const [isOpen, setIsOpen] = useState(false);

  const notifications = useMemo(() => DEMO_NOTIFICATIONS, []);
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  return {
    state: {
      isOpen,
      notifications,
      unreadCount,
    },
    actions: {
      openPanel: () => setIsOpen(true),
      closePanel: () => setIsOpen(false),
      togglePanel: () => setIsOpen((current) => !current),
    },
  };
}
