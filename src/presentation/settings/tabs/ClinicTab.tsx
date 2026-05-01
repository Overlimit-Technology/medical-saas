"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { ClinicSettingsRepositoryHttp } from "@/data/clinic-settings/ClinicSettingsRepository";
import {
  GetClinicInfoUseCase,
  UpdateClinicInfoUseCase,
} from "@/domain/clinic-settings/usecases/ClinicSettingsUseCases";
import type { ClinicInfo } from "@/domain/clinic-settings/entities/ClinicInfo";

type TeamCategory = { id: string; name: string };

type FormState = {
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
  openingTime: string;
  closingTime: string;
};

function clinicToForm(clinic: ClinicInfo): FormState {
  return {
    name: clinic.name,
    city: clinic.city,
    address: clinic.address ?? "",
    phone: clinic.phone ?? "",
    email: clinic.email ?? "",
    logo: clinic.logo ?? "",
    openingTime: clinic.openingTime ?? "08:00",
    closingTime: clinic.closingTime ?? "20:00",
  };
}

export default function ClinicTab() {
  const { getClinicInfoUseCase, updateClinicInfoUseCase } = useMemo(() => {
    const repo = new ClinicSettingsRepositoryHttp();
    return {
      getClinicInfoUseCase: new GetClinicInfoUseCase(repo),
      updateClinicInfoUseCase: new UpdateClinicInfoUseCase(repo),
    };
  }, []);

  const [form, setForm] = useState<FormState>({
    name: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    logo: "",
    openingTime: "08:00",
    closingTime: "20:00",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const clinic = await getClinicInfoUseCase.execute();
        setForm(clinicToForm(clinic));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar los datos.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [getClinicInfoUseCase]);

  useEffect(() => {
    if (!success) return;
    const id = window.setTimeout(() => setSuccess(null), 2500);
    return () => window.clearTimeout(id);
  }, [success]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const clinic = await updateClinicInfoUseCase.execute({
        name: form.name,
        city: form.city,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        logo: form.logo || null,
        openingTime: form.openingTime || null,
        closingTime: form.closingTime || null,
      });
      setForm(clinicToForm(clinic));
      setSuccess("Datos de la clinica actualizados.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const fieldClassName =
    "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400";

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#19b3bc]/20 border-t-[#19b3bc]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            {form.logo ? (
              <img
                src={form.logo}
                alt={form.name}
                className="h-24 w-24 rounded-2xl object-contain"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[#19b3bc]/10 text-3xl font-semibold text-[#19b3bc]">
                {form.name.charAt(0).toUpperCase() || "C"}
              </div>
            )}
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{form.name || "Mi clinica"}</h2>
            <p className="mt-1 text-sm text-slate-500">{form.city || "Ciudad"}</p>
            {(form.openingTime || form.closingTime) && (
              <div className="mt-3 rounded-full bg-[#19b3bc]/10 px-3 py-1 text-xs font-medium text-[#0f8f98]">
                {form.openingTime} - {form.closingTime}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-600">
                <span>Nombre de la clinica</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={fieldClassName}
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-600">
                <span>Ciudad</span>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={fieldClassName}
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm text-slate-600">
              <span>Direccion</span>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Ej: Av. Providencia 1234, Of. 501"
                className={fieldClassName}
              />
            </label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-600">
                <span>Telefono</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+56 9 1234 5678"
                  className={fieldClassName}
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-600">
                <span>Correo de la clinica</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contacto@clinica.cl"
                  className={fieldClassName}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-600">
                <span>Hora de apertura</span>
                <input
                  type="time"
                  value={form.openingTime}
                  onChange={(e) => setForm({ ...form, openingTime: e.target.value })}
                  className={fieldClassName}
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-600">
                <span>Hora de cierre</span>
                <input
                  type="time"
                  value={form.closingTime}
                  onChange={(e) => setForm({ ...form, closingTime: e.target.value })}
                  className={fieldClassName}
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm text-slate-600">
              <span>Logo (URL)</span>
              <input
                value={form.logo}
                onChange={(e) => setForm({ ...form, logo: e.target.value })}
                placeholder="https://..."
                className={fieldClassName}
              />
            </label>

            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-[#19b3bc] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#159ea7] disabled:cursor-not-allowed disabled:bg-[#19b3bc]/45"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </section>
      </div>

      <TeamCategoryManager />

      {success && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {success}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Team Category Manager — CRUD for clinic-configurable team categories
// =============================================================================

function TeamCategoryManager() {
  const [teams, setTeams] = useState<TeamCategory[]>([]);
  const [newName, setNewName] = useState("");
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    setLoadingTeams(true);
    try {
      const res = await fetch("/api/team-categories", { credentials: "include" });
      const data = await res.json();
      if (data.ok) setTeams(data.items ?? []);
    } catch {
      // ignore
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreating(true);
    setTeamError(null);

    try {
      const res = await fetch("/api/team-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!data.ok) {
        setTeamError(data.error ?? "No se pudo crear el equipo.");
        return;
      }
      setTeams((prev) => [...prev, data.item].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setNewName("");
    } catch {
      setTeamError("Error de red al crear equipo.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setTeamError(null);

    try {
      const res = await fetch("/api/team-categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.ok) {
        setTeamError(data.error ?? "No se pudo eliminar el equipo.");
        return;
      }
      setTeams((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setTeamError("Error de red al eliminar equipo.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
          <Users className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">Equipos de trabajo</h3>
          <p className="text-xs text-slate-500">
            Define los equipos disponibles (ej. Kinesiologia, Enfermeria)
          </p>
        </div>
      </div>

      {teamError && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {teamError}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre del equipo"
          className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleCreate();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating || !newName.trim()}
          className="flex items-center gap-1.5 rounded-2xl bg-[#19b3bc] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#159ea7] disabled:cursor-not-allowed disabled:bg-[#19b3bc]/45"
        >
          <Plus className="h-4 w-4" />
          {creating ? "Creando..." : "Agregar"}
        </button>
      </div>

      {loadingTeams ? (
        <div className="mt-4 flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#19b3bc]/20 border-t-[#19b3bc]" />
        </div>
      ) : teams.length > 0 ? (
        <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-slate-800">{team.name}</span>
              <button
                type="button"
                onClick={() => void handleDelete(team.id)}
                disabled={deletingId === team.id}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                title="Eliminar equipo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-center text-xs text-slate-400">
          No hay equipos configurados. Agrega uno para que tus profesionales puedan seleccionarlo.
        </p>
      )}
    </section>
  );
}
