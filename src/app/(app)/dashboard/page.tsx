import { prisma } from "@/lib/prisma";
import { requireClinicSession } from "@/server/auth/requireSession";

export const dynamic = "force-dynamic";

async function getBoxCount() {
  const session = await requireClinicSession();
  return prisma.box.count({ where: { clinicId: session.clinicId, isActive: true } });
}

export default async function DashboardPage() {
  const boxCount = await getBoxCount();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Panel de control</p>
        <h1 className="text-2xl font-semibold text-slate-900">Vista general</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">Pacientes hoy</p>
          <p className="mt-2 text-2xl font-semibold">12</p>
          <p className="mt-1 text-xs text-emerald-600">+2 vs ayer</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">Citas programadas</p>
          <p className="mt-2 text-2xl font-semibold">28</p>
          <p className="mt-1 text-xs text-slate-400">Semana en curso</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500">Boxes activos</p>
          <p className="mt-2 text-2xl font-semibold">{boxCount}</p>
          <p className="mt-1 text-xs text-slate-400">Disponible ahora</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <p className="text-sm font-semibold text-slate-900">Proximas citas</p>
        <p className="mt-2 text-sm text-slate-500">Usa la agenda para ver detalles y mover citas.</p>
      </div>
    </div>
  );
}
