"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

type Doctor = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  profile?: { firstName: string; lastName: string; phone?: string | null; rut?: string | null } | null;
  doctorProfile?: { rut: string; specialty?: string | null; bio?: string | null } | null;
};

type EditForm = {
  firstName: string;
  lastName: string;
  phone: string;
  rut: string;
  specialty: string;
};

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="block text-[11px] text-slate-400">{label}</span>
      <span className="block text-sm font-medium text-slate-900">{value || "-"}</span>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/30 px-4 py-3">
      <label className="block text-[11px] text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 block w-full border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-300"
        placeholder="-"
      />
    </div>
  );
}

export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm>({ firstName: "", lastName: "", phone: "", rut: "", specialty: "" });
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadDoctor = useCallback(async () => {
    const res = await fetch(`/api/doctors/${id}`);
    const data = await res.json();
    if (data.ok) {
      setDoctor(data.item);
      populateForm(data.item);
    }
    setLoading(false);
  }, [id]);

  function populateForm(d: Doctor) {
    setForm({
      firstName: d.profile?.firstName ?? "",
      lastName: d.profile?.lastName ?? "",
      phone: d.profile?.phone ?? "",
      rut: d.doctorProfile?.rut ?? d.profile?.rut ?? "",
      specialty: d.doctorProfile?.specialty ?? "",
    });
  }

  useEffect(() => {
    loadDoctor();
  }, [loadDoctor]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const startEditing = () => {
    if (doctor) populateForm(doctor);
    setApiError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    if (doctor) populateForm(doctor);
    setEditing(false);
    setApiError(null);
  };

  const handleFieldChange = (key: keyof EditForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveChanges = async () => {
    setSaving(true);
    setApiError(null);
    try {
      const res = await fetch(`/api/doctors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || null,
          rut: form.rut.trim(),
          specialty: form.specialty.trim() || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setApiError(data.error ?? "No se pudo actualizar.");
        return;
      }
      setEditing(false);
      setSuccessMessage("Usuario actualizado exitosamente.");
      await loadDoctor();
    } catch {
      setApiError("No se pudo actualizar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        setDeleteError(data.error ?? "No se pudo eliminar.");
        return;
      }
      router.push("/doctors");
    } catch {
      setDeleteError("No se pudo eliminar.");
    } finally {
      setDeleting(false);
    }
  };

  const goBack = () => router.push("/doctors");

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-lg bg-slate-100" />
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-50" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-slate-400">Usuario no encontrado.</p>
          <button
            onClick={goBack}
            className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition-colors hover:border-slate-300"
          >
            Volver a usuarios
          </button>
        </div>
      </div>
    );
  }

  const isDoctor = doctor.role === "DOCTOR";
  const Field = editing ? EditableField : ReadOnlyField;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Navegación */}
      <div className="flex items-center gap-3">
        <button
          onClick={goBack}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="text-sm text-slate-400">Usuarios</span>
        <span className="text-sm text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">
          {doctor.profile?.firstName} {doctor.profile?.lastName}
        </span>
      </div>

      {/* ── Detalles del usuario ── */}
      <div className="rounded-2xl border border-slate-100 bg-white px-6 pb-6 pt-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Detalles del usuario</h2>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${isDoctor ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>
              {isDoctor ? "Doctor" : "Secretaria"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                onClick={startEditing}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
              >
                Editar
              </button>
            )}
            {editing && (
              <>
                <button
                  onClick={cancelEditing}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveChanges}
                  disabled={saving}
                  className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition-all hover:bg-slate-800 disabled:bg-slate-400"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </>
            )}
          </div>
        </div>

        {apiError && (
          <div className="mt-3 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
            {apiError}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Field
            label="Nombre"
            value={editing ? form.firstName : doctor.profile?.firstName ?? ""}
            onChange={(v) => handleFieldChange("firstName", v)}
          />
          <Field
            label="Apellido"
            value={editing ? form.lastName : doctor.profile?.lastName ?? ""}
            onChange={(v) => handleFieldChange("lastName", v)}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <ReadOnlyField label="Correo electrónico" value={doctor.email} />
          <Field
            label="Teléfono"
            value={editing ? form.phone : doctor.profile?.phone ?? ""}
            onChange={(v) => handleFieldChange("phone", v)}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field
            label="RUN"
            value={editing ? form.rut : doctor.doctorProfile?.rut ?? doctor.profile?.rut ?? ""}
            onChange={(v) => handleFieldChange("rut", v)}
          />
          {isDoctor ? (
            <Field
              label="Especialidad"
              value={editing ? form.specialty : doctor.doctorProfile?.specialty ?? ""}
              onChange={(v) => handleFieldChange("specialty", v)}
            />
          ) : (
            <ReadOnlyField label="Rol" value="Secretaria" />
          )}
        </div>
      </div>

      {/* ── Eliminar usuario ── */}
      <div className="rounded-2xl border border-rose-100 bg-white px-6 pb-6 pt-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Eliminar usuario</h2>
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-slate-400"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">
              Estás a punto de eliminar un usuario
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Si el usuario tiene citas futuras, será desactivado en lugar de eliminado
            </p>
          </div>
          <button
            onClick={handleDelete}
            disabled={!deleteConfirmChecked || deleting}
            className="flex-shrink-0 rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-300"
          >
            {deleting ? "Eliminando..." : "Eliminar usuario"}
          </button>
        </div>
        {deleteError && (
          <div className="mt-3 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
            {deleteError}
          </div>
        )}
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={deleteConfirmChecked}
            onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
          />
          Confirmo quiero eliminarlo
        </label>
      </div>

      {/* Toast */}
      {successMessage && (
        <div className="animate-fade-in fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
          {successMessage}
        </div>
      )}
    </div>
  );
}
