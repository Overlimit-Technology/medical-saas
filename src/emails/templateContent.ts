import { DEFAULT_TEMPLATES, type EmailTemplateType } from "@/domain/clinic-settings/entities/EmailTemplate";

/** Escapa texto para insertarlo dentro de HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Limpieza basica del HTML que escribe la clinica en el editor de plantillas.
 * Las variables ya llegan escapadas (ver `buildTemplateContent`); esto solo quita lo ejecutable
 * (script, iframe, formularios, manejadores on*, URLs javascript:) que un editor nunca deberia producir.
 */
export function sanitizeEmailHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|form|link|meta|base|svg|math)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|link|meta|base|svg|math)\b[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src|xlink:href)\s*=\s*("|')\s*(javascript|vbscript|data):[^"']*\2/gi, ' $1="#"');
}

export type TemplateBlock =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "details"; rows: { label: string; value: string }[] };

export type TemplateContent = {
  subject: string;
  /** "html": cuerpo HTML ya con variables escapadas y saneado. "text": texto plano (React lo escapa al renderizar). */
  format: "html" | "text";
  body: string;
};

function singleLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/**
 * Interpola `{{variable}}` en asunto y cuerpo.
 * - Asunto: texto plano en una sola linea.
 * - Cuerpo HTML (plantilla personalizada): los valores se escapan, asi un nombre con `<script>` no inyecta HTML.
 * - Cuerpo de texto: se deja crudo y se escapa al renderizar el componente.
 */
export function buildTemplateContent(
  subjectTemplate: string,
  bodyTemplate: string,
  variables: Record<string, string>,
): TemplateContent {
  const isHtml = bodyTemplate.includes("<") && bodyTemplate.includes(">");
  let subject = subjectTemplate;
  // El HTML de la plantilla se sanea ANTES de insertar variables (que se escapan aparte).
  let body = isHtml ? sanitizeEmailHtml(bodyTemplate) : bodyTemplate;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const text = String(value ?? "");
    subject = subject.replaceAll(placeholder, singleLine(text));
    body = body.replaceAll(placeholder, isHtml ? escapeHtml(text) : text);
  }

  return {
    subject,
    format: isHtml ? "html" : "text",
    body,
  };
}

/** Contenido de la plantilla por defecto de un tipo (para previsualizar y pruebas, sin base de datos). */
export function buildDefaultContent(eventType: EmailTemplateType, variables: Record<string, string>) {
  const defaults = DEFAULT_TEMPLATES[eventType];
  return buildTemplateContent(defaults.subject, defaults.body, variables);
}

const DETAIL_LINE = /^([^:\n]{2,40}):\s+(\S.*)$/;

/** Divide un texto plano en parrafos y bloques "Etiqueta: valor" para mostrarlos como tarjeta. */
export function parsePlainBody(text: string): TemplateBlock[] {
  return text
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((chunk) => chunk.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0)
    .map<TemplateBlock>((lines) => {
      const rows = lines.map((line) => DETAIL_LINE.exec(line));
      if (rows.every(Boolean)) {
        return { kind: "details", rows: rows.map((m) => ({ label: m![1].trim(), value: m![2].trim() })) };
      }
      return { kind: "paragraph", lines };
    });
}
