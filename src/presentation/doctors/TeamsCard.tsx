"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, UsersRound } from "lucide-react";
import { Card, EmptyState, IconBox, Loading, Notice, btnClass, zs } from "@/presentation/ui/zs";

type Team = { id: string; name: string; members?: Array<{ firstName: string; lastName: string }> };

const initials = (m: { firstName: string; lastName: string }) => `${m.firstName.charAt(0)}${m.lastName.charAt(0)}`.toUpperCase();

/**
 * Equipos de trabajo de la sede (Kinesiologia, Enfermeria...). El admin los crea y borra; cada
 * persona elige el suyo en Mi perfil. Antes este administrador no estaba en ninguna pantalla.
 */
export default function TeamsCard({ canEdit }: { canEdit: boolean }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team-categories", { credentials: "include" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setTeams(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos cargar los equipos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy("new");
    setError(null);
    try {
      const res = await fetch("/api/team-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "No se pudo crear el equipo.");
      setTeams((prev) => [...prev, { ...data.item, members: [] }].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el equipo.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/team-categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "No se pudo eliminar el equipo.");
      setTeams((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el equipo.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card title="Equipos de trabajo">
      <p className={`${zs.small} -mt-2 mb-4`}>Agrupa a tu equipo por especialidad o área. Cada persona elige el suyo en Mi perfil.</p>
      {error ? (
        <div className="mb-4">
          <Notice tone="err">{error}</Notice>
        </div>
      ) : null}

      {canEdit ? (
        <form
          className="mb-5 flex max-w-xl gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nuevo equipo, por ejemplo Kinesiología" className={zs.input} maxLength={100} />
          <button type="submit" disabled={busy === "new" || !name.trim()} className={btnClass("primary", "md")}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            {busy === "new" ? "Creando…" : "Crear"}
          </button>
        </form>
      ) : null}

      {loading ? (
        <Loading label="Cargando equipos…" />
      ) : teams.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => {
            const members = team.members ?? [];
            return (
              <li key={team.id} className="flex flex-col gap-3 rounded-[20px] border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <IconBox icon={UsersRound} />
                  <div className="min-w-0 flex-1">
                    <b className="block truncate font-display text-[16px] font-semibold text-slate-900">{team.name}</b>
                    <span className={zs.small}>
                      {members.length} {members.length === 1 ? "persona" : "personas"}
                    </span>
                  </div>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => void remove(team.id)}
                      disabled={busy === team.id}
                      aria-label={`Eliminar ${team.name}`}
                      className="grid h-9 w-9 place-items-center rounded-full text-slate-400 transition hover:bg-[#e5484d]/10 hover:text-[#c23434] disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                  ) : null}
                </div>
                {members.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {members.slice(0, 8).map((m, i) => (
                      <span
                        key={`${m.firstName}-${m.lastName}-${i}`}
                        title={`${m.firstName} ${m.lastName}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-2.5 text-[12.5px] text-slate-700"
                      >
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-[#50c9d5] to-[#84d9e1] font-display text-[10px] font-bold text-slate-900">
                          {initials(m)}
                        </span>
                        {m.firstName}
                      </span>
                    ))}
                    {members.length > 8 ? <span className={zs.small}>+{members.length - 8}</span> : null}
                  </div>
                ) : (
                  <p className={zs.small}>Aún nadie eligió este equipo.</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="Aún no hay equipos">Crea el primero para ordenar a tu equipo por área.</EmptyState>
      )}
    </Card>
  );
}
