"use client";

import { useEffect, useState } from "react";

type Box = {
  id: string;
  name: string;
};

export default function BoxesPage() {
  const [items, setItems] = useState<Box[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const loadRole = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        setRole(data.ok ? data.session?.role ?? null : null);
      } catch {
        setRole(null);
      } finally {
        setRoleLoading(false);
      }
    };
    loadRole();
  }, []);

  const load = async () => {
    const res = await fetch("/api/boxes");
    const data = await res.json();
    if (data.ok) setItems(data.items);
  };

  useEffect(() => {
    if (roleLoading) return;
    if (role !== "ADMIN") {
      window.location.assign("/dashboard");
    }
  }, [role, roleLoading]);

  useEffect(() => {
    load();
  }, []);

  if (roleLoading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Cargando permisos...
      </div>
    );
  }

  if (role !== "ADMIN") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
        No tienes acceso a esta sección. Redirigiendo...
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const res = await fetch("/api/boxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.ok) {
      setName("");
      load();
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Boxes</h1>
        <div className="mt-6 grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-900">{item.name}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Nuevo box</h2>
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
}
