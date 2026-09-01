"use client";

import { useEffect, useState } from "react";

/**
 * Firma digitalizada del usuario en sesion. Se usa para previsualizar como
 * quedara estampada en las plantillas antes de generar el PDF.
 */
export function useMySignature() {
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { item?: { signatureUrl?: string | null } }) => {
        setSignatureUrl(data.item?.signatureUrl ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { signatureUrl, loading };
}
