import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardList, UserRound, Wallet } from "lucide-react";
import AppointmentCard from "@/presentation/portal/AppointmentCard";
import ZensyaLogo from "@/presentation/portal/ZensyaLogo";
import { capFirst, clp, longDate, shortDate } from "@/presentation/portal/format";
import { PortalService, requirePortalPage } from "@/server/portal/PortalService";

export const dynamic = "force-dynamic";

export default async function PortalInicio({ params }: { params: { slug: string } }) {
  const ctx = await requirePortalPage(params.slug);
  const base = `/portal/${params.slug}`;
  const [appointments, plans, payments] = await Promise.all([
    PortalService.appointments(ctx),
    PortalService.plans(ctx),
    PortalService.payments(ctx),
  ]);

  const now = new Date();
  const upcoming = appointments.filter((a) => (a.status === "SCHEDULED" || a.status === "CONFIRMED") && a.startAt > now);
  const next = upcoming[0];
  const recent = appointments.filter((a) => a.status === "COMPLETED").slice(-3).reverse();
  const activePlan = plans.find((p) => p.status === "ACTIVE");
  const pendingPay = payments.filter((p) => p.status === "PENDING");
  const pendingTotal = pendingPay.reduce((sum, p) => sum + p.amount, 0);

  const todos = [
    ...upcoming
      .filter((a) => a.status === "SCHEDULED")
      .map((a) => ({ icon: CalendarDays, title: "Confirma tu cita", sub: `${a.specialty} · ${longDate(a.startAt)}`, href: `${base}/citas`, cta: "Ver cita" })),
    ...(pendingPay.length
      ? [{ icon: Wallet, title: `Tienes ${pendingPay.length} pago${pendingPay.length > 1 ? "s" : ""} pendiente${pendingPay.length > 1 ? "s" : ""}`, sub: `Total ${clp(pendingTotal)}`, href: `${base}/pagos`, cta: "Ver pagos" }]
      : []),
    ...(!ctx.patient.phone || !ctx.patient.emergencyContactName
      ? [{ icon: UserRound, title: "Completa tus datos de contacto", sub: "Teléfono y contacto de emergencia", href: `${base}/perfil`, cta: "Completar" }]
      : []),
  ];

  const pct = activePlan && activePlan.total ? activePlan.done / activePlan.total : 0;
  const today = longDate(now);

  return (
    <section className="view" aria-label="Inicio">
      <div className="hero">
        <span className="glow" aria-hidden="true" />
        <span className="orbit" style={{ width: 560, height: 560, right: -180, top: -250 }} aria-hidden="true" />
        <div className="hero-copy">
          <ZensyaLogo size={56} />
          <span className="tag">{capFirst(today)}</span>
          <h1>
            Hola, <span className="accent">{ctx.patient.firstName}</span>
          </h1>
          <p className="hero-sub">
            {upcoming.length
              ? `Tienes ${upcoming.length === 1 ? "una cita" : `${upcoming.length} citas`} por delante`
              : "No tienes citas por delante"}
            {todos.length ? ` y ${todos.length} cosa${todos.length > 1 ? "s" : ""} por hacer.` : "."} Todo lo de tu atención en {ctx.clinic.name} está aquí.
          </p>
          <div className="row">
            <Link className="btn" href={`${base}/reservar`}>
              Reservar hora <ArrowRight size={16} className="go" />
            </Link>
            <Link className="btn quiet" href={`${base}/citas`}>
              Ver mis citas
            </Link>
          </div>
        </div>
        <article className="next" aria-label="Próxima cita">
          <div className="next-top">
            <span className="label">Próxima cita</span>
          </div>
          {next ? (
            <AppointmentCard slug={params.slug} appointment={next} compact />
          ) : (
            <div className="empty" style={{ padding: 12 }}>
              <b>No tienes horas reservadas</b>
              <Link className="btn sm" href={`${base}/reservar`}>
                Reservar hora
              </Link>
            </div>
          )}
        </article>
      </div>

      <div className="grid g-main">
        <div className="card">
          <div className="card-h">
            <h2>
              Por hacer <span className={`st ${todos.length ? "warn" : "ok"}`}>{todos.length ? `${todos.length} pendiente${todos.length > 1 ? "s" : ""}` : "Al día"}</span>
            </h2>
          </div>
          {todos.length ? (
            <div className="rows">
              {todos.map((todo) => {
                const Icon = todo.icon;
                return (
                  <div className="lrow" key={todo.title + todo.sub}>
                    <span className="icon warn">
                      <Icon size={18} strokeWidth={1.8} />
                    </span>
                    <div>
                      <b>{todo.title}</b>
                      <span className="small" style={{ textTransform: "none" }}>{todo.sub}</span>
                    </div>
                    <Link className="btn ghost sm" href={todo.href}>
                      {todo.cta}
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text">No tienes nada pendiente con la clínica.</p>
          )}
        </div>

        <div className="card">
          <div className="card-h">
            <h2>Mi tratamiento</h2>
            <Link className="link" href={`${base}/tratamiento`}>
              Ver todo <ArrowRight size={15} />
            </Link>
          </div>
          {activePlan ? (
            <div className="plan-row">
              <div className="progress" aria-label={`${activePlan.done} de ${activePlan.total} sesiones`}>
                <svg viewBox="0 0 112 112">
                  <circle className="bg" cx="56" cy="56" r="46" />
                  <circle className="fg" cx="56" cy="56" r="46" strokeDasharray="289" strokeDashoffset={289 * (1 - pct)} />
                </svg>
                <div>
                  <b className="num">
                    {activePlan.done}/{activePlan.total}
                  </b>
                  <span className="small">sesiones</span>
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ font: "700 18px/1.3 var(--zs-font-display)" }}>{activePlan.name}</h3>
                {activePlan.professional ? <p className="small">Con {activePlan.professional}</p> : null}
                {activePlan.next ? <p className="small">Próxima: {longDate(activePlan.next.startAt)}</p> : null}
              </div>
            </div>
          ) : (
            <p className="text">No tienes un plan de tratamiento activo.</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h2>Últimas atenciones</h2>
          <Link className="link" href={`${base}/historial`}>
            Ver historial <ArrowRight size={15} />
          </Link>
        </div>
        {recent.length ? (
          <div className="rows">
            {recent.map((a) => (
              <div className="lrow" key={a.id}>
                <span className="icon">
                  <ClipboardList size={18} strokeWidth={1.8} />
                </span>
                <div>
                  <b>{a.planName ?? a.specialty}</b>
                  <span className="small">
                    {shortDate(a.startAt)} · {a.doctorName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text">Aún no tienes atenciones registradas.</p>
        )}
      </div>
    </section>
  );
}
