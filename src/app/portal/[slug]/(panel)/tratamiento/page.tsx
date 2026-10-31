import ZensyaLogo from "@/presentation/portal/ZensyaLogo";
import { longDate, shortDate } from "@/presentation/portal/format";
import { PortalService, requirePortalPage } from "@/server/portal/PortalService";

export const dynamic = "force-dynamic";

const PLAN_STATUS = {
  ACTIVE: { label: "En curso", tone: "ok" },
  COMPLETED: { label: "Finalizado", tone: "off" },
  CANCELLED: { label: "Cancelado", tone: "off" },
} as const;

export default async function PortalTratamiento({ params }: { params: { slug: string } }) {
  const ctx = await requirePortalPage(params.slug);
  const plans = await PortalService.plans(ctx);

  return (
    <section className="view" aria-label="Mi tratamiento">
      <div className="page-head">
        <div>
          <span className="tag">Mi tratamiento</span>
          <h1>
            Así va tu <span className="accent">tratamiento</span>
          </h1>
          <p className="lead">Tus planes, las sesiones que llevas y las que vienen.</p>
        </div>
      </div>

      {plans.length ? (
        plans.map((plan) => {
          const st = PLAN_STATUS[plan.status];
          return (
            <article className="card" key={plan.id}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className={`st ${st.tone}`} style={{ alignSelf: "flex-start" }}>
                    {st.label}
                  </span>
                  <h2 style={{ font: "700 24px/1.2 var(--zs-font-display)", letterSpacing: "-.6px" }}>{plan.name}</h2>
                  <p className="text">
                    Desde el {shortDate(plan.startsAt)}
                    {plan.endsAt ? ` hasta el ${shortDate(plan.endsAt)}` : ""}
                    {plan.professional ? ` · con ${plan.professional}` : ""}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <b className="num" style={{ font: "700 40px/1 var(--zs-font-display)", letterSpacing: "-1.5px" }}>
                    {plan.done}
                    <span className="muted" style={{ fontSize: 22 }}>/{plan.total}</span>
                  </b>
                  <p className="small">sesiones realizadas</p>
                </div>
              </div>
              {plan.total ? (
                <div className="sessions" aria-hidden="true">
                  {Array.from({ length: plan.total }, (_, i) => {
                    const cls = i < plan.done ? "done" : i < plan.done + plan.missed ? "miss" : i === plan.done + plan.missed && plan.next ? "next" : "";
                    return <i key={i} className={cls} />;
                  })}
                </div>
              ) : null}
              {plan.next ? (
                <p className="small">
                  Próxima sesión: {longDate(plan.next.startAt)} con {plan.next.doctorName}.
                </p>
              ) : null}
              {plan.missed ? <p className="small">Faltaste a {plan.missed} sesión{plan.missed > 1 ? "es" : ""}.</p> : null}
              {plan.treatments.length ? (
                <div className="row" style={{ marginTop: 14, gap: 8 }}>
                  {plan.treatments.map((t) => (
                    <span className="st off" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
              {plan.notes ? (
                <p className="text" style={{ marginTop: 14 }}>
                  {plan.notes}
                </p>
              ) : null}
            </article>
          );
        })
      ) : (
        <div className="card empty">
          <ZensyaLogo size={44} />
          <b>Aún no tienes un plan de tratamiento</b>
          <p className="small">Cuando tu profesional te indique uno, lo verás aquí con el avance de cada sesión.</p>
        </div>
      )}
    </section>
  );
}
