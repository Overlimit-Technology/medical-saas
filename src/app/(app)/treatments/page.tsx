"use client";

import { useEffect, useMemo, useState } from "react";

type Treatment = {
  id: string;
  name: string;
  price: number;
};

type FormState = {
  id: string;
  name: string;
  price: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  id: "",
  name: "",
  price: "",
};

function validateForm(form: FormState, editing: boolean) {
  const errors: FormErrors = {};
  if (!editing && !form.id.trim()) {
    errors.id = "Id obligatorio.";
  }
  if (!form.name.trim()) {
    errors.name = "Nombre obligatorio.";
  }
  if (!form.price.trim()) {
    errors.price = "Precio obligatorio.";
  } else {
    const parsedPrice = Number(form.price);
    if (Number.isNaN(parsedPrice)) {
      errors.price = "Precio invalido.";
    } else if (parsedPrice < 0) {
      errors.price = "El precio debe ser mayor o igual a 0.";
    }
  }
  return errors;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function TreatmentsPage() {
  const [items, setItems] = useState<Treatment[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedTreatment = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const term = query.toLowerCase();
    return items.filter(
      (item) => item.id.toLowerCase().includes(term) || item.name.toLowerCase().includes(term)
    );
  }, [items, query]);

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

  const loadTreatments = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/treatments");
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudieron cargar los tratamientos.");
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setApiError("No se pudieron cargar los tratamientos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRole();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  useEffect(() => {
    if (roleLoading) return;
    if (role !== "ADMIN" && role !== "DOCTOR") {
      window.location.assign("/dashboard");
      return;
    }
    loadTreatments();
  }, [role, roleLoading]);

  useEffect(() => {
    if (selectedTreatment) {
      setForm({
        id: selectedTreatment.id,
        name: selectedTreatment.name,
        price: `${selectedTreatment.price}`,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setApiError(null);
  }, [selectedTreatment]);

  const handleFieldChange = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (!errors[key]) return;
    const next = { ...errors };
    delete next[key];
    setErrors(next);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const editing = Boolean(selectedTreatment);
    const nextErrors = validateForm(form, editing);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (editing) {
      const confirmed = window.confirm("Confirma guardar cambios de este tratamiento.");
      if (!confirmed) return;
    }

    setSaving(true);
    setApiError(null);

    const payload = editing
      ? {
          name: form.name.trim(),
          price: Number(form.price),
        }
      : {
          id: form.id.trim(),
          name: form.name.trim(),
          price: Number(form.price),
        };

    const endpoint = editing ? `/api/treatments/${selectedTreatment?.id}` : "/api/treatments";
    const method = editing ? "PUT" : "POST";

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudo guardar el tratamiento.");
        return;
      }

      setSuccessMessage(editing ? "Tratamiento actualizado." : "Tratamiento creado.");
      setSelectedId(null);
      setForm(EMPTY_FORM);
      await loadTreatments();
    } catch {
      setApiError("No se pudo guardar el tratamiento.");
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Cargando permisos...
      </div>
    );
  }

  if (role !== "ADMIN" && role !== "DOCTOR") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
        No tienes acceso a esta seccion. Redirigiendo...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.8fr_1fr]">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Catalogo general</p>
            <h1 className="text-xl font-semibold text-slate-900">Tratamientos</h1>
            <p className="text-xs text-slate-400">
              Selecciona un registro por id para editar sus datos.
            </p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por id o nombre"
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-slate-400"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Precio</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={4}>
                    Cargando tratamientos...
                  </td>
                </tr>
              )}
              {!loading && filteredItems.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={4}>
                    No hay tratamientos registrados.
                  </td>
                </tr>
              )}
              {filteredItems.map((item) => {
                const isSelected = selectedTreatment?.id === item.id;
                return (
                  <tr
                    key={item.id}
                    className={`border-t border-slate-100 transition ${
                      isSelected ? "bg-slate-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-slate-500">{formatPrice(item.price)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300"
                        onClick={() => setSelectedId(item.id)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Formulario</p>
            <h2 className="text-lg font-semibold">
              {selectedTreatment ? "Editar tratamiento" : "Nuevo tratamiento"}
            </h2>
          </div>
          {selectedTreatment && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Cancelar
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
          <div>
            <input
              value={form.id}
              onChange={(event) => handleFieldChange("id", event.target.value)}
              placeholder="Id (ej:  hipertensión )"
              disabled={Boolean(selectedTreatment)}
              className={`w-full rounded-xl border px-3 py-2 text-sm ${
                errors.id ? "border-rose-300" : "border-slate-200"
              } ${selectedTreatment ? "bg-slate-100 text-slate-500" : ""}`}
            />
            {errors.id && <p className="mt-1 text-xs text-rose-500">{errors.id}</p>}
          </div>
          <div>
            <input
              value={form.name}
              onChange={(event) => handleFieldChange("name", event.target.value)}
              placeholder="Nombre"
              className={`w-full rounded-xl border px-3 py-2 text-sm ${
                errors.name ? "border-rose-300" : "border-slate-200"
              }`}
            />
            {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
          </div>
          <div>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(event) => handleFieldChange("price", event.target.value)}
              placeholder="Precio"
              className={`w-full rounded-xl border px-3 py-2 text-sm ${
                errors.price ? "border-rose-300" : "border-slate-200"
              }`}
            />
            {errors.price && <p className="mt-1 text-xs text-rose-500">{errors.price}</p>}
          </div>

          {apiError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {apiError}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? "Guardando..." : selectedTreatment ? "Guardar cambios" : "Crear tratamiento"}
          </button>
        </form>
      </div>

      {successMessage && (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {successMessage}
        </div>
      )}
    </div>
  );
}
