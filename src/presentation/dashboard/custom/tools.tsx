"use client";

/**
 * Herramientas del panel: widgets que no muestran una metrica sino su propio contenido.
 * - Acceso directo: un boton con icono hacia una seccion de la app.
 * - Archivos: subir, ver, renombrar, reemplazar y borrar archivos (imagenes, PDF, planillas...).
 */
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  File as FileIcon,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  GalleryHorizontal,
  List as ListIcon,
  Maximize2,
  Pencil,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
  type LucideIcon,
} from "lucide-react";
import { MAX_FILE_BYTES, MAX_FILES_PER_WIDGET, type Span, type StoredFile, type WidgetConfig } from "@/lib/dashboard/catalog";
import { IconBadge, iconOf } from "./icons";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

// ---------------------------------------------------------------------------
// Acceso directo
// ---------------------------------------------------------------------------

/** Secciones de la app a las que puede llevar un acceso directo, con su icono sugerido. */
export const DESTINATIONS: Array<{ href: string; label: string; icon: string }> = [
  { href: "/agenda", label: "Agenda", icon: "calendar-days" },
  { href: "/patients", label: "Historial paciente", icon: "users" },
  { href: "/seguimiento", label: "Seguimiento", icon: "activity" },
  { href: "/crm", label: "CRM", icon: "kanban" },
  { href: "/chat", label: "Mensajería interna", icon: "message-circle" },
  { href: "/notifications", label: "Notificaciones", icon: "bell" },
  { href: "/portal-paciente", label: "Portal paciente", icon: "heart-pulse" },
  { href: "/treatments", label: "Tratamientos", icon: "syringe" },
  { href: "/boxes", label: "Boxes", icon: "door-open" },
  { href: "/liquidaciones", label: "Liquidaciones", icon: "receipt" },
  { href: "/vacaciones", label: "Vacaciones", icon: "plane" },
  { href: "/clinic-dashboard/clinica", label: "Mi clínica", icon: "building-2" },
  { href: "/configuracion", label: "Configuración", icon: "settings" },
];

export function ShortcutWidget({ widget, span, interactive }: { widget: WidgetConfig; span: Span; interactive: boolean }) {
  const link = widget.link ?? { href: DESTINATIONS[0].href, label: DESTINATIONS[0].label };
  const icon = iconOf(widget);
  const big = span.w * span.h > 1;
  const body = (
    <>
      <IconBadge icon={icon} size={big ? "lg" : icon.size} className="group-hover/shortcut:-rotate-6 group-hover/shortcut:scale-110" />
      <span className="min-w-0">
        <b className="block truncate font-display text-[16px] font-bold tracking-[-0.3px] text-slate-900">{link.label}</b>
        <span className="inline-flex items-center gap-1 text-[12.5px] text-[#17656c]">
          Abrir
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/shortcut:-translate-y-0.5 group-hover/shortcut:translate-x-0.5" strokeWidth={2} />
        </span>
      </span>
    </>
  );
  const className = cx("group/shortcut flex h-full gap-3 rounded-2xl", big ? "flex-col justify-end" : "items-end");
  return interactive ? (
    <Link href={link.href} className={cx(className, "outline-none focus-visible:ring-2 focus-visible:ring-[#50c9d5]/60")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

// ---------------------------------------------------------------------------
// Archivos
// ---------------------------------------------------------------------------

const ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.svg,.pdf,.csv,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.txt,.zip";
const EXT_OK = new Set(ACCEPT.split(","));

function kindOf(file: { name: string; mime: string }): { icon: LucideIcon; label: string; tone: string } {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (file.mime.startsWith("image/")) return { icon: FileImage, label: "Imagen", tone: "bg-[#84d9e1] text-[#0d1b2a]" };
  if (ext === "pdf") return { icon: FileText, label: "PDF", tone: "bg-[#e5484d] text-white" };
  if (["csv", "xls", "xlsx"].includes(ext)) return { icon: FileSpreadsheet, label: "Planilla", tone: "bg-[#1e737b] text-white" };
  if (["doc", "docx", "txt"].includes(ext)) return { icon: FileText, label: "Documento", tone: "bg-[#0d1b2a] text-white" };
  if (ext === "zip") return { icon: FileArchive, label: "Comprimido", tone: "bg-[#e8a020] text-[#0d1b2a]" };
  return { icon: FileIcon, label: "Archivo", tone: "bg-[#e8edf1] text-[#4a5c6d]" };
}

const sizeText = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`);

/** Revisa en el navegador lo mismo que el servidor, para avisar antes de subir. */
function checkFile(file: File): string | null {
  const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  if (!EXT_OK.has(ext)) return `"${file.name}" no se puede subir: usa imágenes, PDF, planillas, documentos o ZIP.`;
  if (file.size > MAX_FILE_BYTES) return `"${file.name}" pesa ${sizeText(file.size)}. El máximo es ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
  if (file.size === 0) return `"${file.name}" está vacío.`;
  return null;
}

/** Sube con XMLHttpRequest para tener progreso. Con Cloudinary va directo a la nube con una firma. */
async function uploadFile(file: File, onProgress: (pct: number) => void): Promise<StoredFile> {
  const sign = await fetch("/api/dashboard/files/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, mime: file.type, size: file.size }),
  }).then((r) => r.json());
  if (!sign.ok) throw new Error(sign.error ?? "No se pudo preparar la subida.");

  const form = new FormData();
  form.append("file", file);
  let url = "/api/dashboard/files";
  if (sign.mode === "cloudinary") {
    form.append("api_key", sign.apiKey);
    form.append("timestamp", String(sign.timestamp));
    form.append("signature", sign.signature);
    form.append("folder", sign.folder);
    url = `https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`;
  }

  const res = await new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        resolve({ status: xhr.status, body: JSON.parse(xhr.responseText || "{}") });
      } catch {
        resolve({ status: xhr.status, body: {} });
      }
    };
    xhr.onerror = () => reject(new Error("Se cortó la conexión. Revisa tu internet e inténtalo de nuevo."));
    xhr.send(form);
  });

  if (sign.mode === "cloudinary") {
    const b = res.body as { public_id?: string; secure_url?: string; resource_type?: StoredFile["resourceType"]; bytes?: number; error?: { message?: string } };
    if (res.status >= 300 || !b.public_id || !b.secure_url) throw new Error(b.error?.message ?? "La nube rechazó el archivo.");
    return {
      id: b.public_id.split("/").pop() ?? b.public_id,
      name: file.name,
      mime: file.type || "application/octet-stream",
      size: b.bytes ?? file.size,
      url: b.secure_url,
      storage: "cloudinary",
      key: b.public_id,
      resourceType: b.resource_type,
      uploadedAt: new Date().toISOString(),
    };
  }
  const b = res.body as { ok?: boolean; file?: StoredFile; error?: string };
  if (res.status >= 300 || !b.ok || !b.file) throw new Error(b.error ?? "No se pudo subir el archivo.");
  return b.file;
}

async function removeStored(file: StoredFile) {
  const res = await fetch("/api/dashboard/files", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storage: file.storage, key: file.key, resourceType: file.resourceType }),
  }).then((r) => r.json());
  if (!res.ok) throw new Error(res.error ?? "No se pudo borrar el archivo.");
}

type Upload = { id: string; name: string; pct: number; replaces?: string };

const isPdf = (file: { name: string; mime: string }) => file.mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
/** Solo imagenes y PDF se pueden ver en miniatura dentro del panel. */
const canPreview = (file: { name: string; mime: string }) => file.mime.startsWith("image/") || isPdf(file);

/** Miniatura: la imagen recortada o la primera pagina del PDF, sin controles. */
function Thumb({ file, className }: { file: StoredFile; className?: string }) {
  if (file.mime.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={file.url} alt="" loading="lazy" className={cx("h-full w-full bg-white object-cover", className)} />;
  }
  return (
    <span className={cx("relative block h-full w-full overflow-hidden bg-white", className)}>
      <iframe
        src={`${file.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        title={`Vista previa de ${file.name}`}
        tabIndex={-1}
        className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] origin-top-left scale-[0.25] border-0"
      />
    </span>
  );
}

/** Vista grande sobre la pagina (Esc o clic afuera para cerrar). */
function PreviewModal({ file, onClose }: { file: StoredFile; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="zs-overlay-in fixed inset-0 z-[80] grid place-items-center bg-[#0d1b2a]/45 p-4 backdrop-blur-[3px]" onClick={onClose}>
      <div role="dialog" aria-label={`Vista previa de ${file.name}`} className="zs-glass-strong zs-modal-in flex max-h-[92vh] w-[min(980px,100%)] flex-col overflow-hidden rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center gap-3 border-b border-white/70 px-5 py-3">
          <b className="min-w-0 flex-1 truncate font-display text-[15px] font-bold text-slate-900">{file.name}</b>
          <a href={file.url} target="_blank" rel="noreferrer" className="zs-press grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-white hover:text-slate-900" aria-label="Abrir en otra pestaña" title="Abrir en otra pestaña">
            <ExternalLink className="h-4 w-4" strokeWidth={1.9} />
          </a>
          <button type="button" onClick={onClose} className="zs-press grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-white hover:text-slate-900" aria-label="Cerrar vista previa">
            <X className="h-5 w-5" strokeWidth={1.9} />
          </button>
        </header>
        <div className="grid min-h-0 flex-1 place-items-center bg-white/50 p-3">
          {file.mime.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.url} alt={file.name} className="max-h-[78vh] max-w-full rounded-xl object-contain" />
          ) : (
            <iframe src={file.url} title={file.name} className="h-[78vh] w-full rounded-xl border-0 bg-white" />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Visor grande dentro del widget: la imagen completa (una foto de una persona, por ejemplo) o el PDF
 * con su scroll, y flechas y miniaturas para pasar de un archivo a otro. Teclado: ← y →.
 */
function Viewer({
  items,
  index,
  onIndex,
  onExpand,
  interactive,
}: {
  items: StoredFile[];
  index: number;
  onIndex: (i: number) => void;
  onExpand: (file: StoredFile) => void;
  interactive: boolean;
}) {
  const current = items[index];
  const many = items.length > 1;
  const go = (d: number) => onIndex((index + d + items.length) % items.length);
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-2 outline-none"
      tabIndex={interactive ? 0 : -1}
      aria-label={`Visor de archivos: ${current.name}, ${index + 1} de ${items.length}`}
      onKeyDown={(e) => {
        if (!many) return;
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <div className="group/stage relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-[#0d1b2a]/[0.05] shadow-[inset_0_0_0_1px_rgba(13,27,42,.06)]">
        <div key={current.id} className="zs-viewer-in absolute inset-0 grid place-items-center">
          {current.mime.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.url} alt={current.name} className="h-full w-full object-contain" />
          ) : (
            <iframe src={`${current.url}#view=FitH`} title={current.name} className={cx("h-full w-full border-0 bg-white", !interactive && "pointer-events-none")} />
          )}
        </div>

        {/* Nombre y posicion, abajo para no tapar la barra del PDF */}
        <span className="pointer-events-none absolute bottom-2.5 left-2.5 flex max-w-[70%] items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] font-medium text-slate-900 shadow-sm backdrop-blur-md">
          <span className="truncate">{current.name}</span>
          {many ? <span className="shrink-0 tabular-nums text-slate-500">{index + 1}/{items.length}</span> : null}
        </span>

        {interactive ? (
          <button
            type="button"
            onClick={() => onExpand(current)}
            className="zs-press absolute bottom-2.5 right-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-slate-900"
            aria-label={`Ver ${current.name} en pantalla completa`}
            title="Pantalla completa"
          >
            <Maximize2 className="h-4 w-4" strokeWidth={1.9} />
          </button>
        ) : null}

        {many && interactive ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="zs-press absolute left-2.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-800 opacity-0 shadow-md backdrop-blur-md transition duration-200 hover:bg-white focus-visible:opacity-100 group-hover/stage:opacity-100"
              aria-label="Archivo anterior"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="zs-press absolute right-2.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-800 opacity-0 shadow-md backdrop-blur-md transition duration-200 hover:bg-white focus-visible:opacity-100 group-hover/stage:opacity-100"
              aria-label="Archivo siguiente"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>
          </>
        ) : null}
      </div>

      {/* Tira de miniaturas para cambiar de archivo */}
      {many ? (
        <div className="flex shrink-0 gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label="Archivos del visor">
          {items.map((file, i) => (
            <button
              key={file.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              disabled={!interactive}
              onClick={() => onIndex(i)}
              className={cx(
                "zs-press relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition duration-200",
                i === index ? "border-[#50c9d5] shadow-[0_6px_14px_-6px_rgba(80,201,213,.8)]" : "border-transparent opacity-70 hover:opacity-100"
              )}
              title={file.name}
            >
              <Thumb file={file} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FilesWidget({ widget, span, onUpdate, interactive }: { widget: WidgetConfig; span: Span; onUpdate?: (patch: Partial<WidgetConfig>) => void; interactive: boolean }) {
  const files = widget.files ?? [];
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; text: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  /** Archivos recien subidos que se pueden ver en miniatura: se pregunta uno por uno. */
  const [ask, setAsk] = useState<StoredFile[]>([]);
  const [viewing, setViewing] = useState<StoredFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceId = useRef<string | null>(null);
  // La lista mas reciente, para que varias subidas a la vez no se pisen.
  const latest = useRef(files);
  latest.current = files;
  const compact = span.w * span.h <= 2;
  const canEdit = Boolean(onUpdate) && interactive;

  const save = (next: StoredFile[]) => {
    latest.current = next;
    onUpdate?.({ files: next });
  };

  const start = async (list: FileList | File[], replaces?: StoredFile) => {
    const picked = Array.from(list);
    const problems: string[] = [];
    const room = MAX_FILES_PER_WIDGET - latest.current.length - uploads.length;
    const ok = picked.filter((f) => {
      const p = checkFile(f);
      if (p) problems.push(p);
      return !p;
    });
    if (!replaces && ok.length > room) problems.push(`Este widget admite ${MAX_FILES_PER_WIDGET} archivos. Quita algunos o añade otro widget de archivos.`);
    setErrors(problems);
    for (const file of (replaces ? ok.slice(0, 1) : ok.slice(0, Math.max(0, room)))) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setUploads((u) => [...u, { id, name: file.name, pct: 0, replaces: replaces?.id }]);
      try {
        const stored = await uploadFile(file, (pct) => setUploads((u) => u.map((x) => (x.id === id ? { ...x, pct } : x))));
        if (replaces) {
          save(latest.current.map((f) => (f.id === replaces.id ? { ...stored, name: replaces.name.replace(/\.[^.]+$/, "") + "." + (file.name.split(".").pop() ?? "") } : f)));
          removeStored(replaces).catch(() => undefined);
        } else {
          save([stored, ...latest.current]);
          if (canPreview(stored)) setAsk((q) => [...q, stored]);
        }
      } catch (error) {
        setErrors((e) => [...e, error instanceof Error ? `"${file.name}": ${error.message}` : `No se pudo subir "${file.name}".`]);
      } finally {
        setUploads((u) => u.filter((x) => x.id !== id));
      }
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    if (canEdit && e.dataTransfer.files.length) void start(e.dataTransfer.files);
  };

  const remove = async (file: StoredFile) => {
    setConfirming(null);
    try {
      await removeStored(file);
      save(latest.current.filter((f) => f.id !== file.id));
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "No se pudo borrar el archivo."]);
    }
  };

  const setPinned = (ids: string[], pinned: boolean) => {
    save(latest.current.map((f) => (ids.includes(f.id) ? { ...f, pinned } : f)));
  };
  const answer = (pin: boolean, all = false) => {
    const batch = all ? ask : ask.slice(0, 1);
    if (pin) {
      setPinned(batch.map((f) => f.id), true);
      setView("viewer");
    }
    setAsk((q) => q.slice(batch.length));
  };
  // El visor muestra los archivos marcados con "Mostrar"; si no hay ninguno, todas las imagenes y PDF.
  const viewable = files.filter(canPreview);
  const pinned = viewable.filter((f) => f.pinned);
  const inViewer = pinned.length ? pinned : viewable;
  const [localView, setLocalView] = useState<"viewer" | "list" | null>(null);
  const view = localView ?? widget.filesView ?? (viewable.length ? "viewer" : "list");
  const setView = (v: "viewer" | "list") => {
    setLocalView(v);
    onUpdate?.({ filesView: v });
  };
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, Math.max(0, inViewer.length - 1));
  /** "Mostrar" pone el archivo en el visor y salta a el. */
  const show = (file: StoredFile) => {
    if (!file.pinned) setPinned([file.id], true);
    const next = viewable.filter((f) => f.pinned || f.id === file.id);
    setIndex(Math.max(0, next.findIndex((f) => f.id === file.id)));
    setView("viewer");
  };

  const commitRename = () => {
    if (!renaming) return;
    const text = renaming.text.trim();
    const file = files.find((f) => f.id === renaming.id);
    setRenaming(null);
    if (!file || !text || text === file.name) return;
    // La extension se mantiene aunque la borren al renombrar.
    const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
    save(files.map((f) => (f.id === file.id ? { ...f, name: text.toLowerCase().endsWith(ext.toLowerCase()) ? text : `${text}${ext}` } : f)));
  };

  return (
    <div
      className={cx("relative flex h-full min-h-0 flex-col gap-2.5 rounded-2xl transition-colors duration-200", over && "bg-[#50c9d5]/10 ring-2 ring-[#50c9d5]")}
      onDragOver={(e) => {
        if (!canEdit || !Array.from(e.dataTransfer.types).includes("Files")) return;
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => e.target.files && void start(e.target.files).then(() => (e.target.value = ""))} />
      <input
        ref={replaceRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const target = files.find((f) => f.id === replaceId.current);
          if (e.target.files?.length && target) void start(e.target.files, target).then(() => (e.target.value = ""));
        }}
      />

      {/* Visor o lista, y subir (en el visor la zona para soltar se achica a un boton). */}
      {files.length ? (
        <div className="flex shrink-0 items-center gap-2">
          <div className="inline-flex gap-0.5 rounded-full border border-white/80 bg-[#f4f7f9] p-0.5" role="radiogroup" aria-label="Cómo ver los archivos">
            {(
              [
                ["viewer", "Visor", GalleryHorizontal],
                ["list", "Lista", ListIcon],
              ] as const
            ).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={view === v}
                disabled={!interactive}
                onClick={() => setView(v)}
                className={cx(
                  "zs-press inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors duration-200",
                  view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
                {label}
              </button>
            ))}
          </div>
          {view === "viewer" && canEdit ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="zs-press ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#50c9d5] px-3 py-1 text-[12px] font-semibold text-[#080b04] transition hover:shadow-[0_8px_18px_rgba(80,201,213,.35)]"
            >
              <UploadCloud className="h-3.5 w-3.5" strokeWidth={1.9} />
              Subir
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Zona para soltar o elegir archivos */}
      {/* En la galeria (sin onUpdate) se ve como vista previa; en modo editar se oculta para poder arrastrar el widget. */}
      {(canEdit || !onUpdate) && (view === "list" || !files.length) ? (
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => inputRef.current?.click()}
          className={cx(
            "zs-press group/drop flex shrink-0 items-center gap-3 rounded-2xl border-2 border-dashed px-3 text-left transition duration-200",
            over ? "border-[#50c9d5] bg-white/80" : "border-[#50c9d5]/40 bg-white/40 hover:border-[#50c9d5] hover:bg-white/70",
            files.length || uploads.length ? "py-2" : "flex-1 flex-col justify-center py-4 text-center"
          )}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#50c9d5] text-[#080b04] transition-transform duration-300 group-hover/drop:-translate-y-0.5">
            <UploadCloud className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </span>
          <span className="min-w-0 text-[12.5px] leading-snug text-slate-600">
            <b className="block font-semibold text-slate-900">{over ? "Suelta para subir" : "Arrastra archivos o haz clic"}</b>
            {!compact || !files.length ? `Imágenes, PDF, Excel, CSV, Word o ZIP · hasta ${MAX_FILE_BYTES / 1024 / 1024} MB` : null}
          </span>
        </button>
      ) : null}

      {errors.length ? (
        <div className="zs-modal-in flex shrink-0 items-start gap-2 rounded-xl bg-[var(--err-bg)] px-3 py-2 text-[12.5px] leading-snug text-[var(--err-text)]" role="alert">
          <ul className="min-w-0 flex-1 space-y-0.5">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          <button type="button" onClick={() => setErrors([])} className="shrink-0 rounded-full p-0.5 hover:bg-white/60" aria-label="Cerrar errores">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {canEdit && ask[0] ? (
        <div className="zs-modal-in zs-glass-inner flex shrink-0 items-center gap-3 rounded-2xl p-2.5" role="dialog" aria-label="Vista previa del archivo subido">
          <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
            <Thumb file={ask[0]} />
          </span>
          <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-slate-600">
            <b className="block truncate font-semibold text-slate-900">¿Mostrar en el visor?</b>
            <span className="block truncate">{ask[0].name}{ask.length > 1 ? ` · y ${ask.length - 1} más` : ""}</span>
          </span>
          <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            <button type="button" onClick={() => answer(true)} className="zs-press rounded-full bg-[#50c9d5] px-3 py-1.5 text-[12px] font-semibold text-[#080b04] hover:shadow-[0_8px_18px_rgba(80,201,213,.35)]">
              Sí, mostrar
            </button>
            {ask.length > 1 ? (
              <button type="button" onClick={() => answer(true, true)} className="zs-press rounded-full bg-white/80 px-3 py-1.5 text-[12px] font-semibold text-[#17656c] hover:bg-white">
                Todos
              </button>
            ) : null}
            <button type="button" onClick={() => answer(false)} className="zs-press rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-white/70">
              Ahora no
            </button>
          </span>
        </div>
      ) : null}

      {viewing ? <PreviewModal file={viewing} onClose={() => setViewing(null)} /> : null}

      {view === "viewer" && files.length ? (
        inViewer.length ? (
          <Viewer items={inViewer} index={safeIndex} onIndex={setIndex} onExpand={setViewing} interactive={interactive} />
        ) : (
          <div className="grid min-h-0 flex-1 place-items-center rounded-2xl bg-[#0d1b2a]/[0.04] p-4 text-center text-[12.5px] text-slate-600">
            Sube una imagen o un PDF para verlo aquí en grande.
          </div>
        )
      ) : null}

      <ul className={cx("min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1", view === "viewer" && files.length > 0 && !uploads.length && "hidden")}>
        {uploads.map((u) => (
          <li key={u.id} className="zs-in flex items-center gap-3 rounded-xl bg-white/60 px-2.5 py-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#50c9d5]/20 text-[#17656c]">
              <UploadCloud className="h-4 w-4 animate-pulse" strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-slate-900">{u.replaces ? "Reemplazando: " : ""}{u.name}</span>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white shadow-[inset_0_1px_2px_rgba(13,27,42,.08)]" role="progressbar" aria-valuenow={u.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Subiendo ${u.name}`}>
                <span className="block h-full rounded-full bg-gradient-to-r from-[#1e737b] to-[#50c9d5] transition-[width] duration-200" style={{ width: `${Math.max(4, u.pct)}%` }} />
              </span>
            </span>
            <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-[#17656c]">{u.pct}%</span>
          </li>
        ))}

        {(view === "list" ? files : []).map((file, i) => {
          const kind = kindOf(file);
          const KindIcon = kind.icon;
          const isImage = file.mime.startsWith("image/");
          const href = file.storage === "local" ? `${file.url}?download=1` : file.url;
          return (
            <li key={file.id} className="zs-in group/file relative flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-200 hover:bg-white/70" style={{ "--i": Math.min(i, 8) } as CSSProperties}>
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  if (!canPreview(file)) return;
                  e.preventDefault();
                  setViewing(file);
                }}
                className="shrink-0 overflow-hidden rounded-lg"
                title={`Ver ${file.name}`}
              >
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.url} alt="" loading="lazy" className="h-10 w-10 bg-white object-cover transition-transform duration-300 group-hover/file:scale-105" />
                ) : (
                  <span className={cx("grid h-10 w-10 place-items-center", kind.tone)}>
                    <KindIcon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  </span>
                )}
              </a>
              <span className="min-w-0 flex-1">
                {renaming?.id === file.id ? (
                  <input
                    autoFocus
                    value={renaming.text}
                    onChange={(e) => setRenaming({ id: file.id, text: e.target.value })}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    maxLength={160}
                    className="w-full rounded-lg border border-[#50c9d5] bg-white px-2 py-1 text-[13px] text-slate-900 outline-none ring-[3px] ring-[#50c9d5]/25"
                    aria-label="Nuevo nombre"
                  />
                ) : (
                  <a href={file.url} target="_blank" rel="noreferrer" className="block truncate text-[13px] font-medium text-slate-900 hover:text-[#17656c]">
                    {file.name}
                  </a>
                )}
                <span className="block text-[11.5px] text-slate-500">
                  {kind.label} · {sizeText(file.size)}
                </span>
              </span>

              {confirming === file.id ? (
                <span className="zs-menu-in flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => void remove(file)} className="zs-press rounded-full bg-[#b91c1c] px-2.5 py-1 text-[11.5px] font-semibold text-white">
                    Eliminar
                  </button>
                  <button type="button" onClick={() => setConfirming(null)} className="zs-press rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold text-slate-700">
                    No
                  </button>
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover/file:opacity-100">
                  <a href={href} download={file.name} className="zs-press grid h-7 w-7 place-items-center rounded-full text-slate-600 hover:bg-white hover:text-slate-900" aria-label={`Descargar ${file.name}`} title="Descargar">
                    <Download className="h-3.5 w-3.5" strokeWidth={1.9} />
                  </a>
                  {canEdit && canPreview(file) ? (
                    <button
                      type="button"
                      onClick={() => (file.pinned ? setPinned([file.id], false) : show(file))}
                      className="zs-press grid h-7 w-7 place-items-center rounded-full text-slate-600 hover:bg-white hover:text-slate-900"
                      aria-label={file.pinned ? `Quitar ${file.name} del visor` : `Mostrar ${file.name} en el visor`}
                      title={file.pinned ? "Quitar del visor" : "Mostrar en el visor"}
                    >
                      {file.pinned ? <EyeOff className="h-3.5 w-3.5" strokeWidth={1.9} /> : <Eye className="h-3.5 w-3.5" strokeWidth={1.9} />}
                    </button>
                  ) : null}
                  {canEdit ? (
                    <>
                      <button type="button" onClick={() => setRenaming({ id: file.id, text: file.name })} className="zs-press grid h-7 w-7 place-items-center rounded-full text-slate-600 hover:bg-white hover:text-slate-900" aria-label={`Renombrar ${file.name}`} title="Renombrar">
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          replaceId.current = file.id;
                          replaceRef.current?.click();
                        }}
                        className="zs-press grid h-7 w-7 place-items-center rounded-full text-slate-600 hover:bg-white hover:text-slate-900"
                        aria-label={`Reemplazar ${file.name}`}
                        title="Reemplazar"
                      >
                        <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.9} />
                      </button>
                      <button type="button" onClick={() => setConfirming(file.id)} className="zs-press grid h-7 w-7 place-items-center rounded-full text-slate-600 hover:bg-[var(--err-bg)] hover:text-[var(--err-text)]" aria-label={`Eliminar ${file.name}`} title="Eliminar">
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.9} />
                      </button>
                    </>
                  ) : null}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
