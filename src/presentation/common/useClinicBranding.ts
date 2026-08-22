"use client";

import { useEffect, useState } from "react";

export function useClinicBranding() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clinic-profile")
      .then((r) => r.json())
      .then((data: { logoUrl?: string | null; name?: string }) => {
        setLogoUrl(data.logoUrl ?? null);
        setClinicName(data.name ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { logoUrl, clinicName, loading };
}
