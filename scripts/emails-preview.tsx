// Ejecutar: npm run emails:preview
// Escribe el HTML y el texto de cada correo con datos de ejemplo en .email-preview/ (ignorado por git).
import fs from "node:fs";
import path from "node:path";
import { getEmailSamples } from "../src/emails/registry";
import { renderEmail } from "../src/emails/render";

async function main() {
  const dir = path.join(process.cwd(), ".email-preview");
  fs.mkdirSync(dir, { recursive: true });
  const links: string[] = [];

  for (const sample of getEmailSamples()) {
    const { html, text } = await renderEmail(sample.element);
    fs.writeFileSync(path.join(dir, `${sample.id}.html`), html, "utf8");
    fs.writeFileSync(path.join(dir, `${sample.id}.txt`), text, "utf8");
    links.push(`<li><a href="${sample.id}.html">${sample.label}</a> <small>(${sample.subject})</small></li>`);
    console.log(`  ${sample.id}.html`);
  }

  fs.writeFileSync(
    path.join(dir, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Correos de ZENSYA</title><body style="font-family:sans-serif"><h1>Correos de ZENSYA</h1><ul>${links.join("")}</ul></body>`,
    "utf8",
  );
  console.log(`\nListo: abre ${path.join(dir, "index.html")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
