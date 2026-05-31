import { Suspense } from "react";
import Seguimiento from "@/presentation/seguimiento/Seguimiento";

export default function SeguimientoPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Cargando seguimiento...</div>}>
      <Seguimiento />
    </Suspense>
  );
}
