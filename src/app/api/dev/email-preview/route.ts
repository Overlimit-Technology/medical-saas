import { NextResponse } from "next/server";
import { getEmailSamples } from "@/emails/registry";
import { renderEmail } from "@/emails/render";
import { requireAuthSession } from "@/server/auth/requireSession";

export const dynamic = "force-dynamic";

function notFound() {
  return new NextResponse("No encontrado", { status: 404 });
}

/** En produccion solo el super admin puede ver la previsualizacion; fuera de produccion es libre (solo datos de ejemplo). */
async function canPreview() {
  if (process.env.NODE_ENV !== "production") return true;
  try {
    const session = await requireAuthSession();
    return session.isSuperAdmin === true;
  } catch {
    return false;
  }
}

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * GET /api/dev/email-preview            -> indice de todos los correos
 * GET /api/dev/email-preview?tipo=<id>  -> HTML del correo con datos de ejemplo
 * GET /api/dev/email-preview?tipo=<id>&formato=texto -> version de texto plano
 */
export async function GET(req: Request) {
  if (!(await canPreview())) return notFound();

  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo");
  const samples = getEmailSamples();

  if (tipo) {
    const sample = samples.find((item) => item.id === tipo);
    if (!sample) return notFound();
    const rendered = await renderEmail(sample.element);
    if (url.searchParams.get("formato") === "texto") {
      return new NextResponse(rendered.text, { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    return new NextResponse(rendered.html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  const items = samples
    .map(
      (s) =>
        `<li><a href="?tipo=${esc(s.id)}">${esc(s.label)}</a> <small>asunto: ${esc(s.subject)}</small> ` +
        `<a href="?tipo=${esc(s.id)}&formato=texto"><small>[texto]</small></a></li>`,
    )
    .join("");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Correos de ZENSYA</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:32px auto;padding:0 16px;color:#0f172a}li{margin:10px 0}small{color:#64748b}a{color:#0f8f97}</style></head>
<body><h1>Correos de ZENSYA (datos de ejemplo)</h1><ul>${items}</ul></body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
