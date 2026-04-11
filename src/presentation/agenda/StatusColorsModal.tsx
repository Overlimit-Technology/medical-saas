"use client";

import { useEffect, useState } from "react";
import {
  APPOINTMENT_STATUSES,
  STATUS_LABELS,
  COLOR_NAMES,
  COLOR_LABELS,
  SWATCH_CLASSES,
  COLOR_CLASS_MAP,
  resolveStatusColors,
  type StatusColorMap,
  type AppointmentStatus,
  type ColorName,
} from "./statusColors";

type Props = {
  currentOverrides: StatusColorMap | null;
  saving?: boolean;
  resetting?: boolean;
  error?: string | null;
  onSave: (newOverrides: StatusColorMap) => Promise<void> | void;
  onReset: () => Promise<void> | void;
  onClose: () => void;
};

export default function StatusColorsModal({
  currentOverrides,
  saving = false,
  resetting = false,
  error = null,
  onSave,
  onReset,
  onClose,
}: Props) {
  const [localColors, setLocalColors] = useState<Record<AppointmentStatus, ColorName>>(() =>
    resolveStatusColors(currentOverrides)
  );

  useEffect(() => {
    setLocalColors(resolveStatusColors(currentOverrides));
  }, [currentOverrides]);

  const handleColorChange = (status: AppointmentStatus, color: ColorName) => {
    setLocalColors((prev) => ({ ...prev, [status]: color }));
  };

  const busy = saving || resetting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/10 animate-modal-in">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Configuración
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              Colores de estado
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Personaliza los colores de las citas en la agenda según su estado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mt-6 space-y-5">
          {APPOINTMENT_STATUSES.map((status) => {
            const selectedColor = localColors[status];
            const classes = COLOR_CLASS_MAP[selectedColor];

            return (
              <div key={status}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    {STATUS_LABELS[status]}
                  </span>
                  <div className={`rounded-lg border px-3 py-1.5 text-[11px] ${classes.card}`}>
                    <span className="font-semibold text-slate-700">Juan Pérez</span>
                    <span className={`ml-2 ${classes.time}`}>09:00</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COLOR_NAMES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      title={COLOR_LABELS[color]}
                      onClick={() => handleColorChange(status, color)}
                      className={`h-7 w-7 rounded-full transition-all ${SWATCH_CLASSES[color]} ${
                        selectedColor === color
                          ? "scale-110 ring-2 ring-slate-400 ring-offset-2"
                          : "opacity-70 hover:scale-110 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 animate-fade-in rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => void onReset()}
            disabled={busy}
            className="text-sm text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50"
          >
            {resetting ? "Restableciendo..." : "Restablecer valores predeterminados"}
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void onSave(localColors)}
              disabled={busy}
              className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
