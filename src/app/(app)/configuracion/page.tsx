import { Suspense } from "react";
import Settings from "@/presentation/settings/Settings";

export default function ConfiguracionPage() {
  return (
    <Suspense fallback={null}>
      <Settings />
    </Suspense>
  );
}
