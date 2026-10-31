import Link from "next/link";
import { Info, Plus } from "lucide-react";
import AppointmentCard from "@/presentation/portal/AppointmentCard";
import ZensyaLogo from "@/presentation/portal/ZensyaLogo";
import { CANCEL_MIN_HOURS, PortalService, requirePortalPage } from "@/server/portal/PortalService";

export const dynamic = "force-dynamic";

export default async function PortalCitas({ params, searchParams }: { params: { slug: string }; searchParams: { ver?: string } }) {
  const ctx = await requirePortalPage(params.slug);
  const base = `/portal/${params.slug}/citas`;
  const all = await PortalService.appointments(ctx);
  const now = new Date();
  const upcoming = all.filter((a) => (a.status === "SCHEDULED" || a.status === "CONFIRMED") && a.startAt > now);
  const past = all.filter((a) => !upcoming.includes(a)).reverse();
  const showPast = searchParams.ver === "anteriores";
  const list = showPast ? past : upcoming;

  return (
    <section className="view" aria-label="Mis citas">
      <div className="page-head">
        <div>
          <span className="tag">Mis citas</span>
          <h1>
            Tus horas, <span className="accent">a la mano</span>
          </h1>
          <p className="lead">Confirma o cancela tus citas sin llamar a la clínica.</p>
        </div>
        <Link className="btn" href={`/portal/${params.slug}/reservar`}>
          <Plus size={16} />
          Reservar hora
        </Link>
      </div>

      <nav className="seg" aria-label="Filtrar citas">
        <Link href={base} aria-current={!showPast ? "page" : undefined}>
          Próximas <span className="n">{upcoming.length}</span>
        </Link>
        <Link href={`${base}?ver=anteriores`} aria-current={showPast ? "page" : undefined}>
          Anteriores <span className="n">{past.length}</span>
        </Link>
      </nav>

      {list.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {list.map((a) => (
            <article className="card" key={a.id}>
              <AppointmentCard slug={params.slug} appointment={a} />
            </article>
          ))}
        </div>
      ) : (
        <div className="card empty">
          <ZensyaLogo size={44} />
          <b>{showPast ? "Aún no tienes citas anteriores" : "No tienes horas reservadas"}</b>
          {!showPast ? (
            <Link className="btn sm" href={`/portal/${params.slug}/reservar`}>
              Reservar hora
            </Link>
          ) : null}
        </div>
      )}

      <div className="notice">
        <Info size={18} />
        <span>
          Puedes confirmar o cancelar desde aquí hasta {CANCEL_MIN_HOURS} horas antes. Después de eso, llama a la clínica. Recuerda llegar 10 minutos antes de tu hora.
        </span>
      </div>
    </section>
  );
}
