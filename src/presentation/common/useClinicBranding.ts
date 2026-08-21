"use client";

import { useEffect, useState } from "react";

export function useClinicBranding() {
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clinic-profile")
      .then((r) => r.json())
      .then((data: { logoBase64?: string | null; name?: string }) => {
        setLogoBase64(data.logoBase64 ?? null);
        setClinicName(data.name ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { logoBase64, clinicName, loading };
}
