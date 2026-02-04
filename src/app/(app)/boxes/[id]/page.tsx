"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Box = {
  id: string;
  name: string;
  isActive: boolean;
};

export default function BoxDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [box, setBox] = useState<Box | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/boxes/${id}`);
      const data = await res.json();
      if (data.ok) setBox(data.item);
      setLoading(false);
    };
    load();
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Detalle box</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {box ? box.name : "Cargando"}
          </h1>
        </div>
        <Link
          href="/boxes"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Volver
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        {loading && <p className="text-sm text-slate-400">Cargando...</p>}
        {!loading && !box && <p className="text-sm text-slate-400">No encontrado</p>}
        {box && (
          <div className="grid gap-3 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Estado:</span>{" "}
              {box.isActive ? "Activo" : "Inactivo"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
