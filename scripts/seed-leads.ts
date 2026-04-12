/**
 * Seed CRM leads test data directly into the database.
 * Usage: npx tsx scripts/seed-leads.ts
 *
 * Finds the first active clinic and seeds 12 test leads with
 * notes, messages, and 6 pipeline columns.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find the first clinic
  const clinic = await prisma.clinic.findFirst({ where: { isActive: true } });
  if (!clinic) {
    console.error("No active clinic found. Create one first.");
    process.exit(1);
  }
  const clinicId = clinic.id;
  console.log(`Seeding leads for clinic: ${clinic.name} (${clinicId})`);

  // Clear existing CRM data for this clinic
  await prisma.crmLeadMessage.deleteMany({ where: { lead: { clinicId } } });
  await prisma.crmLeadNote.deleteMany({ where: { lead: { clinicId } } });
  await prisma.crmLead.deleteMany({ where: { clinicId } });
  await prisma.leadColumn.deleteMany({ where: { clinicId } });
  console.log("Cleared existing CRM data.");

  // Create columns
  const columnDefs = [
    { name: "Nuevo Lead", color: "#818cf8", position: 0 },
    { name: "Contactado", color: "#f59e0b", position: 1 },
    { name: "En Negociacion", color: "#3b82f6", position: 2 },
    { name: "Propuesta Enviada", color: "#8b5cf6", position: 3 },
    { name: "Ganado", color: "#10b981", position: 4 },
    { name: "Perdido", color: "#ef4444", position: 5 },
  ];

  const cols = [];
  for (const def of columnDefs) {
    const col = await prisma.leadColumn.create({ data: { clinicId, ...def } });
    cols.push(col);
  }
  console.log(`Created ${cols.length} columns.`);

  // Lead definitions
  const leadDefs = [
    {
      name: "Maria Gonzalez", company: "Clinica Santa Maria", channel: "whatsapp",
      phone: "+56 9 8765 4321", email: "maria.gonzalez@clinicasm.cl", sector: "Salud",
      colIdx: 0, priority: "high", budget: 2500000,
      mainNote: "Interesada en sistema de gestion para 3 sedes. Tiene urgencia por implementar antes de julio.",
      tags: ["vip", "clinica", "urgente"],
      createdAt: "2026-04-01T10:30:00Z", updatedAt: "2026-04-02T14:15:00Z",
      notes: [
        { text: "Primer contacto via WhatsApp. Pidio informacion general.", at: "2026-04-01T10:30:00Z" },
        { text: "Tiene 3 sedes en Santiago y 45 profesionales.", at: "2026-04-02T14:15:00Z" },
      ],
      messages: [
        { text: "Hola, me interesa su software de gestion clinica. Tenemos 3 sedes.", dir: "inbound", ch: "whatsapp", at: "2026-04-01T10:30:00Z" },
        { text: "Hola Maria! Claro, con gusto te ayudo. Nuestro sistema soporta multi-sede. Podemos agendar una demo?", dir: "outbound", ch: "whatsapp", at: "2026-04-01T10:35:00Z" },
        { text: "Si, perfecto. Puede ser el jueves a las 15:00?", dir: "inbound", ch: "whatsapp", at: "2026-04-01T10:38:00Z" },
        { text: "Agendado! Te envio link de la reunion por correo.", dir: "outbound", ch: "whatsapp", at: "2026-04-01T10:40:00Z" },
      ],
    },
    {
      name: "Carlos Muñoz", company: "DermaCare SpA", channel: "instagram",
      phone: "+56 9 6543 2109", email: "carlos@dermacare.cl", sector: "Estetica",
      colIdx: 1, priority: "medium", budget: 800000,
      mainNote: "Vio una publicacion en Instagram. Tiene un centro de estetica pequeño.",
      tags: ["estetica", "seguimiento"],
      createdAt: "2026-03-28T09:00:00Z", updatedAt: "2026-03-29T16:20:00Z",
      notes: [
        { text: "Respondio a un reel. Interesado en modulo de agenda.", at: "2026-03-28T09:00:00Z" },
        { text: "Le enviamos brochure por DM. Queda pendiente llamada.", at: "2026-03-29T16:20:00Z" },
      ],
      messages: [
        { text: "Vi su post sobre gestion clinica, me interesa!", dir: "inbound", ch: "instagram", at: "2026-03-28T09:00:00Z" },
        { text: "Hola Carlos! Gracias por tu interes. Te cuento que ofrecemos gestion de agenda, pacientes y cobros.", dir: "outbound", ch: "instagram", at: "2026-03-28T09:15:00Z" },
        { text: "Genial, lo revisare y les escribo.", dir: "inbound", ch: "instagram", at: "2026-03-28T09:20:00Z" },
      ],
    },
    {
      name: "Ana Torres", company: "Consulta Medica Torres", channel: "facebook",
      phone: "+56 9 7777 8888", email: "ana.torres@gmail.com", sector: "Salud",
      colIdx: 2, priority: "high", budget: 1500000,
      mainNote: "Quiere migrar desde software antiguo. Necesita exportar datos de pacientes actuales.",
      tags: ["clinica", "vip", "seguimiento"],
      createdAt: "2026-03-18T14:00:00Z", updatedAt: "2026-03-25T15:00:00Z",
      notes: [
        { text: "Demo completada. Muy interesada, pidio cotizacion formal.", at: "2026-03-20T11:00:00Z" },
        { text: "Tiene ~800 pacientes en sistema actual (Excel + software local).", at: "2026-03-22T09:30:00Z" },
        { text: "Pidio plan de migracion de datos. Preparar propuesta.", at: "2026-03-25T15:00:00Z" },
      ],
      messages: [
        { text: "Hola, vi su pagina en Facebook. Necesito cambiar de sistema.", dir: "inbound", ch: "facebook", at: "2026-03-18T14:00:00Z" },
        { text: "Hola Ana! Con gusto. Que sistema usan actualmente?", dir: "outbound", ch: "facebook", at: "2026-03-18T14:10:00Z" },
        { text: "Usamos un Excel enorme y un programa viejo que ya no tiene soporte.", dir: "inbound", ch: "facebook", at: "2026-03-18T14:15:00Z" },
        { text: "Entiendo. Podemos ayudarte con la migracion. Agendamos una demo?", dir: "outbound", ch: "facebook", at: "2026-03-18T14:20:00Z" },
        { text: "La demo estuvo excelente! Necesito la cotizacion para presentar al directorio.", dir: "inbound", ch: "facebook", at: "2026-03-20T12:00:00Z" },
      ],
    },
    {
      name: "Roberto Soto", company: "Dental Pro", channel: "telegram",
      phone: "+56 9 3333 4444", email: "rsoto@dentalpro.cl", sector: "Odontologia",
      colIdx: 3, priority: "urgent", budget: 3200000,
      mainNote: "Cadena de 5 clinicas dentales. Propuesta enviada por $3.200.000. Espera respuesta del gerente general.",
      tags: ["vip", "corporativo", "urgente"],
      createdAt: "2026-03-10T08:00:00Z", updatedAt: "2026-03-25T11:00:00Z",
      notes: [
        { text: "Contacto inicial via Telegram. Busca solucion para 5 sedes.", at: "2026-03-10T08:00:00Z" },
        { text: "Demo exitosa. Impresionado con modulo FHIR.", at: "2026-03-14T16:00:00Z" },
        { text: "Propuesta formal enviada. Incluye implementacion + migracion.", at: "2026-03-18T10:00:00Z" },
        { text: "Gerente pidio una semana mas para evaluar. Seguimiento el lunes.", at: "2026-03-25T11:00:00Z" },
      ],
      messages: [
        { text: "Buenos dias, me recomendaron su sistema. Tenemos 5 clinicas dentales.", dir: "inbound", ch: "telegram", at: "2026-03-10T08:00:00Z" },
        { text: "Hola Roberto! Excelente. Podemos coordinar una demo personalizada.", dir: "outbound", ch: "telegram", at: "2026-03-10T08:30:00Z" },
        { text: "Le envie la propuesta al correo. Quedamos atentos!", dir: "outbound", ch: "telegram", at: "2026-03-18T10:05:00Z" },
        { text: "Recibida. La estoy revisando con el gerente. Les aviso.", dir: "inbound", ch: "telegram", at: "2026-03-18T15:00:00Z" },
      ],
    },
    {
      name: "Valentina Reyes", company: "Centro Medico Vida", channel: "email",
      phone: "+56 9 1111 2222", email: "vreyes@centrovida.cl", sector: "Salud",
      colIdx: 4, priority: "medium", budget: 1200000,
      mainNote: "Cerrado! Contrato firmado por 12 meses. Implementacion comienza en mayo.",
      tags: ["clinica", "referido"],
      createdAt: "2026-02-15T10:00:00Z", updatedAt: "2026-03-05T09:00:00Z",
      notes: [
        { text: "Lead via formulario web. Centro medico general.", at: "2026-02-15T10:00:00Z" },
        { text: "Demo realizada. Le gusto el modulo de agenda.", at: "2026-02-20T14:00:00Z" },
        { text: "Negociacion cerrada. Contrato firmado por $1.200.000/año.", at: "2026-03-05T09:00:00Z" },
      ],
      messages: [],
    },
    {
      name: "Felipe Herrera", company: "Kinesiologia Activa", channel: "whatsapp",
      phone: "+56 9 5555 6666", email: "felipe@kineactiva.cl", sector: "Kinesiologia",
      colIdx: 4, priority: "low", budget: 600000,
      mainNote: "Clinica de kinesiologia. Contrato firmado plan basico.",
      tags: ["primera-consulta"],
      createdAt: "2026-03-01T08:00:00Z", updatedAt: "2026-03-12T16:00:00Z",
      notes: [
        { text: "Cerrado con plan basico. Inicio inmediato.", at: "2026-03-12T16:00:00Z" },
      ],
      messages: [
        { text: "Hola! Quiero contratar el plan basico que me mostraron.", dir: "inbound", ch: "whatsapp", at: "2026-03-12T10:00:00Z" },
        { text: "Perfecto Felipe! Te envio el link de pago y empezamos la configuracion.", dir: "outbound", ch: "whatsapp", at: "2026-03-12T10:15:00Z" },
      ],
    },
    {
      name: "Camila Fernandez", company: "Optica Vision Plus", channel: "tiktok",
      phone: "+56 9 4444 3333", email: "", sector: "Oftalmologia",
      colIdx: 5, priority: "low", budget: 500000,
      mainNote: "Decidio quedarse con su sistema actual. Posible recontacto en 6 meses.",
      tags: ["recontactar"],
      createdAt: "2026-03-01T12:00:00Z", updatedAt: "2026-03-15T10:00:00Z",
      notes: [
        { text: "Lead desde TikTok ads. Optica con 1 sucursal.", at: "2026-03-01T12:00:00Z" },
        { text: "No avanzo. Dice que su sistema actual le funciona. Recontactar en septiembre.", at: "2026-03-15T10:00:00Z" },
      ],
      messages: [
        { text: "Vi su anuncio en TikTok. Cuanto cuesta?", dir: "inbound", ch: "tiktok", at: "2026-03-01T12:00:00Z" },
        { text: "Hola Camila! Los planes parten desde $500.000/año. Te cuento mas?", dir: "outbound", ch: "tiktok", at: "2026-03-01T12:30:00Z" },
        { text: "Por ahora no, ya tengo un sistema. Gracias!", dir: "inbound", ch: "tiktok", at: "2026-03-05T09:00:00Z" },
      ],
    },
    {
      name: "Diego Vargas", company: "Traumatologia Deportiva", channel: "referral",
      phone: "+56 9 2222 1111", email: "dvargas@traumadep.cl", sector: "Traumatologia",
      colIdx: 2, priority: "medium", budget: 1800000,
      mainNote: "Referido por Valentina Reyes (Centro Medico Vida). Clinica de traumatologia deportiva.",
      tags: ["referido", "clinica", "seguimiento"],
      createdAt: "2026-03-28T10:00:00Z", updatedAt: "2026-04-01T14:00:00Z",
      notes: [
        { text: "Referido por cliente actual. Muy buena señal.", at: "2026-03-28T10:00:00Z" },
        { text: "Demo agendada para el viernes. Necesita integracion con equipos medicos.", at: "2026-04-01T14:00:00Z" },
      ],
      messages: [],
    },
    {
      name: "Lucia Morales", company: "Psicologia Integral", channel: "website",
      phone: "+56 9 9999 0000", email: "lucia@psicologiaintegral.cl", sector: "Psicologia",
      colIdx: 0, priority: "medium", budget: 450000,
      mainNote: "Completo formulario del sitio web. Consultorio de psicologia, 3 profesionales.",
      tags: ["primera-consulta"],
      createdAt: "2026-04-04T18:00:00Z", updatedAt: "2026-04-04T18:00:00Z",
      notes: [
        { text: "Formulario web completado hoy. Llamar mañana.", at: "2026-04-04T18:00:00Z" },
      ],
      messages: [],
    },
    {
      name: "Pedro Alvarez", company: "Laboratorio BioAnalisis", channel: "phone",
      phone: "+56 9 8888 7777", email: "palvarez@bioanalisis.cl", sector: "Laboratorio",
      colIdx: 1, priority: "high", budget: 4000000,
      mainNote: "Laboratorio clinico grande. Llamo por telefono directo. Necesita integracion FHIR obligatoria.",
      tags: ["vip", "corporativo", "urgente"],
      createdAt: "2026-04-03T09:00:00Z", updatedAt: "2026-04-03T09:30:00Z",
      notes: [
        { text: "Llamada entrante. 2 sedes, 30 empleados. Presupuesto alto.", at: "2026-04-03T09:00:00Z" },
        { text: "Muy interesado en FHIR R4. Agendar demo tecnica con equipo de TI.", at: "2026-04-03T09:30:00Z" },
      ],
      messages: [],
    },
    {
      name: "Isabella Contreras", company: "Dermatologia Estetica IC", channel: "instagram",
      phone: "+56 9 6666 5555", email: "isabella@dermaIC.cl", sector: "Dermatologia",
      colIdx: 0, priority: "low", budget: null,
      mainNote: "Consulta basica por Instagram. Sin presupuesto definido aun.",
      tags: ["dermatologia", "estetica"],
      createdAt: "2026-04-05T11:00:00Z", updatedAt: "2026-04-05T11:00:00Z",
      notes: [],
      messages: [
        { text: "Hola! Tienen software para clinica de dermatologia?", dir: "inbound", ch: "instagram", at: "2026-04-05T11:00:00Z" },
      ],
    },
    {
      name: "Andres Figueroa", company: "", channel: "whatsapp",
      phone: "+56 9 1234 5678", email: "", sector: "Salud",
      colIdx: 5, priority: "low", budget: 300000,
      mainNote: "Consulta individual. Presupuesto muy bajo. No califica.",
      tags: [],
      createdAt: "2026-02-20T10:00:00Z", updatedAt: "2026-02-22T10:00:00Z",
      notes: [
        { text: "Medico independiente. Solo queria agenda basica. No es nuestro perfil de cliente.", at: "2026-02-20T10:00:00Z" },
      ],
      messages: [],
    },
  ];

  let leadCount = 0;
  for (const def of leadDefs) {
    const lead = await prisma.crmLead.create({
      data: {
        clinicId,
        columnId: cols[def.colIdx].id,
        name: def.name,
        company: def.company,
        channel: def.channel,
        phone: def.phone,
        email: def.email,
        sector: def.sector,
        priority: def.priority,
        estimatedBudget: def.budget,
        mainNote: def.mainNote,
        tags: def.tags,
        createdAt: new Date(def.createdAt),
        updatedAt: new Date(def.updatedAt),
      },
    });

    if (def.notes.length > 0) {
      await prisma.crmLeadNote.createMany({
        data: def.notes.map((n) => ({
          leadId: lead.id,
          text: n.text,
          createdAt: new Date(n.at),
        })),
      });
    }

    if (def.messages.length > 0) {
      await prisma.crmLeadMessage.createMany({
        data: def.messages.map((m) => ({
          leadId: lead.id,
          text: m.text,
          direction: m.dir,
          channel: m.ch,
          createdAt: new Date(m.at),
        })),
      });
    }

    leadCount++;
    console.log(`  [${leadCount}/${leadDefs.length}] ${def.name} → ${columnDefs[def.colIdx].name}`);
  }

  console.log(`\nSeed complete: ${cols.length} columns, ${leadCount} leads.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
