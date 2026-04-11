"use client";

import { useState } from "react";

type MetaChannel = "INSTAGRAM" | "MESSENGER";

const CHANNEL_LABELS: Record<MetaChannel, string> = {
  INSTAGRAM: "Instagram",
  MESSENGER: "Messenger",
};

function buildChannelLink(channel: MetaChannel, target: string) {
  const trimmedTarget = target.trim();

  if (channel === "INSTAGRAM") {
    if (!trimmedTarget) return null;
    return `https://www.instagram.com/${trimmedTarget.replace(/^@/, "")}/`;
  }

  if (!trimmedTarget) return null;
  return `https://m.me/${trimmedTarget.replace(/^@/, "")}`;
}

export default function FormularioChatPage() {
  const [channel, setChannel] = useState<MetaChannel>("MESSENGER");
  const [target, setTarget] = useState("");
  const [helper, setHelper] = useState<string | null>(null);

  function handleOpenChannel() {
    const link = buildChannelLink(channel, target);
    if (!link) {
      setHelper("Completa un usuario o pagina valida para abrir el canal.");
      return;
    }

    setHelper(`Abriendo ${CHANNEL_LABELS[channel]} para continuar la conversacion fuera de ZENSYA.`);
    window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.34em] text-slate-400">
            Formulario Chat
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Lanzador de canales externos
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Modulo de prueba para abrir Messenger o Instagram desde ZENSYA sin mezclarlo con la
            bandeja `chat-meta`.
          </p>
        </div>
      </div>

      <section className="rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,253,250,0.94))] p-5 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Prueba admin</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              Iniciar conversacion externa
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Este formulario abre el perfil o chat externo para pruebas manuales. No crea una
              conversacion interna en la bandeja y prioriza redes sociales para no depender de un
              numero.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["MESSENGER", "INSTAGRAM"] as MetaChannel[]).map((item) => {
              const active = item === channel;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setChannel(item);
                    setHelper(null);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {CHANNEL_LABELS[item]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_auto]">
          <label className="block rounded-[24px] border border-slate-200 bg-white px-4 py-3">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {channel === "INSTAGRAM" ? "Usuario de Instagram" : "Pagina o usuario de Messenger"}
            </span>
            <input
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder={
                channel === "INSTAGRAM" ? "cuenta_instagram" : "pagina-messenger"
              }
              className="mt-2 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>

          <button
            type="button"
            onClick={handleOpenChannel}
            className="rounded-[24px] bg-slate-900 px-6 py-4 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Abrir canal
          </button>
        </div>

        {helper && (
          <div className="mt-4 rounded-[20px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            {helper}
          </div>
        )}
      </section>
    </div>
  );
}
