import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

function toNumber(v: { toString(): string } | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  return Number(typeof v === "number" ? v : v.toString());
}

// ─── Columns ─────────────────────────────────────────────────────

export type ColumnInput = { name: string; color: string };

export class LeadsCrmService {
  static async listColumns(clinicId: string) {
    return prisma.leadColumn.findMany({
      where: { clinicId },
      orderBy: { position: "asc" },
    });
  }

  static async createColumn(clinicId: string, data: ColumnInput) {
    const maxPos = await prisma.leadColumn.aggregate({
      where: { clinicId },
      _max: { position: true },
    });
    return prisma.leadColumn.create({
      data: { clinicId, name: data.name, color: data.color, position: (maxPos._max.position ?? -1) + 1 },
    });
  }

  static async updateColumn(clinicId: string, id: string, data: ColumnInput) {
    return prisma.leadColumn.update({
      where: { id, clinicId },
      data: { name: data.name, color: data.color },
    });
  }

  static async deleteColumn(clinicId: string, id: string) {
    const remaining = await prisma.leadColumn.findMany({
      where: { clinicId, id: { not: id } },
      orderBy: { position: "asc" },
    });
    if (remaining.length === 0) throw new Error("Debe haber al menos una columna.");
    const fallback = remaining[0];

    await prisma.$transaction([
      prisma.crmLead.updateMany({ where: { clinicId, columnId: id }, data: { columnId: fallback.id } }),
      prisma.leadColumn.delete({ where: { id, clinicId } }),
    ]);

    for (let i = 0; i < remaining.length; i++) {
      await prisma.leadColumn.update({ where: { id: remaining[i].id }, data: { position: i } });
    }
  }

  static async reorderColumns(clinicId: string, orderedIds: string[]) {
    await prisma.$transaction(
      orderedIds.map((id, i) => prisma.leadColumn.update({ where: { id, clinicId }, data: { position: i } })),
    );
  }

  static async ensureDefaultColumns(clinicId: string) {
    const count = await prisma.leadColumn.count({ where: { clinicId } });
    if (count > 0) return;
    const defaults = [
      { name: "Nuevo Lead", color: "#818cf8", position: 0 },
      { name: "Contactado", color: "#f59e0b", position: 1 },
      { name: "En Negociacion", color: "#3b82f6", position: 2 },
      { name: "Propuesta Enviada", color: "#8b5cf6", position: 3 },
      { name: "Ganado", color: "#10b981", position: 4 },
      { name: "Perdido", color: "#ef4444", position: 5 },
    ];
    await prisma.leadColumn.createMany({
      data: defaults.map((d) => ({ clinicId, ...d })),
    });
  }

  // ─── Lead mapping ─────────────────────────────────────────────

  private static mapLead(r: {
    id: string; name: string; company: string; channel: string; phone: string;
    email: string; sector: string; columnId: string; priority: string;
    estimatedBudget: { toString(): string } | number | null; mainNote: string;
    tags: unknown; scrapedData: unknown;
    archived: boolean; converted: boolean; convertedPatientId: string | null;
    followUpDate: Date | null; assignedDoctorId: string | null;
    createdAt: Date; updatedAt: Date;
    notes: { id: string; text: string; createdAt: Date }[];
    messages: { id: string; text: string; direction: string; channel: string; createdAt: Date; attachmentUrl: string | null; attachmentName: string | null }[];
    activities: { id: string; type: string; fromValue: string | null; toValue: string | null; userName: string | null; createdAt: Date }[];
  }) {
    return {
      id: r.id,
      name: r.name,
      company: r.company,
      channel: r.channel,
      phone: r.phone,
      email: r.email,
      sector: r.sector,
      columnId: r.columnId,
      priority: r.priority,
      estimatedBudget: toNumber(r.estimatedBudget),
      mainNote: r.mainNote,
      tags: r.tags as string[],
      scrapedData: r.scrapedData as Record<string, string>,
      archived: r.archived,
      converted: r.converted,
      convertedPatientId: r.convertedPatientId,
      followUpDate: r.followUpDate?.toISOString() ?? null,
      assignedDoctorId: r.assignedDoctorId,
      notes: r.notes.map((n) => ({ id: n.id, text: n.text, createdAt: n.createdAt.toISOString() })),
      messages: r.messages.map((m) => ({
        id: m.id, text: m.text, direction: m.direction, channel: m.channel,
        createdAt: m.createdAt.toISOString(), attachmentUrl: m.attachmentUrl, attachmentName: m.attachmentName,
      })),
      activities: r.activities.map((a) => ({
        id: a.id, type: a.type, fromValue: a.fromValue, toValue: a.toValue,
        userName: a.userName, createdAt: a.createdAt.toISOString(),
      })),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  // ─── Leads ──────────────────────────────────────────────────────

  static async listLeads(clinicId: string, includeArchived = false) {
    const rows = await prisma.crmLead.findMany({
      where: { clinicId, ...(includeArchived ? {} : { archived: false }) },
      include: {
        notes: { orderBy: { createdAt: "desc" } },
        messages: { orderBy: { createdAt: "asc" } },
        activities: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map(LeadsCrmService.mapLead);
  }

  static async createLead(clinicId: string, data: {
    name: string;
    company?: string;
    channel: string;
    phone?: string;
    email?: string;
    sector?: string;
    columnId: string;
    priority?: string;
    estimatedBudget?: number | null;
    mainNote?: string;
    tags?: string[];
    assignedDoctorId?: string | null;
    followUpDate?: string | null;
  }, userName?: string) {
    const lead = await prisma.crmLead.create({
      data: {
        clinicId,
        columnId: data.columnId,
        name: data.name,
        company: data.company ?? "",
        channel: data.channel,
        phone: data.phone ?? "",
        email: data.email ?? "",
        sector: data.sector ?? "",
        priority: data.priority ?? "medium",
        estimatedBudget: data.estimatedBudget ?? null,
        mainNote: data.mainNote ?? "",
        tags: data.tags ?? [],
        assignedDoctorId: data.assignedDoctorId ?? null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        activities: {
          create: {
            type: "created",
            toValue: "Nuevo Lead",
            userName: userName ?? null,
          },
        },
      },
      include: {
        notes: true,
        messages: true,
        activities: { orderBy: { createdAt: "desc" } },
      },
    });

    return LeadsCrmService.mapLead(lead);
  }

  static async updateLead(clinicId: string, id: string, data: {
    name?: string;
    company?: string;
    channel?: string;
    phone?: string;
    email?: string;
    sector?: string;
    columnId?: string;
    priority?: string;
    estimatedBudget?: number | null;
    mainNote?: string;
    tags?: string[];
    assignedDoctorId?: string | null;
    followUpDate?: string | null;
  }, userName?: string) {
    // If columnId changed, record activity
    if (data.columnId) {
      const current = await prisma.crmLead.findFirst({
        where: { id, clinicId },
        select: { columnId: true, column: { select: { name: true } } },
      });
      if (current && current.columnId !== data.columnId) {
        const targetCol = await prisma.leadColumn.findUnique({
          where: { id: data.columnId },
          select: { name: true },
        });
        await prisma.crmLeadActivity.create({
          data: {
            leadId: id,
            type: "moved",
            fromValue: current.column.name,
            toValue: targetCol?.name ?? data.columnId,
            userName: userName ?? null,
          },
        });
      }
    }

    const update: Prisma.CrmLeadUpdateInput = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.company !== undefined) update.company = data.company;
    if (data.channel !== undefined) update.channel = data.channel;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.email !== undefined) update.email = data.email;
    if (data.sector !== undefined) update.sector = data.sector;
    if (data.columnId !== undefined) update.column = { connect: { id: data.columnId } };
    if (data.priority !== undefined) update.priority = data.priority;
    if (data.estimatedBudget !== undefined) update.estimatedBudget = data.estimatedBudget;
    if (data.mainNote !== undefined) update.mainNote = data.mainNote;
    if (data.tags !== undefined) update.tags = data.tags;
    if (data.assignedDoctorId !== undefined) {
      update.assignedDoctor = data.assignedDoctorId
        ? { connect: { id: data.assignedDoctorId } }
        : { disconnect: true };
    }
    if (data.followUpDate !== undefined) {
      update.followUpDate = data.followUpDate ? new Date(data.followUpDate) : null;
    }

    return prisma.crmLead.update({ where: { id, clinicId }, data: update });
  }

  static async archiveLead(clinicId: string, id: string, userName?: string) {
    await prisma.crmLeadActivity.create({
      data: { leadId: id, type: "archived", userName: userName ?? null },
    });
    return prisma.crmLead.update({ where: { id, clinicId }, data: { archived: true } });
  }

  static async unarchiveLead(clinicId: string, id: string, userName?: string) {
    await prisma.crmLeadActivity.create({
      data: { leadId: id, type: "unarchived", userName: userName ?? null },
    });
    return prisma.crmLead.update({ where: { id, clinicId }, data: { archived: false } });
  }

  static async deleteLead(clinicId: string, id: string) {
    return prisma.crmLead.delete({ where: { id, clinicId } });
  }

  static async convertLead(clinicId: string, id: string, patientId: string, userName?: string) {
    // Move to last column
    const columns = await prisma.leadColumn.findMany({
      where: { clinicId },
      orderBy: { position: "desc" },
      take: 1,
      select: { id: true, name: true },
    });
    const lastCol = columns[0];

    await prisma.crmLeadActivity.create({
      data: {
        leadId: id,
        type: "converted",
        toValue: `Paciente ${patientId}`,
        userName: userName ?? null,
      },
    });

    return prisma.crmLead.update({
      where: { id, clinicId },
      data: {
        converted: true,
        convertedPatientId: patientId,
        ...(lastCol ? { columnId: lastCol.id } : {}),
      },
    });
  }

  // ─── Notes ──────────────────────────────────────────────────────

  static async addNote(clinicId: string, leadId: string, text: string) {
    const lead = await prisma.crmLead.findFirst({ where: { id: leadId, clinicId }, select: { id: true } });
    if (!lead) throw new Error("Lead no encontrado.");
    return prisma.crmLeadNote.create({ data: { leadId, text } });
  }

  // ─── Messages ───────────────────────────────────────────────────

  static async addMessage(clinicId: string, leadId: string, data: { text: string; direction: string; channel: string }) {
    const lead = await prisma.crmLead.findFirst({ where: { id: leadId, clinicId }, select: { id: true } });
    if (!lead) throw new Error("Lead no encontrado.");
    return prisma.crmLeadMessage.create({
      data: { leadId, text: data.text, direction: data.direction, channel: data.channel },
    });
  }

  // ─── Doctors for assignment ─────────────────────────────────────

  static async listDoctors(clinicId: string) {
    const memberships = await prisma.clinicMembership.findMany({
      where: { clinicId, status: "ACTIVE", user: { role: "DOCTOR", status: "ACTIVE" } },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            doctorProfile: { select: { specialty: true } },
          },
        },
      },
    });
    return memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name ?? "Doctor",
      specialty: m.user.doctorProfile?.specialty ?? null,
    }));
  }

  // ─── Follow-ups ─────────────────────────────────────────────────

  static async getFollowUpAlerts(clinicId: string) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const leads = await prisma.crmLead.findMany({
      where: {
        clinicId,
        archived: false,
        converted: false,
        followUpDate: { lte: today },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        followUpDate: true,
        columnId: true,
      },
      orderBy: { followUpDate: "asc" },
    });

    return leads.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      followUpDate: l.followUpDate!.toISOString(),
      columnId: l.columnId,
    }));
  }

  // ─── Full pipeline data ─────────────────────────────────────────

  static async getFullPipeline(clinicId: string) {
    await LeadsCrmService.ensureDefaultColumns(clinicId);
    const [columns, leads, doctors, followUps] = await Promise.all([
      LeadsCrmService.listColumns(clinicId),
      LeadsCrmService.listLeads(clinicId),
      LeadsCrmService.listDoctors(clinicId),
      LeadsCrmService.getFollowUpAlerts(clinicId),
    ]);

    const tagSet = new Set<string>();
    for (const lead of leads) {
      for (const tag of lead.tags) tagSet.add(tag);
    }

    return {
      columns: columns.map((c) => ({ id: c.id, name: c.name, color: c.color, position: c.position })),
      leads,
      tags: Array.from(tagSet).sort(),
      doctors,
      followUps,
    };
  }

  // ─── Seed ───────────────────────────────────────────────────────

  static async seed(clinicId: string, data: {
    columns: { name: string; color: string; position: number }[];
    leads: {
      name: string; company: string; channel: string; phone: string; email: string;
      sector: string; columnIndex: number; priority: string; estimatedBudget: number | null;
      mainNote: string; tags: string[];
      notes: { text: string; createdAt: string }[];
      messages: { text: string; direction: string; channel: string; createdAt: string }[];
      createdAt: string; updatedAt: string;
    }[];
  }) {
    await prisma.crmLeadActivity.deleteMany({ where: { lead: { clinicId } } });
    await prisma.crmLeadMessage.deleteMany({ where: { lead: { clinicId } } });
    await prisma.crmLeadNote.deleteMany({ where: { lead: { clinicId } } });
    await prisma.crmLead.deleteMany({ where: { clinicId } });
    await prisma.leadColumn.deleteMany({ where: { clinicId } });

    const createdColumns = [];
    for (const col of data.columns) {
      const c = await prisma.leadColumn.create({
        data: { clinicId, name: col.name, color: col.color, position: col.position },
      });
      createdColumns.push(c);
    }

    for (const lead of data.leads) {
      const column = createdColumns[lead.columnIndex];
      if (!column) continue;

      const createdLead = await prisma.crmLead.create({
        data: {
          clinicId,
          columnId: column.id,
          name: lead.name,
          company: lead.company,
          channel: lead.channel,
          phone: lead.phone,
          email: lead.email,
          sector: lead.sector,
          priority: lead.priority,
          estimatedBudget: lead.estimatedBudget,
          mainNote: lead.mainNote,
          tags: lead.tags,
          createdAt: new Date(lead.createdAt),
          updatedAt: new Date(lead.updatedAt),
        },
      });

      if (lead.notes.length > 0) {
        await prisma.crmLeadNote.createMany({
          data: lead.notes.map((n) => ({
            leadId: createdLead.id, text: n.text, createdAt: new Date(n.createdAt),
          })),
        });
      }

      if (lead.messages.length > 0) {
        await prisma.crmLeadMessage.createMany({
          data: lead.messages.map((m) => ({
            leadId: createdLead.id, text: m.text, direction: m.direction, channel: m.channel, createdAt: new Date(m.createdAt),
          })),
        });
      }
    }

    return { columnsCreated: createdColumns.length, leadsCreated: data.leads.length };
  }
}
