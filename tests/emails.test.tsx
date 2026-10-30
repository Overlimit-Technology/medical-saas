// Ejecutar: npm run test:emails
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { getEmailSamples } from "../src/emails/registry";
import { renderEmail, renderManualEmail } from "../src/emails/render";
import { TemplateEmail } from "../src/emails/TemplateEmail";
import {
  buildDefaultContent,
  buildTemplateContent,
  escapeHtml,
  parsePlainBody,
  sanitizeEmailHtml,
} from "../src/emails/templateContent";

test("todos los correos de ejemplo se renderizan con layout, marca y texto plano", async () => {
  const samples = getEmailSamples();
  assert.ok(samples.length >= 10);
  for (const sample of samples) {
    const { html, text } = await renderEmail(sample.element);
    assert.match(html, /<html[^>]*lang="es"/, sample.id);
    assert.match(html, /ZENSYA/, sample.id);
    assert.match(html, /#19b3bc/i, sample.id);
    assert.match(html, /max-width:\s*600px/, sample.id);
    assert.match(html, /Ley 21\.719/, sample.id);
    assert.ok(text.length > 40, sample.id);
    if (sample.id !== "plantilla-personalizada-html") assert.doesNotMatch(text, /<[a-z]+[ >]/i, `${sample.id}: el texto plano no debe tener HTML`);
  }
});

test("un nombre con <script> queda escapado en plantilla por defecto (texto)", async () => {
  const content = buildDefaultContent("PATIENT_WELCOME", {
    firstName: '<script>alert("x")</script>',
    clinicName: "Clinica <b>Uno</b>",
  });
  const { html } = await renderEmail(React.createElement(TemplateEmail, { eventType: "PATIENT_WELCOME", content }));
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /<b>Uno<\/b>/);
  assert.match(html, /&lt;script&gt;/);
});

test("un nombre con <script> queda escapado en plantilla personalizada (HTML)", async () => {
  const content = buildTemplateContent(
    "Hola {{patientName}}",
    '<p>Hola <strong>{{patientName}}</strong></p><script>evil()</script><p onclick="x()">ok</p>',
    { patientName: "<img src=x onerror=alert(1)><script>alert(1)</script>\r\nBcc: a@b.cl" },
  );
  const { html } = await renderEmail(React.createElement(TemplateEmail, { eventType: "APPOINTMENT_CONFIRMATION", content }));
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /<img src=x/i);
  assert.doesNotMatch(html, /onclick/i);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(content.subject, /[\r\n]/);
});

test("el correo USER_WELCOME muestra usuario y clave temporal y el boton de ingreso", async () => {
  const sample = getEmailSamples().find((item) => item.id === "user-welcome");
  assert.ok(sample);
  const { html, text } = await renderEmail(sample.element);
  assert.match(html, /Tmp-8Kq2vX/);
  assert.match(html, /href="https:\/\/app\.zensya\.cl\/login"/);
  assert.match(text, /Iniciar sesion/);
});

test("correo manual: el HTML del ADMIN se sanea y el texto se escapa", async () => {
  const withHtml = await renderManualEmail({
    subject: "Aviso",
    html: '<p>Hola</p><script>x()</script><a href="javascript:alert(1)">ver</a>',
  });
  assert.doesNotMatch(withHtml.html, /<script/i);
  assert.doesNotMatch(withHtml.html, /javascript:/i);
  const withText = await renderManualEmail({ subject: "Aviso <b>", text: "Linea <i>1</i>" });
  assert.match(withText.html, /Linea &lt;i&gt;1&lt;\/i&gt;/);
});

test("helpers: escapeHtml, sanitizeEmailHtml y parsePlainBody", () => {
  assert.equal(escapeHtml('<a href="x">&'), "&lt;a href=&quot;x&quot;&gt;&amp;");
  assert.equal(sanitizeEmailHtml('<p onclick="a()">x</p>'), "<p>x</p>");
  const blocks = parsePlainBody("Hola Ana,\n\nProfesional: Dr. Lopez\nSede: Centro");
  assert.equal(blocks[0].kind, "paragraph");
  assert.equal(blocks[1].kind, "details");
});
