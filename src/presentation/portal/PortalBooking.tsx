"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, MapPin, UserRound } from "lucide-react";
import type { BookingSlot, PublicDoctor } from "@/server/booking/BookingService";
import ZensyaLogo from "./ZensyaLogo";
import { capFirst, dateBlock, longDate } from "./format";

type Props = { slug: string; doctors: PublicDoctor[]; clinicAddress: string | null };

const initials = (name: string) =>
  name
    .replace(/^(Dra?\.)\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

export default function PortalBooking({ slug, doctors, clinicAddress }: Props) {
  const [step, setStep] = useState(0);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [slots, setSlots] = useState<BookingSlot[] | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<BookingSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ when: string; doctorName: string } | null>(null);

  const doctor = doctors.find((d) => d.id === doctorId) ?? null;

  useEffect(() => {
    if (!doctorId) return;
    let alive = true;
    setSlots(null);
    setError(null);
    fetch(`/api/portal/${slug}/reservar?doctorId=${encodeURIComponent(doctorId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return;
        if (!data.ok) throw new Error(data.error);
        setSlots(data.slots);
      })
      .catch((err) => alive && setError(err instanceof Error ? err.message : "No pudimos cargar las horas."));
    return () => {
      alive = false;
    };
  }, [doctorId, slug]);

  const days = useMemo(() => {
    const map = new Map<string, BookingSlot[]>();
    for (const s of slots ?? []) map.set(s.date, [...(map.get(s.date) ?? []), s]);
    return Array.from(map.entries());
  }, [slots]);
  const daySlots = days.find(([d]) => d === date)?.[1] ?? [];

  const book = async () => {
    if (!slot || !doctorId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/${slug}/reservar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, startAt: slot.startAt }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setDone(data.booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos reservar tu hora.");
    } finally {
      setBusy(false);
    }
  };

  if (!doctors.length) {
    return (
      <div className="card empty">
        <ZensyaLogo size={44} />
        <b>Por ahora no hay profesionales con agenda en línea</b>
        <p className="small">Llama a la clínica para reservar tu hora.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card empty">
        <ZensyaLogo size={56} />
        <span className="tag">Hora reservada</span>
        <h2 style={{ font: "700 28px/1.2 var(--zs-font-display)", letterSpacing: "-1px" }}>¡Listo! Te esperamos el {done.when}</h2>
        <p className="text">
          Con {done.doctorName}. La clínica la revisará y te avisaremos cuando quede confirmada.
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn" href={`/portal/${slug}/citas`}>
            Ver mis citas
          </Link>
          <button
            className="btn quiet"
            type="button"
            onClick={() => {
              setDone(null);
              setStep(0);
              setDoctorId(null);
              setDate(null);
              setSlot(null);
            }}
          >
            Reservar otra hora
          </button>
        </div>
      </div>
    );
  }

  const steps = ["Profesional", "Fecha y hora", "Confirmar"];
  const ready = [doctorId, slot, true][step];

  return (
    <>
      <ol className="stepper">
        {steps.map((label, i) => (
          <li key={label} className={i === step ? "on" : i < step ? "done" : ""}>
            <span>{i + 1}</span>
            <em style={{ fontStyle: "normal" }}>{label}</em>
          </li>
        ))}
      </ol>
      <div className="grid g-main">
        <div className="card">
          {step === 0 ? (
            <>
              <h2 className="card-h" style={{ font: "700 20px/1.3 var(--zs-font-display)" }}>
                Elige al profesional
              </h2>
              <div className="picks">
                {doctors.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className="pick"
                    aria-pressed={doctorId === d.id}
                    onClick={() => {
                      setDoctorId(d.id);
                      setDate(null);
                      setSlot(null);
                    }}
                  >
                    <span className="avatar" style={{ width: 46, height: 46, fontSize: 15 }}>
                      {initials(d.name)}
                    </span>
                    <div>
                      <b>{d.name}</b>
                      <span className="small">{d.specialty}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <h2 style={{ font: "700 20px/1.3 var(--zs-font-display)" }}>Elige el día y la hora</h2>
              {slots === null && !error ? <p className="text">Buscando horas disponibles…</p> : null}
              {slots && !days.length ? <p className="text">No hay horas libres en los próximos 14 días con este profesional. Prueba con otro o llama a la clínica.</p> : null}
              {days.length ? (
                <div className="days">
                  {days.map(([d, list]) => {
                    const b = dateBlock(new Date(list[0].startAt));
                    return (
                      <button
                        key={d}
                        type="button"
                        className="day"
                        aria-pressed={date === d}
                        onClick={() => {
                          setDate(d);
                          setSlot(null);
                        }}
                      >
                        <small>{b.weekday}</small>
                        <b>{b.day}</b>
                        <small>{list.length} horas</small>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {date ? (
                <div className="slots">
                  {daySlots.map((s) => (
                    <button key={s.startAt} type="button" className="slot" aria-pressed={slot?.startAt === s.startAt} onClick={() => setSlot(s)}>
                      {s.time}
                    </button>
                  ))}
                </div>
              ) : days.length ? (
                <p className="small">Elige un día para ver las horas.</p>
              ) : null}
            </div>
          ) : null}

          {step === 2 && doctor && slot ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <h2 style={{ font: "700 20px/1.3 var(--zs-font-display)" }}>Revisa y confirma</h2>
              <div className="appt">
                <div className="date">
                  <small>{dateBlock(new Date(slot.startAt)).weekday}</small>
                  <b>{dateBlock(new Date(slot.startAt)).day}</b>
                  <span>{dateBlock(new Date(slot.startAt)).month}</span>
                </div>
                <div>
                  <h3>{doctor.specialty}</h3>
                  <div className="meta">
                    <span>
                      <UserRound size={15} strokeWidth={1.8} />
                      {doctor.name}
                    </span>
                    <span>
                      {`${capFirst(longDate(new Date(slot.startAt)))} · ${slot.time}`}
                    </span>
                    {clinicAddress ? (
                      <span>
                        <MapPin size={15} strokeWidth={1.8} />
                        {clinicAddress}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="small" role="alert" style={{ color: "var(--zs-err-text)", marginTop: 16 }}>
              {error}
            </p>
          ) : null}

          <div className="row" style={{ justifyContent: "space-between", marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--zs-line)" }}>
            <button className="btn quiet" type="button" style={{ visibility: step ? "visible" : "hidden" }} onClick={() => setStep(step - 1)}>
              <ArrowLeft size={16} />
              Atrás
            </button>
            {step < 2 ? (
              <button className="btn" type="button" disabled={!ready} onClick={() => setStep(step + 1)}>
                Continuar <ArrowRight size={16} className="go" />
              </button>
            ) : (
              <button className="btn" type="button" disabled={busy} onClick={book}>
                <Check size={16} />
                {busy ? "Reservando…" : "Confirmar reserva"}
              </button>
            )}
          </div>
        </div>

        <aside className="card" aria-label="Resumen">
          <h3 style={{ font: "700 18px/1.3 var(--zs-font-display)", marginBottom: 14 }}>Tu reserva</h3>
          <dl style={{ display: "flex", flexDirection: "column", gap: 12, margin: 0 }}>
            <div>
              <dt className="small">Profesional</dt>
              <dd style={{ margin: 0, font: "600 14.5px/1.35 var(--zs-font-display)" }}>{doctor ? `${doctor.name} · ${doctor.specialty}` : "Por elegir"}</dd>
            </div>
            <div>
              <dt className="small">Fecha y hora</dt>
              <dd style={{ margin: 0, font: "600 14.5px/1.35 var(--zs-font-display)" }}>
                {slot ? `${capFirst(longDate(new Date(slot.startAt)))} · ${slot.time}` : "Por elegir"}
              </dd>
            </div>
          </dl>
          <p className="small" style={{ marginTop: 16 }}>
            Puedes cancelar sin costo desde el portal hasta 24 horas antes.
          </p>
        </aside>
      </div>
    </>
  );
}
