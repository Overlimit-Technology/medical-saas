"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Clock, MapPin, Phone, Send, Sparkles } from "lucide-react";
import { isValidRun } from "@/lib/run";

type Doctor = { id: string; name: string; specialty: string };
type ClinicInfo = {
  name: string;
  address: string | null;
  phone: string | null;
  openingTime: string;
  closingTime: string;
  slotMinutes: number;
};
type Slot = {
  doctorId: string;
  date: string;
  time: string;
  startAt: string;
  endAt: string;
  doctorName?: string;
};
type ChatMessage = { role: "user" | "assistant"; text: string };
type Confirmation = { when: string; doctorName: string; clinicName: string };

function formatDay(date: string) {
  // Se usa mediodia para que la fecha no cambie por zona horaria.
  return new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" }).format(
    new Date(`${date}T12:00:00`)
  );
}

function groupByDay(slots: Slot[]) {
  const groups = new Map<string, Slot[]>();
  for (const slot of slots) {
    const list = groups.get(slot.date) ?? [];
    list.push(slot);
    groups.set(slot.date, list);
  }
  return Array.from(groups.entries());
}

export default function PublicBooking({ bookingKey }: { bookingKey: string }) {
  const api = `/api/public/booking/${encodeURIComponent(bookingKey)}`;

  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);

  const [manualDoctor, setManualDoctor] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [selected, setSelected] = useState<Slot | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    run: "",
    phone: "",
    email: "",
    consent: false,
    website: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const doctorName = useMemo(() => new Map(doctors.map((doctor) => [doctor.id, doctor.name])), [doctors]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${api}/info`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error ?? "La reserva no esta disponible.");
        if (!cancelled) {
          setClinic(json.clinic);
          setDoctors(json.doctors);
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "La reserva no esta disponible.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const loadManualSlots = async (doctorId: string) => {
    setSlotsLoading(true);
    setMessage(null);
    setSlots([]);
    try {
      const query = new URLSearchParams({ days: "7" });
      if (doctorId) query.set("doctorId", doctorId);
      const res = await fetch(`${api}/slots?${query.toString()}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "No se pudieron cargar las horas.");
      const list = (json.slots as Slot[]).slice(0, 60);
      setSlots(list);
      if (list.length === 0) setMessage("No hay horas disponibles en los proximos dias.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudieron cargar las horas.");
    } finally {
      setSlotsLoading(false);
    }
  };

  const ask = async () => {
    const text = input.trim();
    if (!text || asking) return;

    const next: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setAsking(true);
    setMessage(null);
    setSlots([]);

    try {
      const res = await fetch(`${api}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "El asistente no pudo responder.");
      setMessages([...next, { role: "assistant", text: json.reply }]);
      setSlots(json.slots as Slot[]);
    } catch (err) {
      setMessages([
        ...next,
        {
          role: "assistant",
          text: err instanceof Error ? err.message : "El asistente no pudo responder. Elige la hora manualmente.",
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const submit = async () => {
    if (!selected) return;
    setFormError(null);

    if (form.firstName.trim().length < 2 || form.lastName.trim().length < 2) {
      setFormError("Ingresa tu nombre y apellido.");
      return;
    }
    if (!isValidRun(form.run)) {
      setFormError("El RUN no es valido. Revisa el numero y el digito verificador.");
      return;
    }
    if (!form.consent) {
      setFormError("Debes aceptar el uso de tus datos para reservar.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${api}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selected.doctorId,
          startAt: selected.startAt,
          firstName: form.firstName,
          lastName: form.lastName,
          run: form.run,
          phone: form.phone,
          email: form.email,
          consent: form.consent,
          website: form.website,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "No se pudo completar la reserva.");
      setConfirmation(json.booking);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo completar la reserva.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-[15px] text-slate-900 outline-none transition focus:border-[#50c9d5] focus:ring-2 focus:ring-[#50c9d5]/20";

  if (loadError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <p className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-700">
          {loadError}
        </p>
      </main>
    );
  }

  if (!clinic) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
        <p className="text-slate-500">Cargando...</p>
      </main>
    );
  }

  if (confirmation) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4 py-10">
        <div className="rounded-3xl border border-emerald-200 bg-white p-7 text-center shadow-sm">
          <CalendarCheck className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-3 text-xl font-semibold text-slate-900">Recibimos tu reserva</h1>
          <p className="mt-2 text-[15px] capitalize text-slate-700">{confirmation.when}</p>
          <p className="text-[15px] text-slate-700">
            {confirmation.doctorName} · {confirmation.clinicName}
          </p>
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[13px] text-slate-600">
            Recepcion confirmara tu hora. Si necesitas cambiarla, llama a la clinica
            {clinic.phone ? ` al ${clinic.phone}` : ""}.
          </p>
        </div>
      </main>
    );
  }

  const shownSlots = slots;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-8">
      <header className="rounded-3xl bg-[#0f9ea8] p-6 text-white">
        <h1 className="text-2xl font-semibold tracking-tight">Reserva tu hora</h1>
        <p className="mt-1 text-[15px] text-white/90">{clinic.name}</p>
        <div className="mt-3 flex flex-col gap-1 text-[13px] text-white/90">
          {clinic.address ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {clinic.address}
            </span>
          ) : null}
          {clinic.phone ? (
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> {clinic.phone}
            </span>
          ) : null}
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {clinic.openingTime} a {clinic.closingTime}, lunes a sabado
          </span>
        </div>
      </header>

      {!selected ? (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-[#0f9ea8]" />
              Cuentanos que necesitas
            </h2>
            <p className="mt-1 text-[13px] text-slate-500">
              Por ejemplo: &quot;una hora con ortodoncia el jueves en la tarde&quot;. No escribas datos personales aqui.
            </p>

            {messages.length > 0 ? (
              <div className="mt-3 flex flex-col gap-2" aria-live="polite">
                {messages.map((item, index) => (
                  <p
                    key={`${item.role}-${index}`}
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-[14px] ${
                      item.role === "user"
                        ? "self-end bg-[#0f9ea8] text-white"
                        : "self-start border border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  >
                    {item.text}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="mt-3 flex gap-2">
              <input
                id="booking-chat"
                value={input}
                maxLength={300}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void ask();
                }}
                placeholder="Escribe aqui..."
                className={inputClass}
                aria-label="Que necesitas"
              />
              <button
                type="button"
                onClick={() => void ask()}
                disabled={asking || !input.trim()}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#0f9ea8] px-4 text-[14px] font-semibold text-white transition hover:bg-[#0b8e97] disabled:bg-[#50c9d5]/45"
              >
                <Send className="h-4 w-4" />
                {asking ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-semibold text-slate-900">O elige tu mismo</h2>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label htmlFor="booking-doctor" className="flex min-w-[200px] flex-1 flex-col gap-1 text-[12px] font-medium text-slate-500">
                Profesional
                <select
                  id="booking-doctor"
                  value={manualDoctor}
                  onChange={(event) => setManualDoctor(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Cualquiera</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} · {doctor.specialty}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => void loadManualSlots(manualDoctor)}
                disabled={slotsLoading}
                className="h-11 rounded-xl border border-[#0f9ea8] px-4 text-[14px] font-semibold text-[#0f9ea8] transition hover:bg-[#f2fbfb] disabled:opacity-60"
              >
                {slotsLoading ? "Cargando..." : "Ver horas"}
              </button>
            </div>
          </section>

          {message ? <p className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-800">{message}</p> : null}

          {shownSlots.length > 0 ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-[15px] font-semibold text-slate-900">Horas disponibles</h2>
              <div className="mt-3 flex flex-col gap-4">
                {groupByDay(shownSlots).map(([date, daySlots]) => (
                  <div key={date}>
                    <p className="text-[13px] font-medium capitalize text-slate-600">{formatDay(date)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {daySlots.map((slot) => (
                        <button
                          key={`${slot.doctorId}-${slot.startAt}`}
                          type="button"
                          onClick={() => {
                            setSelected(slot);
                            setFormError(null);
                          }}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[13px] transition hover:border-[#50c9d5] hover:bg-[#f2fbfb]"
                        >
                          <span className="block text-[15px] font-semibold text-slate-900">{slot.time}</span>
                          <span className="block text-slate-500">
                            {slot.doctorName ?? doctorName.get(slot.doctorId) ?? "Profesional"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Confirma tus datos</h2>
              <p className="mt-1 text-[14px] capitalize text-slate-700">
                {formatDay(selected.date)}, {selected.time} ·{" "}
                {selected.doctorName ?? doctorName.get(selected.doctorId) ?? "Profesional"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-[13px] font-medium text-[#0f9ea8] underline underline-offset-2"
            >
              Cambiar hora
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label htmlFor="bk-first" className="flex flex-col gap-1 text-[12px] font-medium text-slate-500">
              Nombre
              <input id="bk-first" autoComplete="given-name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputClass} />
            </label>
            <label htmlFor="bk-last" className="flex flex-col gap-1 text-[12px] font-medium text-slate-500">
              Apellido
              <input id="bk-last" autoComplete="family-name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputClass} />
            </label>
            <label htmlFor="bk-run" className="flex flex-col gap-1 text-[12px] font-medium text-slate-500">
              RUN
              <input id="bk-run" inputMode="text" placeholder="12.345.678-5" value={form.run} onChange={(e) => setForm({ ...form, run: e.target.value })} className={inputClass} />
            </label>
            <label htmlFor="bk-phone" className="flex flex-col gap-1 text-[12px] font-medium text-slate-500">
              Telefono
              <input id="bk-phone" type="tel" autoComplete="tel" placeholder="+56 9 1234 5678" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
            </label>
            <label htmlFor="bk-email" className="flex flex-col gap-1 text-[12px] font-medium text-slate-500 sm:col-span-2">
              Correo (opcional, para enviarte la confirmacion)
              <input id="bk-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </label>
          </div>

          {/* Campo trampa para bots: invisible para personas. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="bk-website">No completar</label>
            <input id="bk-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </div>

          <label htmlFor="bk-consent" className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13px] text-slate-600">
            <input
              id="bk-consent"
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setForm({ ...form, consent: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-[#0f9ea8]"
            />
            Acepto que {clinic.name} use mis datos para gestionar esta reserva y contactarme.
          </label>

          {formError ? <p className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-[13px] text-rose-700">{formError}</p> : null}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="mt-4 h-12 w-full rounded-xl bg-[#0f9ea8] text-[15px] font-semibold text-white transition hover:bg-[#0b8e97] disabled:bg-[#50c9d5]/45"
          >
            {submitting ? "Reservando..." : "Confirmar reserva"}
          </button>
          <p className="mt-2 text-center text-[12px] text-slate-500">
            Recepcion confirmara tu hora. No se cobra nada al reservar.
          </p>
        </section>
      )}
    </main>
  );
}
