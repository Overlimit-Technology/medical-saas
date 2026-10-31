import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import ZensyaLogo from "@/presentation/portal/ZensyaLogo";
import { APPOINTMENT_STATUS, shortDate } from "@/presentation/portal/format";
import { PortalService, requirePortalPage } from "@/server/portal/PortalService";

export const dynamic = "force-dynamic";

export default async function PortalHistorial({ params, searchParams }: { params: { slug: string }; searchParams: { esp?: string } }) {
  const ctx = await requirePortalPage(params.slug);
  const base = `/portal/${params.slug}/historial`;
  const now = new Date();
  const past = (await PortalService.appointments(ctx))
    .filter((a) => a.status === "COMPLETED" || a.status === "NO_SHOW" || (a.status !== "CANCELLED" && a.startAt < now))
    .reverse();
  const specialties = past.map((a) => a.specialty).filter((s, i, all) => all.indexOf(s) === i);
  const filter = searchParams.esp && specialties.includes(searchParams.esp) ? searchParams.esp : null;
  const rows = filter ? past.filter((a) => a.specialty === filter) : past;

  return (
    <section className="view" aria-label="Historial clínico">
      <div className="page-head">
        <div>
          <span className="tag">Historial clínico</span>
          <h1>
            Tu historia, <span className="accent">ordenada</span>
          </h1>
          <p className="lead">Todas tus atenciones en {ctx.clinic.name}, de la más reciente a la más antigua.</p>
        </div>
      </div>

      <div className="notice">
        <ShieldCheck size={18} />
        <span>
          Esta información es privada y solo la ves tú. Está protegida por la Ley 19.628 sobre protección de la vida privada y la Ley 20.584 de derechos y deberes de los pacientes.
        </span>
      </div>

      {specialties.length > 1 ? (
        <nav className="seg" aria-label="Filtrar por especialidad">
          <Link href={base} aria-current={!filter ? "page" : undefined}>
            Todas
          </Link>
          {specialties.map((s) => (
            <Link key={s} href={`${base}?esp=${encodeURIComponent(s)}`} aria-current={filter === s ? "page" : undefined}>
              {s}
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="card">
        {rows.length ? (
          <div className="table">
            <div className="trow head">
              <span>Fecha</span>
              <span>Atención</span>
              <span>Profesional</span>
              <span className="end">Estado</span>
            </div>
            {rows.map((a) => {
              const st = APPOINTMENT_STATUS[a.status];
              return (
                <div className="trow" key={a.id}>
                  <span className="t-date num">{shortDate(a.startAt)}</span>
                  <b>
                    {a.planName ? `${a.planName}${a.sessionIndex ? ` · sesión ${a.sessionIndex}` : ""}` : a.specialty}
                  </b>
                  <span className="t-sub">
                    {a.doctorName} · {a.specialty}
                  </span>
                  <span className="end">
                    <span className={`st ${st.tone}`}>{st.label}</span>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            <ZensyaLogo size={44} />
            <b>Aún no tienes atenciones registradas</b>
          </div>
        )}
      </div>
    </section>
  );
}
