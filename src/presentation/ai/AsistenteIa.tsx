"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, Mic, Sparkles, Square, Upload } from "lucide-react";
import type { EvolutionDraftResult } from "@/server/ai/features/evolutionDraft";

const SECTION_LABELS: Array<{ key: keyof EvolutionDraftResult["draft"]; label: string }> = [
  { key: "motivoConsulta", label: "Motivo de consulta" },
  { key: "anamnesis", label: "Anamnesis" },
  { key: "examenClinico", label: "Examen clinico" },
  { key: "diagnosticoPresuntivo", label: "Diagnostico presuntivo" },
  { key: "indicaciones", label: "Indicaciones" },
];

const MAX_RECORDING_SECONDS = 120;

// Texto inventado: nunca usar notas de pacientes reales en el prototipo.
const SAMPLE_NOTES =
  "Paciente adulto consulta por dolor en molar inferior derecho hace 3 dias, empeora con frio y al masticar. " +
  "Sin fiebre. Refiere haber tomado paracetamol 500 mg con alivio parcial. " +
  "Al examen: caries profunda en pieza 46, percusion positiva, sin edema. " +
  "Se plantea tratamiento de conducto, agendar control en una semana.";

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = `${total % 60}`.padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      disabled={!value}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-600 transition hover:border-[#19b3bc] hover:text-[#0f9ea8] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

export default function AsistenteIa() {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvolutionDraftResult | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  // Si el usuario sale de la pantalla mientras graba, se libera el microfono.
  useEffect(
    () => () => {
      stopTimer();
      releaseStream();
    },
    []
  );

  const send = async (url: string, init: RequestInit) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(url, { method: "POST", credentials: "include", ...init });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "No se pudo generar el borrador.");
      setResult({ draft: json.draft, transcript: json.transcript, meta: json.meta });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el borrador.");
    } finally {
      setLoading(false);
    }
  };

  const generateFromNotes = () =>
    send("/api/ai/evolution-draft", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });

  const sendAudio = (audio: Blob, filename: string) => {
    const form = new FormData();
    form.append("audio", audio, filename);
    return send("/api/ai/voice-draft", { body: form });
  };

  const startRecording = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Tu navegador no permite grabar audio. Usa Chrome o Edge, o sube un archivo.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        releaseStream();
        if (blob.size > 0) void sendAudio(blob, "consulta.webm");
      };

      recorder.start();
      const startedAt = Date.now();
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_RECORDING_SECONDS) stopRecording();
      }, 1000);
    } catch {
      releaseStream();
      setError("No se pudo acceder al microfono. Revisa el permiso del navegador.");
    }
  };

  const stopRecording = () => {
    stopTimer();
    setRecording(false);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-[19px] font-semibold tracking-tight text-slate-900">
          <Sparkles className="h-5 w-5 text-[#0f9ea8]" />
          Asistente IA (prototipo)
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Dicta o escribe tus notas y recibe un borrador de evolucion. Tu revisas y decides.
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Modo prototipo con el plan gratuito de Gemini. Google puede usar el texto y el audio para
          mejorar sus productos. <strong>No digas ni escribas nombres, RUN ni datos de pacientes
          reales.</strong> El audio no se guarda en MediGest.
        </p>
      </div>

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-[14px] font-semibold text-slate-900">Dictar por voz</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">Hasta 2 minutos por grabacion.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {recording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-[13px] font-semibold text-white transition hover:bg-red-700"
            >
              <Square className="h-4 w-4" />
              Detener y generar ({formatSeconds(seconds)})
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startRecording()}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0f9ea8] px-4 text-[13px] font-semibold text-white transition hover:bg-[#0b8e97] disabled:cursor-not-allowed disabled:bg-[#19b3bc]/45"
            >
              <Mic className="h-4 w-4" />
              Grabar consulta
            </button>
          )}

          <label
            htmlFor="ai-audio-file"
            className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 transition hover:border-slate-300 ${
              loading || recording ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <Upload className="h-4 w-4" />
            Subir audio
          </label>
          <input
            id="ai-audio-file"
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void sendAudio(file, file.name);
            }}
          />
          {recording ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-red-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
              Grabando
            </span>
          ) : null}
        </div>
      </section>

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <label htmlFor="ai-notes" className="text-[14px] font-semibold text-slate-900">
          O escribe tus notas
        </label>
        <textarea
          id="ai-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={6}
          maxLength={4000}
          placeholder="Escribe tus notas tal como las tomas, sin identificar al paciente."
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[14px] text-slate-800 outline-none transition focus:border-[#19b3bc] focus:ring-2 focus:ring-[#19b3bc]/10"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void generateFromNotes()}
            disabled={loading || recording || notes.trim().length < 10}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0f9ea8] px-4 text-[13px] font-semibold text-white transition hover:bg-[#0b8e97] disabled:cursor-not-allowed disabled:bg-[#19b3bc]/45"
          >
            <Sparkles className="h-4 w-4" />
            {loading ? "Generando..." : "Generar borrador"}
          </button>
          <button
            type="button"
            onClick={() => setNotes(SAMPLE_NOTES)}
            disabled={loading || recording}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 transition hover:border-slate-300 disabled:opacity-60"
          >
            Cargar ejemplo inventado
          </button>
          <span className="ml-auto text-[12px] text-slate-400">{notes.length}/4000</span>
        </div>
      </section>

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-600">
          Procesando... esto puede tardar unos segundos.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}

      {result ? (
        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[16px] font-semibold text-slate-900">Borrador generado por IA</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
              {result.meta.simulated ? "Respuesta simulada (sin clave Gemini)" : `Modelo ${result.meta.model}`}
              {result.meta.redactions > 0 ? ` · ${result.meta.redactions} datos ocultados` : ""}
            </span>
          </div>

          {result.transcript ? (
            <div className="mb-2.5 flex items-start justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                  Transcripcion
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-[13px] text-slate-800">
                  {result.transcript}
                </p>
              </div>
              <CopyButton value={result.transcript} />
            </div>
          ) : null}

          <div className="flex flex-col gap-2.5">
            {SECTION_LABELS.map(({ key, label }) => {
              const value = String(result.draft[key] ?? "");
              const missing = result.draft.camposFaltantes.includes(key);
              return (
                <div
                  key={key}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {label}
                    </p>
                    {value ? (
                      <p className="mt-1 whitespace-pre-wrap break-words text-[14px] text-slate-900">
                        {value}
                      </p>
                    ) : (
                      <p className="mt-1 text-[13px] italic text-amber-700">
                        {missing ? "No aparece en lo que dijiste. Completalo tu." : "Sin contenido"}
                      </p>
                    )}
                  </div>
                  <CopyButton value={value} />
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-[12px] text-slate-500">
            Es un borrador. Revisalo completo antes de usarlo en una ficha clinica.
          </p>
        </section>
      ) : null}
    </div>
  );
}
