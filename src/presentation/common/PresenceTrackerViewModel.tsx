"use client";

import { useEffect, useMemo } from "react";
import { AuthRepositoryHttp } from "@/data/auth/AuthRepository";
import { ReportPresenceUseCase } from "@/domain/auth/usecases/ReportPresenceUseCase";

const PRESENCE_PING_MS = 2 * 60 * 1000;

export function usePresenceTrackerViewModel() {
  const reportPresenceUseCase = useMemo(() => {
    const repo = new AuthRepositoryHttp();
    return new ReportPresenceUseCase(repo);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      if (cancelled || document.visibilityState !== "visible") return;

      try {
        await reportPresenceUseCase.execute();
      } catch {
        // No interrumpimos la experiencia si el heartbeat falla.
      }
    };

    void ping();

    const intervalId = window.setInterval(() => {
      void ping();
    }, PRESENCE_PING_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void ping();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [reportPresenceUseCase]);
}
