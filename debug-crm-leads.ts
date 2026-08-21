import { prisma } from "./src/lib/prisma";

async function debug() {
  console.log("🔍 Debugging CRM Leads...\n");

  // 1. Check clinics
  const clinics = await prisma.clinic.findMany({
    select: { id: true, name: true }
  });
  console.log("📍 Clinics:");
  clinics.forEach(c => console.log(`  - ${c.name} (${c.id})`));

  if (clinics.length === 0) {
    console.log("❌ No clinics found!");
    return;
  }

  const clinicId = clinics[0].id;
  console.log(`\nUsing clinic: ${clinicId}\n`);

  // 2. Check columns
  const columns = await prisma.leadColumn.findMany({
    where: { clinicId },
    select: { id: true, name: true, position: true }
  });
  console.log("📊 CRM Columns:");
  if (columns.length === 0) {
    console.log("  ❌ No columns found!");
  } else {
    columns.forEach(c => console.log(`  - ${c.name} (${c.id}) pos:${c.position}`));
  }

  // 3. Check leads
  console.log(`\n💬 CRM Leads (archived=false):`);
  const leads = await prisma.crmLead.findMany({
    where: { clinicId, archived: false },
    include: {
      messages: { select: { id: true, text: true, direction: true, createdAt: true } },
      notes: { select: { id: true, text: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  if (leads.length === 0) {
    console.log("  ❌ No leads found!");

    // Check if any leads exist at all (even archived)
    const allLeads = await prisma.crmLead.findMany({
      where: { clinicId },
      select: { id: true, name: true, archived: true, columnId: true }
    });

    if (allLeads.length > 0) {
      console.log(`\n⚠️  Found ${allLeads.length} leads but they are archived or filtered`);
      allLeads.forEach(l => console.log(`  - ${l.name} (archived: ${l.archived}) columnId: ${l.columnId}`));
    } else {
      console.log("  ❌ No leads at all for this clinic!");
    }
  } else {
    console.log(`  ✅ Found ${leads.length} leads\n`);
    leads.forEach(lead => {
      console.log(`  📌 ${lead.name}`);
      console.log(`     Channel: ${lead.channel}, Priority: ${lead.priority}`);
      console.log(`     Messages: ${lead.messages.length}, Notes: ${lead.notes.length}`);
      if (lead.messages.length > 0) {
        lead.messages.slice(0, 2).forEach(msg => {
          console.log(`       → [${msg.direction}] ${msg.text.substring(0, 50)}...`);
        });
      }
      console.log();
    });
  }

  // 4. Check total counts
  const totalLeads = await prisma.crmLead.count({ where: { clinicId } });
  const totalMessages = await prisma.crmLeadMessage.count({
    where: { lead: { clinicId } }
  });
  const totalNotes = await prisma.crmLeadNote.count({
    where: { lead: { clinicId } }
  });

  console.log("📊 Totals:");
  console.log(`  - Leads: ${totalLeads} (active: ${leads.length})`);
  console.log(`  - Messages: ${totalMessages}`);
  console.log(`  - Notes: ${totalNotes}\n`);
}

debug().catch(console.error).finally(() => process.exit(0));
