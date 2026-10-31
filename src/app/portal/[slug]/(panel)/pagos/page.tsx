import ZensyaLogo from "@/presentation/portal/ZensyaLogo";
import { PAYMENT_STATUS, clp, shortDate } from "@/presentation/portal/format";
import { PortalService, requirePortalPage } from "@/server/portal/PortalService";

export const dynamic = "force-dynamic";

export default async function PortalPagos({ params }: { params: { slug: string } }) {
  const ctx = await requirePortalPage(params.slug);
  const payments = await PortalService.payments(ctx);
  const pending = payments.filter((p) => p.status === "PENDING");
  const pendingTotal = pending.reduce((sum, p) => sum + p.amount, 0);
  const paidTotal = payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amount, 0);

  return (
    <section className="view" aria-label="Pagos">
      <div className="page-head">
        <div>
          <span className="tag">Pagos</span>
          <h1>
            Tus pagos, <span className="accent">claros</span>
          </h1>
          <p className="lead">Lo que tienes pendiente y lo que ya pagaste.</p>
        </div>
      </div>

      <div className="grid g-2">
        <div className="card">
          <div className="card-h">
            <h2>Pendiente</h2>
            <span className={`st ${pending.length ? "warn" : "ok"}`}>{pending.length ? `${pending.length} por pagar` : "Al día"}</span>
          </div>
          <b className="num" style={{ font: "700 44px/1 var(--zs-font-display)", letterSpacing: "-1.5px" }}>
            {clp(pendingTotal)}
          </b>
          <p className="small" style={{ marginTop: 10 }}>
            Puedes pagar en recepción en tu próxima atención.
          </p>
        </div>
        <div className="card">
          <div className="card-h">
            <h2>Pagado</h2>
          </div>
          <b className="num" style={{ font: "700 44px/1 var(--zs-font-display)", letterSpacing: "-1.5px" }}>
            {clp(paidTotal)}
          </b>
          <p className="small" style={{ marginTop: 10 }}>
            {payments.length} registro{payments.length === 1 ? "" : "s"} en total.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h2>Detalle</h2>
        </div>
        {payments.length ? (
          <div className="table">
            <div className="trow head">
              <span>Fecha</span>
              <span>Concepto</span>
              <span>Monto</span>
              <span className="end">Estado</span>
            </div>
            {payments.map((p) => {
              const st = PAYMENT_STATUS[p.status];
              return (
                <div className="trow" key={p.id}>
                  <span className="t-date num">{shortDate(p.date)}</span>
                  <b>{p.concept}</b>
                  <span className="t-sub num">{clp(p.amount)}</span>
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
            <b>Aún no tienes pagos registrados</b>
          </div>
        )}
      </div>
    </section>
  );
}
