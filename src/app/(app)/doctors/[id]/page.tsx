"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Doctor = {
  id: string;
  email: string;
  profile?: { firstName: string; lastName: string } | null;
  doctorProfile?: { rut: string; specialty?: string | null } | null;
};

export default function DoctorDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/doctors/${id}`);
      const data = await res.json();
      if (data.ok) setDoctor(data.item);
      setLoading(false);
    };
    load();
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Detalle doctor</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {doctor
              ? `${doctor.profile?.firstName ?? ""} ${doctor.profile?.lastName ?? ""}`
              : "Cargando"}
          </h1>
        </div>
        <Link
          href="/doctors"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Volver
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        {loading && <p className="text-sm text-slate-400">Cargando...</p>}
        {!loading && !doctor && <p className="text-sm text-slate-400">No encontrado</p>}
        {doctor && (
          <div className="grid gap-3 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Email:</span> {doctor.email}
            </p>
            <p>
              <span className="font-medium text-slate-900">RUT:</span>{" "}
              {doctor.doctorProfile?.rut ?? "-"}
            </p>
            <p>
              <span className="font-medium text-slate-900">Especialidad:</span>{" "}
              {doctor.doctorProfile?.specialty ?? "-"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
