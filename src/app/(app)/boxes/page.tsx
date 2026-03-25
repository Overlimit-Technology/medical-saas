"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { DeleteIconButton } from "@/presentation/common/DeleteIconButton";

type Box = {
  id: string;
  name: string;
};

export default function BoxesPage() {
  const [items, setItems] = useState<Box[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Box | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Box | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const loadBoxes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/boxes");
      const data = await res.json();
      if (data.ok) setItems(data.items ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (roleLoading) return;
    if (role !== "ADMIN") {
      window.location.assign("/dashboard");
      return;
    }
    loadBoxes();
  }, [role, roleLoading, loadBoxes]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const term = query.toLowerCase();
    return items.filter((b) => b.name.toLowerCase().includes(term));
  }, [items, query]);

  const totalLabel = `${items.length} box${items.length === 1 ? "" : "es"}`;
  const headerHint = useMemo(() => {
    if (!query.trim()) return null;
    return `${filteredItems.length} resultado${filteredItems.length === 1 ? "" : "s"} para "${query}"`;
  }, [filteredItems.length, query]);

  // Modal actions
  const openCreateModal = () => {
    setSelected(null);
    setName("");
    setNameError(null);
    setApiError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (box: Box) => {
    setSelected(box);
    setName(box.name);
    setNameError(null);
    setApiError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelected(null);
    setName("");
    setNameError(null);
    setApiError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setNameError("Nombre obligatorio.");
      return;
    }
    setNameError(null);
    setSaving(true);
    setApiError(null);

    const editing = Boolean(selected);
    const endpoint = editing ? `/api/boxes/${selected!.id}` : "/api/boxes";
    const method = editing ? "PATCH" : "POST";

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudo guardar el box.");
        return;
      }
      closeModal();
      setSuccessMessage(editing ? "Box actualizado." : "Box creado.");
      await loadBoxes();
    } catch {
      setApiError("No se pudo guardar el box.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      const res = await fetch(`/api/boxes/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        setDeleteError(data.error ?? "No se pudo eliminar el box.");
        return;
      }
      setDeleteTarget(null);
      setDeleteError(null);
      setSuccessMessage("Box eliminado.");
      await loadBoxes();
    } catch {
      setDeleteError("No se pudo eliminar el box.");
    }
  };

  const dismissDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  if (roleLoading) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-lg bg-slate-100" />
          <div className="h-64 rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
          No tienes acceso a esta sección. Redirigiendo...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── Panel principal ── */}
      <div className="rounded-2xl border border-slate-100 bg-white px-6 pb-6 pt-5 shadow-sm">
        {/* Encabezado */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Boxes</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-slate-400">{totalLabel}</span>
              {headerHint && (
                <span className="text-xs text-slate-400">&middot; {headerHint}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar"
                className="w-48 rounded-full border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:w-64 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <button
            onClick={openCreateModal}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Nuevo box"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
        </div>

        {/* Tabla */}
        <div className="mt-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={2}>
                    Cargando boxes...
                  </td>
                </tr>
              )}
              {!loading && filteredItems.length === 0 && !query.trim() && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={2}>
                    No hay boxes registrados.
                  </td>
                </tr>
              )}
              {!loading && filteredItems.length === 0 && query.trim() && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={2}>
                    No se encontraron boxes con ese criterio.
                  </td>
                </tr>
              )}
              {filteredItems.map((box, idx) => {
                const initial = box.name.charAt(0).toUpperCase();
                return (
                  <tr
                    key={box.id}
                    style={{ animationDelay: `${idx * 25}ms` }}
                    className="animate-card-in group cursor-pointer border-b border-slate-50 transition-colors last:border-b-0 hover:bg-slate-50/70"
                    onClick={() => openEditModal(box)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-600">
                          {initial}
                        </div>
                        <span className="font-medium text-slate-800">{box.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                          onClick={() => openEditModal(box)}
                        >
                          Editar
                        </button>
                        <DeleteIconButton
                          ariaLabel={`Eliminar ${box.name}`}
                          onClick={() => setDeleteTarget(box)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Crear / Editar box ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={closeModal} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-800"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </div>

            <h2 className="text-lg font-semibold text-slate-900">
              {selected ? "Editar box" : "Nuevo box"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {selected
                ? "Modifica el nombre del box."
                : "Agrega un nuevo box o sala de atención."}
            </p>

            <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Nombre</label>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  placeholder="Ej: Box 1"
                  className={`w-full rounded-xl border bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 ${nameError ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-blue-400"}`}
                />
                {nameError && <p className="mt-1 text-[11px] text-rose-500">{nameError}</p>}
              </div>

              {apiError && (
                <div className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                  {apiError}
                </div>
              )}

              <div className="mt-2 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || !name.trim()} className="flex-1 rounded-full bg-slate-900 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none">
                  {saving ? "Guardando..." : selected ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toast de éxito ── */}
      {successMessage && (
        <div className="animate-fade-in fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {successMessage}
        </div>
      )}

      {/* ── Modal: Eliminar box ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={dismissDeleteModal} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
            <h3 className="text-lg font-semibold text-slate-900">Eliminar box</h3>
            <p className="mt-2 text-sm text-slate-500">
              ¿Estás seguro de eliminar el box <span className="font-medium text-slate-700">{deleteTarget.name}</span>?
              Esta acción no se puede deshacer.
            </p>
            {deleteError && (
              <div className="mt-4 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button onClick={dismissDeleteModal} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800">
                Cancelar
              </button>
              <button onClick={handleDelete} className="rounded-full bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-500/20">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
