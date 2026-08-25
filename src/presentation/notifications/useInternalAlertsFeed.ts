"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InternalAlertsRepositoryHttp } from "@/data/internal-alerts/InternalAlertsRepository";
import type { InternalAlert } from "@/domain/internal-alerts/entities/InternalAlert";
import {
  ListInternalAlertsUseCase,
  MarkInternalAlertAsReadUseCase,
} from "@/domain/internal-alerts/usecases/InternalAlertsUseCases";
import { isSessionErrorMessage } from "@/lib/auth/sessionErrors";
import { sortInternalAlerts } from "./internal-alerts.mapper";
import { playNotificationChime, unlockNotificationSound } from "./notificationSound";

type RefreshOptions = {
  silent?: boolean;
};

// El chat ya sondea cada 3 s; 5 s deja la llegada de un paciente practicamente
// instantanea para el profesional sin duplicar la carga de aquel.
const POLL_INTERVAL_MS = 5000;

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

  // Ids no leidos ya vistos: permite distinguir una alerta realmente nueva de
  // una que ya estaba ahi, y asi sonar solo cuando corresponde.
  const seenUnreadIdsRef = useRef<Set<string> | null>(null);

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

        const unreadIdList = result.items.filter((item) => !item.isRead).map((item) => item.id);
        const previouslySeen = seenUnreadIdsRef.current;

        // En la primera carga solo se toma la foto: no suena por el historial.
        if (previouslySeen && unreadIdList.some((id) => !previouslySeen.has(id))) {
          playNotificationChime();
        }

        seenUnreadIdsRef.current = new Set(unreadIdList);
      } catch (refreshError) {
        const message =
          refreshError instanceof Error
            ? refreshError.message
            : "No se pudieron sincronizar las notificaciones.";

        if (isSessionErrorMessage(message)) {
          setAlerts([]);
          setError(null);
          return;
        }

        setError(
          message
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
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [refresh]);

  // El navegador mantiene el audio suspendido hasta el primer gesto del usuario.
  useEffect(() => {
    const handleGesture = () => unlockNotificationSound();

    window.addEventListener("pointerdown", handleGesture, { once: true });
    window.addEventListener("keydown", handleGesture, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleGesture);
      window.removeEventListener("keydown", handleGesture);
    };
  }, []);

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
