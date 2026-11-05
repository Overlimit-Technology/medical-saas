// Pruebas de la ficha por especialidad: cifrado de campos, catalogo de tipos de atencion y sugerencia.
//   npx tsx --test tests/clinicalRecord.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { decryptField, encryptField, isEncrypted } from "../src/server/security/fieldCrypto";
import { DEFAULT_ATTENTION_TYPES, NOTE_FORMATS, fieldIdsOf, specialtyFor, suggestType } from "../src/lib/clinical/attentionTypes";

// La clave se lee al cifrar, no al importar: basta fijarla antes de las pruebas.
process.env.CLINICAL_DATA_KEY = randomBytes(32).toString("base64");


test("cifra y descifra sin perder texto, con IV distinto cada vez", () => {
  const text = "Alergia a penicilina. Paciente refiere ánimo 3/10 — ñandú";
  const a = encryptField(text);
  const b = encryptField(text);
  assert.ok(isEncrypted(a));
  assert.notEqual(a, b);
  assert.ok(!a.includes("penicilina"));
  assert.equal(decryptField(a), text);
  assert.equal(decryptField(b), text);
});

test("los datos antiguos sin cifrar se leen tal cual", () => {
  assert.equal(decryptField("texto plano"), "texto plano");
  assert.equal(decryptField(null), "");
});

test("un valor alterado no se descifra", () => {
  const enc = encryptField("secreto");
  const tampered = enc.slice(0, -2) + (enc.endsWith("A") ? "B" : "A") + enc.slice(-1);
  assert.throws(() => decryptField(tampered));
});

test("cada especialidad trae sus tarjetas de fabrica", () => {
  const by = (s: string) => DEFAULT_ATTENTION_TYPES.filter((t) => t.specialty === s).map((t) => t.name);
  assert.deepEqual(by("kinesiologia"), ["Evaluacion inicial", "Sesion / gimnasio", "Reevaluacion"]);
  assert.deepEqual(by("nutricion"), ["Primera consulta", "Control"]);
  assert.deepEqual(by("psicologia"), ["Primera entrevista", "Seguimiento", "Cierre / alta"]);
  assert.deepEqual(by("medicina"), ["Primera vez", "Control", "Revision de examenes"]);
  assert.deepEqual(by("matroneria"), ["Ingreso prenatal", "Control prenatal", "Posparto"]);
  assert.deepEqual(by("terapia-ocupacional"), ["Evaluacion inicial", "Intervencion", "Reevaluacion de metas"]);
  assert.deepEqual(by("dermo"), ["Evaluacion", "Procedimiento", "Control con fotos"]);
});

test("claves unicas y campos con id estable para mostrar el valor anterior", () => {
  const keys = DEFAULT_ATTENTION_TYPES.map((t) => t.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const type of DEFAULT_ATTENTION_TYPES) {
    const ids = type.blocks.flatMap((b) => b.fields.map((f) => f.id));
    assert.equal(new Set(ids).size, ids.length, `ids repetidos en ${type.key}`);
    for (const id of Array.from(fieldIdsOf(type))) assert.match(id, /^[a-z0-9._-]+$/i);
  }
  // El control de nutricion compara el peso con la primera consulta por el mismo id.
  const first = fieldIdsOf(DEFAULT_ATTENTION_TYPES.find((t) => t.key === "nutricion.primera")!);
  const control = fieldIdsOf(DEFAULT_ATTENTION_TYPES.find((t) => t.key === "nutricion.control")!);
  assert.ok(first.has("body.weight") && control.has("body.weight"));
});

test("formatos de nota", () => {
  assert.deepEqual(NOTE_FORMATS.soap.fields.map((f) => f.id), ["note.s", "note.o", "note.a", "note.p"]);
  assert.deepEqual(NOTE_FORMATS.dap.fields.map((f) => f.id), ["note.d", "note.a", "note.p"]);
  assert.deepEqual(NOTE_FORMATS.birp.fields.map((f) => f.id), ["note.b", "note.i", "note.r", "note.p"]);
  assert.equal(NOTE_FORMATS.free.fields.length, 1);
});

test("especialidad desde la profesion o el texto libre", () => {
  assert.equal(specialtyFor("kinesiologo"), "kinesiologia");
  assert.equal(specialtyFor("nutricionista"), "nutricion");
  assert.equal(specialtyFor("matron"), "matroneria");
  assert.equal(specialtyFor(null, "Dermatologia estetica"), "dermo");
  assert.equal(specialtyFor(null, null), "medicina");
});

test("sugiere la tarjeta mas probable", () => {
  const kine = DEFAULT_ATTENTION_TYPES.filter((t) => t.specialty === "kinesiologia");
  assert.equal(suggestType(kine, { previousVisits: 0 }), "kinesiologia.evaluacion");
  assert.equal(suggestType(kine, { previousVisits: 3, lastTypeKey: "kinesiologia.evaluacion" }), "kinesiologia.sesion");
  assert.equal(suggestType(kine, { previousVisits: 3, lastTypeKey: "kinesiologia.reevaluacion" }), "kinesiologia.reevaluacion");
  // Lo que eligio recepcion manda.
  assert.equal(suggestType(kine, { previousVisits: 0, preselected: "kinesiologia.sesion" }), "kinesiologia.sesion");
  // Una clave que no esta en la lista se ignora.
  assert.equal(suggestType(kine, { previousVisits: 0, preselected: "nutricion.control" }), "kinesiologia.evaluacion");
});
