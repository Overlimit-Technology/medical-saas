"use client";

import { useEffect, useMemo, useState } from "react";
import { DeleteIconButton } from "@/presentation/common/DeleteIconButton";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  run: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
};

type FormState = {
  firstName: string;
  lastName: string;
  secondLastName: string;
  run: string;
  email: string;
  phone: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  secondLastName: "",
  run: "",
  email: "",
  phone: "",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^(\+?56)?\s?9\s?\d{4}\s?\d{4}$/;

function normalizeRun(value: string) {
  return value.replace(/\./g, "").replace(/-/g, "").toUpperCase();
}

function formatRun(value: string) {
  const clean = normalizeRun(value);
  if (clean.length < 2) return value.toUpperCase();
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}

function isValidRun(value: string) {
  const clean = normalizeRun(value);
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const mod = 11 - (sum % 11);
  const expected = mod === 11 ? "0" : mod === 10 ? "K" : `${mod}`;
  return dv === expected;
}

function validateForm(form: FormState) {
  const errors: FormErrors = {};
  if (!form.firstName.trim()) errors.firstName = "Nombre obligatorio.";
  if (!form.lastName.trim()) errors.lastName = "Apellido obligatorio.";
  if (!form.run.trim()) {
    errors.run = "RUN obligatorio.";
  } else if (!isValidRun(form.run)) {
    errors.run = "RUN invÃ¡lido. Ej: 12.345.678-5";
  }
  if (form.email && !emailRegex.test(form.email)) {
    errors.email = "Correo invÃ¡lido.";
  }
  if (form.phone && !phoneRegex.test(form.phone)) {
    errors.phone = "TelÃ©fono invÃ¡lido. Ej: +56 9 1234 5678";
  }
  return errors;
}

export default function PatientsPage() {
  const [items, setItems] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const loadPatients = async (q?: string) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(
        `/api/patients?q=${encodeURIComponent(q ?? "")}&page=1&pageSize=200`
      );
      const data = await res.json();
      if (data.ok) {
        setItems(data.items ?? []);
        if (!q) {
          setTotalCount(data.total ?? data.items?.length ?? 0);
        }
      } else {
        setApiError(data.error ?? "No se pudieron cargar los pacientes.");
      }
    } catch {
      setApiError("No se pudieron cargar los pacientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  useEffect(() => {
    if (selected) {
      setForm({
        firstName: selected.firstName,
        lastName: selected.lastName,
        secondLastName: selected.secondLastName ?? "",
        run: selected.run,
        email: selected.email ?? "",
        phone: selected.phone ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setApiError(null);
  }, [selected]);

  const handleFieldChange = (key: keyof FormState, value: string) => {
    const next = { ...form, [key]: value };
    setForm(next);
    if (errors[key]) {
      const nextErrors = { ...errors };
      delete nextErrors[key];
      setErrors(nextErrors);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setApiError(null);

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      secondLastName: form.secondLastName.trim() || null,
      run: formatRun(form.run),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
    };

    try {
      const res = await fetch(selected ? `/api/patients/${selected.id}` : "/api/patients", {
        method: selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudo guardar el paciente.");
        return;
      }
      const savedMessage = selected
        ? "Paciente actualizado exitosamente."
        : "Paciente guardado exitosamente.";
      setSelected(null);
      setForm(EMPTY_FORM);
      setSuccessMessage(
        data.notificationWarning
          ? `${savedMessage} Aviso: ${data.notificationWarning}`
          : savedMessage
      );
      await loadPatients(query);
    } catch {
      setApiError("No se pudo guardar el paciente.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      const res = await fetch(`/api/patients/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        setDeleteError(data.error ?? "No se pudo eliminar el paciente.");
        return;
      }
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
      setDeleteError(null);
      setSuccessMessage(
        data.softDeleted
          ? "Paciente desactivado."
          : data.deletedAppointments > 0
            ? "Paciente eliminado y citas pasadas removidas de agenda."
            : "Paciente eliminado."
      );
      await loadPatients(query);
    } catch {
      setDeleteError("No se pudo eliminar el paciente.");
    }
  };

  const totalLabel = `${totalCount} paciente${totalCount === 1 ? "" : "s"}`;
  const isSubmitDisabled = saving || Object.keys(validateForm(form)).length > 0;

  const headerHint = useMemo(() => {
    if (!query.trim()) return null;
    return `${items.length} resultado${items.length === 1 ? "" : "s"} para "${query}"`;
  }, [items.length, query]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.8fr_1fr]">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Lista de pacientes</p>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-slate-900">Pacientes</h1>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                {totalLabel}
              </span>
              {headerHint && <span className="text-xs text-slate-400">{headerHint}</span>}
            </div>
          </div>
          <input
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              loadPatients(value);
            }}
            placeholder="Buscar por nombre o RUN"
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-slate-400"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre completo</th>
                <th className="px-4 py-3 font-medium">RUN</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="transition-all">
              {loading && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={4}>
                    Cargando pacientes...
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && !query.trim() && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={4}>
                    No hay pacientes registrados. Â¡Crea el primero!
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && query.trim() && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={4}>
                    No se encontraron pacientes con ese criterio.
                  </td>
                </tr>
              )}
              {items.map((patient) => (
                <tr
                  key={patient.id}
                  className={`border-t border-slate-100 transition ${
                    selected?.id === patient.id ? "bg-slate-50" : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {patient.firstName} {patient.lastName} {patient.secondLastName}
                    </div>
                    <div className="text-xs text-slate-400">{patient.id}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{patient.run}</td>
                  <td className="px-4 py-3 text-slate-500">
                    <div>{patient.email ?? "-"}</div>
                    <div>{patient.phone ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300"
                        onClick={() => setSelected(patient)}
                      >
                        Editar
                      </button>
                      <DeleteIconButton
                        ariaLabel={`Eliminar ${patient.firstName}`}
                        onClick={() => {
                          setDeleteTarget(patient);
                          setDeleteError(null);
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Formulario</p>
            <h2 className="text-lg font-semibold">
              {selected ? "Editar paciente" : "Nuevo paciente"}
            </h2>
          </div>
          {selected && (
            <button
              className="text-xs text-slate-500 hover:text-slate-900"
              onClick={() => setSelected(null)}
            >
              Limpiar
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                value={form.firstName}
                onChange={(event) => handleFieldChange("firstName", event.target.value)}
                placeholder="Nombre"
                className={`w-full rounded-xl border px-3 py-2 text-sm ${
                  errors.firstName ? "border-rose-300" : "border-slate-200"
                }`}
              />
              {errors.firstName && <p className="mt-1 text-xs text-rose-500">{errors.firstName}</p>}
            </div>
            <div>
              <input
                value={form.lastName}
                onChange={(event) => handleFieldChange("lastName", event.target.value)}
                placeholder="Apellido"
                className={`w-full rounded-xl border px-3 py-2 text-sm ${
                  errors.lastName ? "border-rose-300" : "border-slate-200"
                }`}
              />
              {errors.lastName && <p className="mt-1 text-xs text-rose-500">{errors.lastName}</p>}
            </div>
          </div>
          <input
            value={form.secondLastName}
            onChange={(event) => handleFieldChange("secondLastName", event.target.value)}
            placeholder="Segundo apellido"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div>
            <input
              value={form.run}
              onChange={(event) => handleFieldChange("run", event.target.value)}
              onBlur={() => setForm((prev) => ({ ...prev, run: formatRun(prev.run) }))}
              placeholder="RUN"
              className={`w-full rounded-xl border px-3 py-2 text-sm ${
                errors.run ? "border-rose-300" : "border-slate-200"
              }`}
            />
            {errors.run && <p className="mt-1 text-xs text-rose-500">{errors.run}</p>}
          </div>
          <div>
            <input
              value={form.email}
              onChange={(event) => handleFieldChange("email", event.target.value)}
              placeholder="Correo"
              className={`w-full rounded-xl border px-3 py-2 text-sm ${
                errors.email ? "border-rose-300" : "border-slate-200"
              }`}
            />
            {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
          </div>
          <div>
            <input
              value={form.phone}
              onChange={(event) => handleFieldChange("phone", event.target.value)}
              placeholder="TelÃ©fono"
              className={`w-full rounded-xl border px-3 py-2 text-sm ${
                errors.phone ? "border-rose-300" : "border-slate-200"
              }`}
            />
            {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>}
          </div>
          {apiError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {apiError}
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? "Guardando..." : selected ? "Actualizar" : "Guardar"}
          </button>
        </form>
      </div>

      {successMessage && (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {successMessage}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => {
              setDeleteTarget(null);
              setDeleteError(null);
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/20">
            <h3 className="text-lg font-semibold text-slate-900">Eliminar paciente</h3>
            <p className="mt-2 text-sm text-slate-600">
              Â¿EstÃ¡s seguro de eliminar al paciente {deleteTarget.firstName} {deleteTarget.lastName}?
              Esta acciÃ³n no se puede deshacer.
            </p>
            {deleteError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

