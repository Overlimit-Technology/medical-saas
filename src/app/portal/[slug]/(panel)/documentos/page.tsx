import { ExternalLink, ScanLine } from "lucide-react";
import ZensyaLogo from "@/presentation/portal/ZensyaLogo";
import { capFirst, shortDate } from "@/presentation/portal/format";
import { PortalService, requirePortalPage } from "@/server/portal/PortalService";

export const dynamic = "force-dynamic";

export default async function PortalDocumentos({ params }: { params: { slug: string } }) {
  const ctx = await requirePortalPage(params.slug);
  const docs = await PortalService.documents(ctx);

  return (
    <section className="view" aria-label="Documentos">
      <div className="page-head">
        <div>
          <span className="tag">Documentos</span>
          <h1>
            Tus exámenes, <span className="accent">siempre a mano</span>
          </h1>
          <p className="lead">Imágenes y exámenes que la clínica registró en tu ficha.</p>
        </div>
      </div>

      <div className="card">
        {docs.length ? (
          <div className="rows">
            {docs.map((doc) => (
              <div className="lrow" key={doc.id}>
                <span className="icon">
                  <ScanLine size={18} strokeWidth={1.8} />
                </span>
                <div>
                  <b>{doc.studyName}</b>
                  <span className="small">
                    {shortDate(doc.studiedAt)} · {doc.doctorName}
                  </span>
                  {doc.observation ? <p className="small">{doc.observation}</p> : null}
                </div>
                <span className={`st ${doc.imageUrl ? "ok" : "warn"}`}>
                  {doc.imageUrl ? "Disponible" : capFirst(doc.status)}
                </span>
                {doc.imageUrl ? (
                  <a className="btn quiet sm" href={doc.imageUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={15} />
                    Ver
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <ZensyaLogo size={44} />
            <b>Aún no tienes documentos</b>
            <p className="small">Cuando la clínica suba tus exámenes o imágenes, aparecerán aquí.</p>
          </div>
        )}
      </div>
    </section>
  );
}
