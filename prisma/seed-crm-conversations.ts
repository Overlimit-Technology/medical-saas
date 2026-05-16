import "dotenv/config";
import { prisma } from "../src/lib/prisma";

/**
 * Seed: Genera conversaciones de prueba para el CRM
 *
 * Crear leads con mensajes simulados para probar el flujo de CRM
 *
 * Ejecutar: npx tsx prisma/seed-crm-conversations.ts
 */

interface MockConversation {
  name: string;
  phone: string;
  email: string;
  company: string;
  sector: string;
  channel: "whatsapp" | "telegram" | "instagram" | "email";
  priority: "low" | "medium" | "high";
  messages: {
    direction: "inbound" | "outbound";
    text: string;
    minutesAgo: number;
  }[];
}

const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    name: "María González",
    phone: "+56912345678",
    email: "maria.gonzalez@email.com",
    company: "Tech Solutions",
    sector: "Tecnología",
    channel: "whatsapp",
    priority: "high",
    messages: [
      {
        direction: "inbound",
        text: "Hola, necesito agendar una consulta odontológica urgente. Tengo un dolor molar.",
        minutesAgo: 45,
      },
      {
        direction: "outbound",
        text: "Hola María, entiendo tu urgencia. Tenemos disponibilidad hoy a las 15:00 y mañana a las 10:00. ¿Cuál te conviene?",
        minutesAgo: 40,
      },
      {
        direction: "inbound",
        text: "Perfecto, hoy a las 15:00 está bien. ¿Dónde quedan ustedes?",
        minutesAgo: 35,
      },
      {
        direction: "outbound",
        text: "Excelente, te confirmamos para hoy 15:00. Estamos en Providencia, av. Providencia 1234. ¿Necesitas algo más?",
        minutesAgo: 30,
      },
      {
        direction: "inbound",
        text: "No, está todo claro. Nos vemos hoy! 😊",
        minutesAgo: 25,
      },
    ],
  },
  {
    name: "Carlos Rodríguez",
    phone: "+56998765432",
    email: "carlos.rodriguez@empresa.com",
    company: "Constructora Andina",
    sector: "Construcción",
    channel: "whatsapp",
    priority: "medium",
    messages: [
      {
        direction: "inbound",
        text: "Hola, quiero consultar por un tratamiento de blanqueamiento dental",
        minutesAgo: 120,
      },
      {
        direction: "outbound",
        text: "Hola Carlos! Contamos con el mejor tratamiento de blanqueamiento. ¿Te gustaría agendar una consulta sin costo?",
        minutesAgo: 115,
      },
      {
        direction: "inbound",
        text: "Si, claro. ¿Cuánto cuesta el tratamiento?",
        minutesAgo: 90,
      },
      {
        direction: "outbound",
        text: "El blanqueamiento cuesta $350.000 incluye 2 sesiones. Con consulta previa es $450.000. ¿Te interesa?",
        minutesAgo: 85,
      },
    ],
  },
  {
    name: "Patricia Morales",
    phone: "+56911223344",
    email: "patricia.m@hotmail.com",
    company: "Inmobiliaria Premier",
    sector: "Inmobiliaria",
    channel: "instagram",
    priority: "medium",
    messages: [
      {
        direction: "inbound",
        text: "Vi su trabajo en Instagram y me encantó! Quiero hacer una limpieza dental",
        minutesAgo: 180,
      },
      {
        direction: "outbound",
        text: "¡Hola Patricia! Gracias por escribirnos. Nuestra limpieza dental es completa y deja tus dientes brillantes 😁. ¿Disponible esta semana?",
        minutesAgo: 175,
      },
      {
        direction: "inbound",
        text: "Sí! ¿Tienen disponibilidad el jueves o viernes?",
        minutesAgo: 150,
      },
      {
        direction: "outbound",
        text: "Tenemos jueves 14:00 y viernes 11:00. ¿Cuál prefieres?",
        minutesAgo: 140,
      },
      {
        direction: "inbound",
        text: "El viernes a las 11 está perfecto",
        minutesAgo: 130,
      },
    ],
  },
  {
    name: "Diego Fernández",
    phone: "+56944556677",
    email: "diego.fernandez@hotmail.com",
    company: "",
    sector: "Independiente",
    channel: "whatsapp",
    priority: "low",
    messages: [
      {
        direction: "inbound",
        text: "Hola, tengo una caries y necesito empastar",
        minutesAgo: 240,
      },
      {
        direction: "outbound",
        text: "Hola Diego! Sí, podemos ayudarte. El empaste cuesta $120.000. ¿Prefieres agendar?",
        minutesAgo: 235,
      },
    ],
  },
  {
    name: "Alejandra López",
    phone: "+56987654321",
    email: "alejandra.lopez@empresa.com",
    company: "Marketing Digital Plus",
    sector: "Marketing",
    channel: "telegram",
    priority: "high",
    messages: [
      {
        direction: "inbound",
        text: "Me duele una muela hace 3 días. Necesito algo urgente.",
        minutesAgo: 60,
      },
      {
        direction: "outbound",
        text: "Entendemos tu dolor. Tenemos hoy 16:30 disponible con nuestro especialista. ¿Te sirve?",
        minutesAgo: 55,
      },
      {
        direction: "inbound",
        text: "Sí, perfecto. ¿Necesito algo especial?",
        minutesAgo: 50,
      },
      {
        direction: "outbound",
        text: "No, solo trae tu cédula. Te atenderemos rápido. ¡Nos vemos!",
        minutesAgo: 45,
      },
    ],
  },
  {
    name: "Roberto Sánchez",
    phone: "+56976543210",
    email: "rsanchez@empresa.com",
    company: "Retail Solutions",
    sector: "Retail",
    channel: "whatsapp",
    priority: "medium",
    messages: [
      {
        direction: "inbound",
        text: "Necesito ortodoncia para mis dos hijos. ¿Tienen planes?",
        minutesAgo: 300,
      },
      {
        direction: "outbound",
        text: "¡Hola Roberto! Sí, contamos con planes especiales para ortodoncia. Te invitamos a una consulta gratuita para evaluar. ¿Cuándo disponible?",
        minutesAgo: 295,
      },
    ],
  },
  {
    name: "Sofía Núñez",
    phone: "+56933445566",
    email: "sofia.nunez@hotmail.com",
    company: "",
    sector: "Estudiante",
    channel: "instagram",
    priority: "low",
    messages: [
      {
        direction: "inbound",
        text: "¿Hacen limpieza dental a estudiantes? ¿Hay descuento?",
        minutesAgo: 420,
      },
      {
        direction: "outbound",
        text: "¡Hola Sofía! Sí hacemos limpieza. Estudiantes con credencial tienen 15% descuento. Son $100.000 normales, $85.000 con descuento.",
        minutesAgo: 415,
      },
    ],
  },
  {
    name: "Juan Pablo Escobar",
    phone: "+56912223344",
    email: "jp.escobar@empresa.com",
    company: "Abogados Escobar & Asociados",
    sector: "Legal",
    channel: "whatsapp",
    priority: "high",
    messages: [
      {
        direction: "inbound",
        text: "Se me rompió una muela masticando. Urgencia.",
        minutesAgo: 15,
      },
      {
        direction: "outbound",
        text: "Juan Pablo, lamentamos mucho. Tenemos disponibilidad AHORA a las 17:00 con nuestro mejor especialista. ¿Vales?",
        minutesAgo: 10,
      },
      {
        direction: "inbound",
        text: "Sí! Voy en 10 minutos",
        minutesAgo: 5,
      },
    ],
  },
];

async function main() {
  console.log("▶ Seed: Generating CRM conversations...\n");

  try {
    // 1. Obtener la clínica de prueba
    let clinic = await prisma.clinic.findFirst({
      select: { id: true, name: true },
    });

    if (!clinic) {
      console.error("❌ No clinic found. Run seed.ts first.");
      return;
    }

    console.log(`✓ Using clinic: ${clinic.name} (${clinic.id})\n`);

    // 2. Obtener o crear columnas CRM
    const columns = await prisma.leadColumn.findMany({
      where: { clinicId: clinic.id },
      select: { id: true, name: true },
    });

    if (columns.length === 0) {
      console.warn("⚠ No CRM columns found. Creating default ones...");

      const defaultColumns = [
        "Nuevo Lead",
        "Contactado",
        "En Negociación",
        "Propuesta Enviada",
        "Convertido",
      ];

      for (const name of defaultColumns) {
        await prisma.leadColumn.create({
          data: { clinicId: clinic.id, name, position: defaultColumns.indexOf(name) },
        });
      }

      const updatedColumns = await prisma.leadColumn.findMany({
        where: { clinicId: clinic.id },
        select: { id: true, name: true },
      });

      console.log(
        `✓ Created ${updatedColumns.length} columns\n`,
      );
    }

    const crmColumns = await prisma.leadColumn.findMany({
      where: { clinicId: clinic.id },
      select: { id: true, name: true },
      orderBy: { position: "asc" },
    });

    // 3. Crear leads con mensajes
    let leadsCreated = 0;
    let messagesCreated = 0;

    for (const conv of MOCK_CONVERSATIONS) {
      // Asignar a columna según prioridad
      const columnIndex = conv.priority === "high" ? 1 : conv.priority === "medium" ? 2 : 0;
      const columnId = crmColumns[Math.min(columnIndex, crmColumns.length - 1)]?.id;

      if (!columnId) {
        console.warn(`⚠ No column found for lead ${conv.name}`);
        continue;
      }

      // Crear lead
      const lead = await prisma.crmLead.create({
        data: {
          clinicId: clinic.id,
          columnId,
          name: conv.name,
          phone: conv.phone,
          email: conv.email,
          company: conv.company,
          sector: conv.sector,
          channel: conv.channel,
          priority: conv.priority,
          mainNote: `Lead de ${conv.channel} - ${conv.sector}`,
        },
        select: { id: true, name: true },
      });

      leadsCreated++;
      console.log(`✓ Created lead: ${lead.name}`);

      // Crear mensajes
      for (const msg of conv.messages) {
        const createdAt = new Date(Date.now() - msg.minutesAgo * 60 * 1000);

        await prisma.crmLeadMessage.create({
          data: {
            leadId: lead.id,
            text: msg.text,
            direction: msg.direction,
            channel: conv.channel,
            createdAt,
          },
        });

        messagesCreated++;
      }

      console.log(`  └─ ${conv.messages.length} messages added\n`);
    }

    console.log("\n✅ Seed complete!");
    console.log(`   • Leads created: ${leadsCreated}`);
    console.log(`   • Messages created: ${messagesCreated}`);
    console.log(`   • Total conversations: ${leadsCreated}`);
    console.log("\n📍 Next steps:");
    console.log("   1. Go to /leads");
    console.log("   2. Click on any lead to see conversations");
    console.log("   3. Test drag-and-drop between columns\n");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

main();
