"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
};

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  run: string;
  email?: string | null;
  phone?: string | null;
  appointments?: Appointment[];
};

export default function PatientDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/patients/${id}`);
      const data = await res.json();
      if (data.ok) setPatient(data.item);
      setLoading(false);
    };
    load();
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Detalle paciente</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {patient ? `${patient.firstName} ${patient.lastName}` : "Cargando"}
          </h1>
        </div>
        <Link
          href="/patients"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Volver
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          {loading && <p className="text-sm text-slate-400">Cargando...</p>}
          {!loading && !patient && (
            <p className="text-sm text-slate-400">No encontrado</p>
          )}
          {patient && (
            <div className="grid gap-3 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-900">RUN:</span> {patient.run}
              </p>
              <p>
                <span className="font-medium text-slate-900">Correo:</span> {patient.email ?? "-"}
              </p>
              <p>
                <span className="font-medium text-slate-900">Telefono:</span> {patient.phone ?? "-"}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Ultimas citas</p>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {patient?.appointments?.length ? (
              patient.appointments.map((appt) => (
                <div key={appt.id} className="rounded-xl border border-slate-100 p-3">
                  <p className="font-medium text-slate-900">
                    {new Date(appt.startAt).toLocaleString("es-CL")}
                  </p>
                  <p className="text-xs text-slate-400">{appt.status}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-400">Sin citas recientes</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
