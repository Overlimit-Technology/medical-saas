"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DeleteIconButton } from "@/presentation/common/DeleteIconButton";
import { usePatientsViewModel, formatRelativeDate } from "./PatientsViewModel";

type PatientsTab = "patients" | "imaging";

type SessionRole = "ADMIN" | "DOCTOR" | "SECRETARY" | null;

type ImagingUploadForm = {
  studyName: string;
  patientId: string;
  observation: string;
  status: "pendiente" | "completado";
};

type ImagingStudy = {
  title: string;
  patientId?: string | null;
  patient: string;
  date: string;
  doctor: string;
  status: "pendiente" | "completado";
  imageUrl: string | null;
};

type ImagingRecentItem = {
  name: string;
  patientId?: string | null;
  patient: string;
  time: string;
};

const EMPTY_IMAGING_FORM: ImagingUploadForm = {
  studyName: "",
  patientId: "",
  observation: "",
  status: "pendiente",
};

const IMAGING_SUMMARY = [
  { label: "Estudios este mes", value: "24", hint: "+12% vs mes anterior" },
  { label: "Pendientes", value: "3", hint: "Por completar" },
  { label: "Almacenamiento", value: "2.4 GB", hint: "de 10 GB disponibles" },
  { label: "Imagenes totales", value: "156", hint: "+8 esta semana" },
];

const IMAGING_ACTIONS = ["Subir", "Escanear", "Explorar", "Compartir"];

const IMAGING_RECENT: ImagingRecentItem[] = [];

const IMAGING_STUDIES: ImagingStudy[] = [
  {
    title: "Radiografia Panoramica",
    patient: "Maria Gonzalez",
    date: "05-04-2026",
    doctor: "Dra. Valentina Soto",
    status: "completado",
    imageUrl: null,
  },
  {
    title: "Radiografia Periapical",
    patient: "Carlos Mendoza",
    date: "04-04-2026",
    doctor: "Dr. Andres Muñoz",
    status: "completado",
    imageUrl: null,
  },
  {
    title: "Tomografia Cone Beam",
    patient: "Ana Martinez",
    date: "03-04-2026",
    doctor: "Dra. Valentina Soto",
    status: "pendiente",
    imageUrl: null,
  },
];

const IMAGING_STORAGE_KEY = "medical-saas.imaging.studies";
const IMAGING_RECENT_STORAGE_KEY = "medical-saas.imaging.recent";

function ImagingPreview({ imageUrl, index }: { imageUrl: string | null; index: number }) {
  const backgrounds = [
    "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.9),transparent_26%),linear-gradient(135deg,#1f2937,#6b7280)]",
    "bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.85),transparent_24%),linear-gradient(135deg,#111827,#4b5563)]",
    "bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.82),transparent_24%),linear-gradient(135deg,#374151,#9ca3af)]",
  ];

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Vista previa del estudio"
        className="h-28 w-full rounded-2xl border border-slate-200 object-cover shadow-inner"
      />
    );
  }

  return (
    <div
      className={`h-28 rounded-2xl border border-slate-200 ${backgrounds[index % backgrounds.length]} shadow-inner`}
    />
  );
}

function formatTodayLabel() {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

function getPatientFullName(patient: {
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
}) {
  return [patient.firstName, patient.lastName, patient.secondLastName ?? ""].join(" ").trim();
}

function roleLabel(role: SessionRole, isSuperAdmin: boolean) {
  if (role === "ADMIN") return isSuperAdmin ? "Super Admin" : "Admin";
  if (role === "DOCTOR") return "Doctor";
  if (role === "SECRETARY") return "Secretary";
  return "Sin sesión";
}

function ImagingSection({
  patients,
  selectedPatientId,
  onSelectPatient,
  onBackToPatients,
}: {
  patients: Array<{
    id: string;
    firstName: string;
    lastName: string;
    secondLastName?: string | null;
  }>;
  selectedPatientId: string | null;
  onSelectPatient: (patientId: string | null) => void;
  onBackToPatients: () => void;
}) {
  const [studies, setStudies] = useState<ImagingStudy[]>(IMAGING_STUDIES.slice(0, 0));
  const [recentItems, setRecentItems] = useState<ImagingRecentItem[]>(IMAGING_RECENT.slice(0, 0));
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState<ImagingUploadForm>(EMPTY_IMAGING_FORM);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittingUpload, setSubmittingUpload] = useState(false);
  const [sessionName, setSessionName] = useState("Cargando...");
  const [sessionRole, setSessionRole] = useState<SessionRole>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );
  const selectedPatientName = selectedPatient ? getPatientFullName(selectedPatient) : null;

  const filteredStudies = useMemo(() => {
    if (!selectedPatientId || !selectedPatientName) return studies;

    return studies.filter(
      (study) => study.patientId === selectedPatientId || study.patient === selectedPatientName
    );
  }, [selectedPatientId, selectedPatientName, studies]);

  const filteredRecentItems = useMemo(() => {
    if (!selectedPatientId || !selectedPatientName) return recentItems;

    return recentItems.filter(
      (item) => item.patientId === selectedPatientId || item.patient === selectedPatientName
    );
  }, [recentItems, selectedPatientId, selectedPatientName]);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok || !data?.ok) {
          setSessionName("Sin sesión");
          setSessionRole(null);
          setIsSuperAdmin(false);
          return;
        }

        setSessionName(data.profileName ?? "Usuario actual");
        setSessionRole((data.session?.role as SessionRole) ?? null);
        setIsSuperAdmin(data.session?.isSuperAdmin === true);
      } catch {
        setSessionName("Sin sesión");
        setSessionRole(null);
        setIsSuperAdmin(false);
      }
    };

    void loadSession();
  }, []);

  useEffect(() => {
    try {
      const storedStudies = window.localStorage.getItem(IMAGING_STORAGE_KEY);
      const storedRecent = window.localStorage.getItem(IMAGING_RECENT_STORAGE_KEY);

      if (storedStudies) {
        const parsedStudies = JSON.parse(storedStudies) as ImagingStudy[];
        setStudies(Array.isArray(parsedStudies) ? parsedStudies : []);
      }

      if (storedRecent) {
        const parsedRecent = JSON.parse(storedRecent) as ImagingRecentItem[];
        setRecentItems(Array.isArray(parsedRecent) ? parsedRecent : []);
      }
    } catch {
      setStudies([]);
      setRecentItems([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(IMAGING_STORAGE_KEY, JSON.stringify(studies));
  }, [studies]);

  useEffect(() => {
    window.localStorage.setItem(IMAGING_RECENT_STORAGE_KEY, JSON.stringify(recentItems));
  }, [recentItems]);

  const handleOpenModal = () => {
    setSelectedFile(null);
    setForm({
      ...EMPTY_IMAGING_FORM,
      patientId: selectedPatientId ?? "",
    });
    setSubmitError(null);
    setIsUploadModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    setSelectedFile(null);
    setForm(EMPTY_IMAGING_FORM);
    setSubmitError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedFile) {
      setSubmitError("La imagen a subir es obligatoria.");
      return;
    }

    if (!form.studyName.trim()) {
      setSubmitError("El nombre del estudio es obligatorio.");
      return;
    }

    const uploadPatient = patients.find((patient) => patient.id === form.patientId) ?? null;
    const patientName = uploadPatient
      ? getPatientFullName(uploadPatient)
      : "Sin paciente asociado";

    const uploadedBy = sessionRole === "DOCTOR" ? sessionName : "Admin";
    const fileName = selectedFile.name;

    setSubmittingUpload(true);
    setSubmitError(null);

    let imageUrl: string | null = null;
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", selectedFile);

      const response = await fetch("/api/imaging/upload", {
        method: "POST",
        credentials: "include",
        body: uploadFormData,
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; assetUrl?: string; error?: string }
        | null;

      if (!response.ok || !data?.ok || !data.assetUrl) {
        setSubmitError(data?.error ?? "No se pudo subir la imagenologia.");
        setSubmittingUpload(false);
        return;
      }

      imageUrl = data.assetUrl;
    } catch {
      setSubmitError("No se pudo subir la imagenologia.");
      setSubmittingUpload(false);
      return;
    }

    if (uploadPatient?.id) {
      try {
        await fetch(`/api/patients/${uploadPatient.id}/imaging`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            studyName: form.studyName.trim(),
            doctorName: uploadedBy,
            status: form.status,
            imageUrl,
            observation: form.observation.trim() || null,
          }),
        });
      } catch {
        // no bloquear el flujo si falla el guardado en BD
      }
    }

    setStudies((current) => [
      {
        title: form.studyName.trim(),
        patientId: uploadPatient?.id ?? null,
        patient: patientName,
        date: formatTodayLabel(),
        doctor: uploadedBy,
        status: form.status,
        imageUrl,
      },
      ...current,
    ]);

    setRecentItems((current) => [
      {
        name: fileName,
        patientId: uploadPatient?.id ?? null,
        patient: patientName,
        time: "Hoy",
      },
      ...current.slice(0, 4),
    ]);

    setSubmittingUpload(false);
    handleCloseModal();
  };

  const handleMarkAsCompleted = (studyTitle: string, studyDate: string) => {
    setStudies((current) =>
      current.map((study) =>
        study.title === studyTitle && study.date === studyDate
          ? { ...study, status: "completado" }
          : study
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Historial paciente</p>
            <h2 className="text-2xl font-semibold text-slate-900">
              {selectedPatientName ? `Imagenologia de ${selectedPatientName}` : "Imagenologia"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              {selectedPatientName
                ? "Panel filtrado con los estudios de imagen del paciente seleccionado."
                : "Gestiona radiografias, tomografias y estudios de imagen desde un solo lugar."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selectedPatientName ? (
              <>
                <button
                  type="button"
                  onClick={() => onSelectPatient(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Ver todas
                </button>
                <button
                  type="button"
                  onClick={onBackToPatients}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Volver a pacientes
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={handleOpenModal}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Subir imagenologia
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {IMAGING_SUMMARY.map((item) => {
          const dynamicValue =
            item.label === "Pendientes"
              ? `${filteredStudies.filter((study) => study.status === "pendiente").length}`
              : item.label === "Imagenes totales"
                ? `${filteredStudies.length}`
                : item.value;

          return (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              {item.label}
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">{dynamicValue}</p>
            <p className="mt-2 text-sm text-emerald-500">{item.hint}</p>
          </article>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Acciones rapidas</h3>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {IMAGING_ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={action === "Subir" ? handleOpenModal : undefined}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-6 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                >
                  {action}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-xl font-semibold text-slate-900">Imagenes recientes</h3>
            </div>
            <div className="space-y-4 px-5 py-5">
              {filteredRecentItems.length === 0 ? (
                <p className="text-sm text-slate-400">Aun no hay imagenes recientes cargadas.</p>
              ) : (
                filteredRecentItems.map((item) => (
                  <article key={`${item.name}-${item.time}`} className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M7 3h7l5 5v13H7z" />
                        <path d="M14 3v5h5" />
                        <circle cx="12" cy="14" r="2.5" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-500">{item.patient}</p>
                    </div>
                    <span className="text-xs text-slate-400">{item.time}</span>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-5">
            <h3 className="text-xl font-semibold text-slate-900">
              {selectedPatientName ? `Estudios de ${selectedPatientName}` : "Estudios de imagen"}
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  readOnly
                  value=""
                  placeholder="Buscar estudios..."
                  className="w-64 rounded-full border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-4 text-sm outline-none"
                />
              </div>
              <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                {selectedPatientName ? "Paciente filtrado" : "Todos"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 px-5 py-4">
            {["Todos", "Hoy", "Esta semana", "Pendientes"].map((filter, index) => (
              <span
                key={filter}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  index === 0 ? "bg-slate-100 text-slate-900" : "text-slate-500"
                }`}
              >
                {filter}
              </span>
            ))}
          </div>

          <div className="grid gap-4 px-5 pb-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredStudies.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-sm text-slate-400">
                {selectedPatientName
                  ? "Este paciente aun no tiene estudios cargados. Usa \"Subir imagenologia\" para agregar el primero."
                  : "Aun no hay estudios cargados. Usa \"Subir imagenologia\" para agregar el primero."}
              </div>
            ) : (
              filteredStudies.map((study, index) => (
                <article
                  key={`${study.title}-${study.patient}-${study.date}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <ImagingPreview imageUrl={study.imageUrl} index={index} />
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <h4 className="text-xl font-semibold leading-7 text-slate-900">{study.title}</h4>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        study.status === "completado"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {study.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{study.patient}</p>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                    <span>{study.date}</span>
                    <span>{study.doctor}</span>
                  </div>
                  {study.status === "pendiente" ? (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => handleMarkAsCompleted(study.title, study.date)}
                        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        Marcar como completado
                      </button>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
            onClick={handleCloseModal}
          />
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Imagenologia</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900">Subir imagenologia</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Completa los datos del estudio. Usuario, rol y fecha se completan automáticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Imagen a subir
                </label>
                <input
                  type="file"
                  accept="image/*,.dcm"
                  onChange={(event) => {
                    setSelectedFile(event.target.files?.[0] ?? null);
                    setSubmitError(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-3 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Obligatorio. Acepta imagenes y archivos DICOM.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Nombre del estudio
                </label>
                <input
                  value={form.studyName}
                  onChange={(event) => setForm((current) => ({ ...current, studyName: event.target.value }))}
                  placeholder="Radiografia panoramica, Tomografia Cone Beam..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Usuario que sube
                </label>
                <input
                  value={sessionName}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Rol
                </label>
                <input
                  value={roleLabel(sessionRole, isSuperAdmin)}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Fecha
                </label>
                <input
                  value={formatTodayLabel()}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Estado
                </label>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as ImagingUploadForm["status"],
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="completado">Completado</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Paciente
                </label>
                <select
                  value={form.patientId}
                  onChange={(event) => setForm((current) => ({ ...current, patientId: event.target.value }))}
                  disabled={Boolean(selectedPatientId)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm"
                >
                  <option value="">
                    {selectedPatientName ? selectedPatientName : "Selecciona un paciente de la sede (opcional)"}
                  </option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {getPatientFullName(patient)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Observacion
                </label>
                <textarea
                  value={form.observation}
                  onChange={(event) => setForm((current) => ({ ...current, observation: event.target.value }))}
                  rows={4}
                  placeholder="Observacion opcional del estudio..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {submitError && (
                <div className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                  {submitError}
                </div>
              )}

              <div className="md:col-span-2 flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingUpload}
                  className="flex-1 rounded-full bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {submittingUpload ? "Subiendo..." : "Guardar estudio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function Patients() {
  const router = useRouter();
  const { state, actions } = usePatientsViewModel();
  const [activeTab, setActiveTab] = useState<PatientsTab>("patients");
  const [selectedImagingPatientId, setSelectedImagingPatientId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Modulo clinico</p>
            <h1 className="text-2xl font-semibold text-slate-900">Historial paciente</h1>
            <p className="mt-2 text-sm text-slate-500">
              Revisa pacientes e imagenologia desde una misma vista.
            </p>
          </div>

          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("patients")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === "patients" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pacientes
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedImagingPatientId(null);
                setActiveTab("imaging");
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === "imaging" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Imagenologia
            </button>
          </div>
        </div>
      </div>

      {activeTab === "imaging" ? (
        <ImagingSection
          patients={state.items}
          selectedPatientId={selectedImagingPatientId}
          onSelectPatient={setSelectedImagingPatientId}
          onBackToPatients={() => setActiveTab("patients")}
        />
      ) : (
        <>
          <div className="rounded-2xl border border-slate-100 bg-white px-6 pb-6 pt-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">Lista de pacientes de la sede</h2>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-slate-400">{state.totalLabel}</span>
                  {state.headerHint && (
                    <span className="text-xs text-slate-400">&middot; {state.headerHint}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input
                    value={state.query}
                    onChange={(event) => actions.handleSearchChange(event.target.value)}
                    placeholder="Buscar"
                    className="w-48 rounded-full border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:w-64 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <button
                onClick={actions.openCreateModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                aria-label="Nuevo paciente"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </button>
            </div>

            <div className="mt-0 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">RUN</th>
                    <th className="px-4 py-3 font-medium">Telefono</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {state.loading && (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400" colSpan={5}>
                        Cargando pacientes...
                      </td>
                    </tr>
                  )}
                  {!state.loading && state.items.length === 0 && !state.query.trim() && (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400" colSpan={5}>
                        No hay pacientes registrados.
                      </td>
                    </tr>
                  )}
                  {!state.loading && state.items.length === 0 && state.query.trim() && (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400" colSpan={5}>
                        No se encontraron pacientes con ese criterio.
                      </td>
                    </tr>
                  )}
                  {state.items.map((patient, idx) => {
                    const initials = `${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`.toUpperCase();
                    return (
                      <tr
                        key={patient.id}
                        style={{ animationDelay: `${idx * 25}ms` }}
                        className="animate-card-in group cursor-pointer border-b border-slate-50 transition-colors last:border-b-0 hover:bg-slate-50/70"
                        onClick={() => router.push(`/patients/${patient.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                              {initials}
                            </div>
                            <div>
                              <span className="font-medium text-slate-800">
                                {patient.firstName} {patient.lastName}{" "}
                                {patient.secondLastName && (
                                  <span className="text-slate-400">{patient.secondLastName}</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{patient.run}</td>
                        <td className="px-4 py-3 text-slate-500">{patient.phone ?? "-"}</td>
                        <td className="px-4 py-3">
                          <span className="text-slate-400">{formatRelativeDate(patient.createdAt)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="rounded-full border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
                              onClick={() => router.push(`/patients/${patient.id}`)}
                            >
                              Ver Perfil Completo
                            </button>
                            <button
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                              onClick={() => actions.openEditModal(patient)}
                            >
                              Editar
                            </button>
                            <DeleteIconButton
                              ariaLabel={`Eliminar ${patient.firstName}`}
                              onClick={() => actions.setDeleteTarget(patient)}
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

          {state.isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={actions.closeModal} />
              <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-800"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>

                <form onSubmit={actions.handleSubmit} className="grid gap-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Nombre</label>
                      <input value={state.form.firstName} onChange={(e) => actions.handleFieldChange("firstName", e.target.value)} placeholder="Nombre" className={`w-full rounded-xl border bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 ${state.errors.firstName ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-blue-400"}`} />
                      {state.errors.firstName && <p className="mt-1 text-[11px] text-rose-500">{state.errors.firstName}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Primer apellido</label>
                      <input value={state.form.lastName} onChange={(e) => actions.handleFieldChange("lastName", e.target.value)} placeholder="Apellido" className={`w-full rounded-xl border bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 ${state.errors.lastName ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-blue-400"}`} />
                      {state.errors.lastName && <p className="mt-1 text-[11px] text-rose-500">{state.errors.lastName}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Segundo apellido</label>
                      <input value={state.form.secondLastName} onChange={(e) => actions.handleFieldChange("secondLastName", e.target.value)} placeholder="Opcional" className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">RUN</label>
                    <input value={state.form.run} onChange={(e) => actions.handleFieldChange("run", e.target.value)} onBlur={actions.handleRunBlur} placeholder="Por favor ingresar RUN" className={`w-full rounded-xl border bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 ${state.errors.run ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-blue-400"}`} />
                    {state.errors.run && <p className="mt-1 text-[11px] text-rose-500">{state.errors.run}</p>}
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Correo</label>
                    <input value={state.form.email} onChange={(e) => actions.handleFieldChange("email", e.target.value)} placeholder="Por favor ingresar un correo" className={`w-full rounded-xl border bg-slate-50/40 px-3 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 ${state.errors.email ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-blue-400"}`} />
                    {state.errors.email && <p className="mt-1 text-[11px] text-rose-500">{state.errors.email}</p>}
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">Numero de telefono</label>
                    <div className="relative">
                      <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                      <input value={state.form.phone} onChange={(e) => actions.handleFieldChange("phone", e.target.value)} placeholder="+56 9 1234 5678" className={`w-full rounded-xl border bg-slate-50/40 py-2.5 pl-9 pr-3 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 ${state.errors.phone ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-blue-400"}`} />
                    </div>
                    {state.errors.phone && <p className="mt-1 text-[11px] text-rose-500">{state.errors.phone}</p>}
                  </div>

                  {state.apiError && (
                    <div className="animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                      {state.apiError}
                    </div>
                  )}

                  <div className="mt-2 flex gap-3">
                    <button type="button" onClick={actions.closeModal} className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800">
                      Cancelar
                    </button>
                    <button type="submit" disabled={state.isSubmitDisabled} className="flex-1 rounded-full bg-slate-900 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none">
                      {state.saving ? "Guardando..." : state.selected ? "Actualizar" : "Guardar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {state.successMessage && (
            <div className="animate-fade-in fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/30">
              {state.successMessage}
            </div>
          )}

          {state.deleteTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={actions.dismissDeleteModal} />
              <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
                <h3 className="text-lg font-semibold text-slate-900">Eliminar paciente</h3>
                <p className="mt-2 text-sm text-slate-500">
                  ¿Estas seguro de eliminar al paciente {state.deleteTarget.firstName} {state.deleteTarget.lastName}?
                  Esta accion no se puede deshacer.
                </p>
                {state.deleteError && (
                  <div className="mt-4 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                    {state.deleteError}
                  </div>
                )}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button onClick={actions.dismissDeleteModal} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800">
                    Cancelar
                  </button>
                  <button onClick={actions.handleDelete} className="rounded-full bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-500/20">
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
