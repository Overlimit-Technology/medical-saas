"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { InternalAlertsRepositoryHttp } from "@/data/internal-alerts/InternalAlertsRepository";
import type { InternalAlert } from "@/domain/internal-alerts/entities/InternalAlert";
import {
  ListInternalAlertsUseCase,
  MarkInternalAlertAsReadUseCase,
} from "@/domain/internal-alerts/usecases/InternalAlertsUseCases";
import { sortInternalAlerts } from "./internal-alerts.mapper";

type RefreshOptions = {
  silent?: boolean;
};

export function useInternalAlertsFeed() {
  const { listInternalAlertsUseCase, markInternalAlertAsReadUseCase } = useMemo(() => {
    const repo = new InternalAlertsRepositoryHttp();

    return {
      listInternalAlertsUseCase: new ListInternalAlertsUseCase(repo),
      markInternalAlertAsReadUseCase: new MarkInternalAlertAsReadUseCase(repo),
    };
  }, []);

  const [alerts, setAlerts] = useState<InternalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingIds, setMarkingIds] = useState<string[]>([]);

  const refresh = useCallback(
    async (options: RefreshOptions = {}) => {
      if (options.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const result = await listInternalAlertsUseCase.execute();
        setAlerts(sortInternalAlerts(result.items));
        setError(null);
      } catch (refreshError) {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "No se pudieron sincronizar las notificaciones."
        );
      } finally {
        if (options.silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [listInternalAlertsUseCase]
  );

  const markAsRead = useCallback(
    async (alertId: string) => {
      if (markingIds.includes(alertId)) return;

      const previousAlerts = alerts;
      const optimisticReadAt = new Date().toISOString();

      setError(null);
      setMarkingIds((current) => [...current, alertId]);
      setAlerts((current) =>
        current.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                isRead: true,
                readAt: alert.readAt ?? optimisticReadAt,
              }
            : alert
        )
      );

      try {
        await markInternalAlertAsReadUseCase.execute(alertId);
        await refresh({ silent: true });
      } catch (markError) {
        setAlerts(previousAlerts);
        setError(
          markError instanceof Error
            ? markError.message
            : "No se pudo marcar la notificación como leída."
        );
      } finally {
        setMarkingIds((current) => current.filter((currentId) => currentId !== alertId));
      }
    },
    [alerts, markInternalAlertAsReadUseCase, markingIds, refresh]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handleFocus = () => {
      void refresh({ silent: true });
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refresh({ silent: true });
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refresh({ silent: true });
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [refresh]);

  return {
    state: {
      alerts,
      loading,
      refreshing,
      error,
      unreadCount: alerts.filter((alert) => !alert.isRead).length,
      markingIds,
    },
    actions: {
      refresh,
      markAsRead,
    },
  };
}
