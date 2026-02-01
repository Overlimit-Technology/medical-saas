"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  patient: { firstName: string; lastName: string };
  doctor: { profile?: { firstName: string; lastName: string } | null };
  box: { name: string };
};

export default function AppointmentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/appointments/${id}`);
      const data = await res.json();
      if (data.ok) setAppointment(data.item);
      setLoading(false);
    };
    load();
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Detalle cita</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {appointment
              ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
              : "Cargando"}
          </h1>
        </div>
        <Link
          href="/agenda"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Volver
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        {loading && <p className="text-sm text-slate-400">Cargando...</p>}
        {!loading && !appointment && <p className="text-sm text-slate-400">No encontrado</p>}
        {appointment && (
          <div className="grid gap-3 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Doctor:</span>{" "}
              {appointment.doctor.profile?.firstName} {appointment.doctor.profile?.lastName}
            </p>
            <p>
              <span className="font-medium text-slate-900">Box:</span> {appointment.box.name}
            </p>
            <p>
              <span className="font-medium text-slate-900">Inicio:</span>{" "}
              {new Date(appointment.startAt).toLocaleString("es-CL")}
            </p>
            <p>
              <span className="font-medium text-slate-900">Fin:</span>{" "}
              {new Date(appointment.endAt).toLocaleString("es-CL")}
            </p>
            <p>
              <span className="font-medium text-slate-900">Estado:</span> {appointment.status}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
