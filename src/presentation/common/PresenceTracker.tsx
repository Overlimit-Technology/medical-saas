"use client";

import { useEffect } from "react";

const PRESENCE_PING_MS = 2 * 60 * 1000;

export default function PresenceTracker() {
  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      if (cancelled || document.visibilityState !== "visible") return;

      try {
        await fetch("/api/auth/presence", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });
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
  }, []);

  return null;
}
