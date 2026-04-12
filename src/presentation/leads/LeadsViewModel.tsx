"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lead, LeadChannel, LeadPriority, LeadNote, LeadMessage, LeadActivity, DoctorOption } from "@/domain/leads/entities/Lead";
import type { PipelineColumn } from "@/domain/leads/entities/Pipeline";

export type ViewMode = "kanban" | "table";

export type LeadFilters = {
  search: string;
  channel: LeadChannel | "";
  sector: string;
  columnId: string;
  priority: LeadPriority | "";
  tag: string;
  doctorId: string;
};

export type LeadFormData = {
  name: string;
  company: string;
  channel: LeadChannel;
  phone: string;
  email: string;
  sector: string;
  columnId: string;
  priority: LeadPriority;
  estimatedBudget: string;
  mainNote: string;
  tags: string[];
  assignedDoctorId: string;
  followUpDate: string;
};

export type FollowUpAlert = {
  id: string;
  name: string;
  phone: string;
  followUpDate: string;
  columnId: string;
};

export type SortConfig = {
  key: string;
  dir: "asc" | "desc";
};

async function api<T = unknown>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", cache: "no-store", ...opts });
  return res.json() as Promise<T>;
}

export function useLeadsViewModel() {
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpAlert[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [showColumnEditor, setShowColumnEditor] = useState(false);
  const [filters, setFilters] = useState<LeadFilters>({
    search: "", channel: "", sector: "", columnId: "", priority: "", tag: "", doctorId: "",
  });
  const [dragState, setDragState] = useState<{ leadId: string; fromColumnId: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sort, setSort] = useState<SortConfig>({ key: "createdAt", dir: "desc" });

  // --- Load from API ---
  const loadPipeline = useCallback(async () => {
    try {
      const data = await api<{
        ok: boolean;
        columns: PipelineColumn[];
        leads: Lead[];
        tags: string[];
        doctors: DoctorOption[];
        followUps: FollowUpAlert[];
      }>("/api/leads/pipeline");
      if (data.ok) {
        setColumns(data.columns);
        setLeads(data.leads);
        setTags(data.tags);
        setDoctors(data.doctors ?? []);
        setFollowUps(data.followUps ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { loadPipeline(); }, [loadPipeline]);

  // --- Derived ---
  const selectedLead = useMemo(() => leads.find((l) => l.id === selectedLeadId) ?? null, [leads, selectedLeadId]);
  const editingLead = useMemo(() => leads.find((l) => l.id === editingLeadId) ?? null, [leads, editingLeadId]);
  const sectors = useMemo(() => Array.from(new Set(leads.map((l) => l.sector).filter(Boolean))).sort(), [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (lead.archived) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match = lead.name.toLowerCase().includes(q) || lead.phone.includes(q) || lead.email.toLowerCase().includes(q) || lead.company.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filters.channel && lead.channel !== filters.channel) return false;
      if (filters.sector && lead.sector !== filters.sector) return false;
      if (filters.columnId && lead.columnId !== filters.columnId) return false;
      if (filters.priority && lead.priority !== filters.priority) return false;
      if (filters.tag && !lead.tags.includes(filters.tag)) return false;
      if (filters.doctorId && lead.assignedDoctorId !== filters.doctorId) return false;
      return true;
    });
  }, [leads, filters]);

  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.position - b.position), [columns]);

  const sortedLeads = useMemo(() => {
    const sorted = [...filteredLeads];
    sorted.sort((a, b) => {
      let av: string | number | null = null;
      let bv: string | number | null = null;
      switch (sort.key) {
        case "name": av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
        case "phone": av = a.phone; bv = b.phone; break;
        case "channel": av = a.channel; bv = b.channel; break;
        case "priority": { const o = { urgent: 0, high: 1, medium: 2, low: 3 }; av = o[a.priority]; bv = o[b.priority]; break; }
        case "createdAt": av = a.createdAt; bv = b.createdAt; break;
        case "sector": av = a.sector; bv = b.sector; break;
        default: av = a.createdAt; bv = b.createdAt;
      }
      if (av === null || bv === null) return 0;
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredLeads, sort]);

  // --- Stats ---
  const stats = useMemo(() => {
    const activeLeads = leads.filter((l) => !l.archived);
    const total = activeLeads.length;
    const ganadoCol = columns.find((c) => c.name.toLowerCase().includes("ganado"));
    const perdidoCol = columns.find((c) => c.name.toLowerCase().includes("perdido"));
    const wonCount = ganadoCol ? activeLeads.filter((l) => l.columnId === ganadoCol.id).length : 0;
    const lostCount = perdidoCol ? activeLeads.filter((l) => l.columnId === perdidoCol.id).length : 0;
    const closedCount = wonCount + lostCount;
    const inProcess = total - closedCount;
    const conversionRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;
    const totalBudget = activeLeads.reduce((sum, l) => sum + (l.estimatedBudget ?? 0), 0);
    const wonBudget = ganadoCol ? activeLeads.filter((l) => l.columnId === ganadoCol.id).reduce((sum, l) => sum + (l.estimatedBudget ?? 0), 0) : 0;
    const byChannel: Record<string, number> = {};
    for (const lead of activeLeads) byChannel[lead.channel] = (byChannel[lead.channel] ?? 0) + 1;
    return { total, inProcess, wonCount, lostCount, conversionRate, totalBudget, wonBudget, byChannel };
  }, [leads, columns]);

  // --- Lead CRUD ---
  const createLead = useCallback(async (data: LeadFormData) => {
    const body = {
      name: data.name, company: data.company, channel: data.channel,
      phone: data.phone, email: data.email, sector: data.sector,
      columnId: data.columnId || columns[0]?.id || "",
      priority: data.priority,
      estimatedBudget: data.estimatedBudget ? Number(data.estimatedBudget) : null,
      mainNote: data.mainNote, tags: data.tags,
      assignedDoctorId: data.assignedDoctorId || null,
      followUpDate: data.followUpDate || null,
    };
    const res = await api<{ ok: boolean; item: Lead }>("/api/leads", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok && res.item) {
      setLeads((prev) => [res.item, ...prev]);
      const newTags = data.tags.filter((t) => !tags.includes(t));
      if (newTags.length > 0) setTags((prev) => [...prev, ...newTags]);
    }
    setShowLeadForm(false);
  }, [columns, tags]);

  const updateLead = useCallback(async (leadId: string, data: LeadFormData) => {
    const body = {
      name: data.name, company: data.company, channel: data.channel,
      phone: data.phone, email: data.email, sector: data.sector,
      columnId: data.columnId, priority: data.priority,
      estimatedBudget: data.estimatedBudget ? Number(data.estimatedBudget) : null,
      mainNote: data.mainNote, tags: data.tags,
      assignedDoctorId: data.assignedDoctorId || null,
      followUpDate: data.followUpDate || null,
    };
    const res = await api<{ ok: boolean }>(`/api/leads/${leadId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) {
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, ...body, estimatedBudget: body.estimatedBudget, updatedAt: new Date().toISOString() } : l));
      const newTags = data.tags.filter((t) => !tags.includes(t));
      if (newTags.length > 0) setTags((prev) => [...prev, ...newTags]);
    }
    setEditingLeadId(null);
    setShowLeadForm(false);
  }, [tags]);

  const deleteLead = useCallback(async (leadId: string) => {
    const res = await api<{ ok: boolean }>(`/api/leads/${leadId}`, { method: "DELETE" });
    if (res.ok) {
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      setSelectedLeadId((prev) => (prev === leadId ? null : prev));
    }
  }, []);

  const archiveLead = useCallback(async (leadId: string) => {
    const res = await api<{ ok: boolean }>(`/api/leads/${leadId}/archive`, { method: "POST" });
    if (res.ok) {
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, archived: true } : l));
      setSelectedLeadId((prev) => (prev === leadId ? null : prev));
    }
  }, []);

  const moveLead = useCallback(async (leadId: string, toColumnId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.columnId === toColumnId) return;

    const fromCol = columns.find((c) => c.id === lead.columnId);
    const toCol = columns.find((c) => c.id === toColumnId);

    // Optimistic update with activity
    const newActivity: LeadActivity = {
      id: `temp_${Date.now()}`,
      type: "moved",
      fromValue: fromCol?.name ?? lead.columnId,
      toValue: toCol?.name ?? toColumnId,
      userName: null,
      createdAt: new Date().toISOString(),
    };

    setLeads((prev) => prev.map((l) =>
      l.id === leadId ? { ...l, columnId: toColumnId, updatedAt: new Date().toISOString(), activities: [newActivity, ...l.activities] } : l,
    ));
    await api(`/api/leads/${leadId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ columnId: toColumnId }),
    });
  }, [leads, columns]);

  const convertLead = useCallback(async (leadId: string) => {
    const res = await api<{ ok: boolean; patientId?: string }>(`/api/leads/${leadId}/convert`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
    });
    if (res.ok) {
      const lastCol = columns[columns.length - 1];
      setLeads((prev) => prev.map((l) =>
        l.id === leadId ? { ...l, converted: true, convertedPatientId: res.patientId ?? null, columnId: lastCol?.id ?? l.columnId } : l,
      ));
    }
    return res;
  }, [columns]);

  // --- Notes ---
  const addNote = useCallback(async (leadId: string, text: string) => {
    const res = await api<{ ok: boolean; item: LeadNote }>(`/api/leads/${leadId}/notes`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
    });
    if (res.ok && res.item) {
      setLeads((prev) => prev.map((l) =>
        l.id === leadId ? { ...l, notes: [res.item, ...l.notes], updatedAt: new Date().toISOString() } : l,
      ));
    }
  }, []);

  // --- Messages ---
  const addMessage = useCallback(async (leadId: string, text: string, direction: "inbound" | "outbound") => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const res = await api<{ ok: boolean; item: LeadMessage }>(`/api/leads/${leadId}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, direction, channel: lead.channel }),
    });
    if (res.ok && res.item) {
      setLeads((prev) => prev.map((l) =>
        l.id === leadId ? { ...l, messages: [...l.messages, res.item], updatedAt: new Date().toISOString() } : l,
      ));
    }
  }, [leads]);

  // --- Column CRUD ---
  const addColumn = useCallback(async (name: string, color: string) => {
    const res = await api<{ ok: boolean; item: PipelineColumn }>("/api/leads/columns", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, color }),
    });
    if (res.ok && res.item) setColumns((prev) => [...prev, res.item]);
  }, []);

  const updateColumn = useCallback(async (columnId: string, name: string, color: string) => {
    const res = await api<{ ok: boolean }>("/api/leads/columns", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: columnId, name, color }),
    });
    if (res.ok) setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, name, color } : c)));
  }, []);

  const deleteColumn = useCallback(async (columnId: string) => {
    const res = await api<{ ok: boolean }>(`/api/leads/columns?id=${columnId}`, { method: "DELETE" });
    if (res.ok) {
      const remaining = columns.filter((c) => c.id !== columnId);
      const fallbackId = remaining[0]?.id || "";
      setColumns(remaining.map((c, i) => ({ ...c, position: i })));
      if (fallbackId) setLeads((prev) => prev.map((l) => (l.columnId === columnId ? { ...l, columnId: fallbackId } : l)));
    }
  }, [columns]);

  const reorderColumns = useCallback(async (reordered: PipelineColumn[]) => {
    const updated = reordered.map((c, i) => ({ ...c, position: i }));
    setColumns(updated);
    await api("/api/leads/columns/reorder", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderedIds: updated.map((c) => c.id) }),
    });
  }, []);

  // --- DnD ---
  const startDrag = useCallback((leadId: string, fromColumnId: string) => setDragState({ leadId, fromColumnId }), []);
  const endDrag = useCallback(() => setDragState(null), []);
  const dropOnColumn = useCallback((toColumnId: string) => {
    if (dragState && dragState.fromColumnId !== toColumnId) moveLead(dragState.leadId, toColumnId);
    setDragState(null);
  }, [dragState, moveLead]);

  // --- Export/Import ---
  const exportData = useCallback((): string => {
    return JSON.stringify({ version: 1, pipeline: { columns }, leads, tags }, null, 2);
  }, [columns, leads, tags]);

  const importData = useCallback(async (json: string) => {
    try {
      const data = JSON.parse(json);
      if (!data.version || !data.pipeline || !Array.isArray(data.leads)) throw new Error("Formato invalido");
      const columnNames = (data.pipeline.columns as { name: string; color: string; position: number }[]).sort((a: { position: number }, b: { position: number }) => a.position - b.position);
      const colIdToIndex: Record<string, number> = {};
      for (const lead of data.leads as { columnId: string }[]) {
        const colIdx = columnNames.findIndex((c: { name: string }, i: number) => {
          const origCols = data.pipeline.columns as { id: string; position: number }[];
          const origCol = origCols.find((oc: { id: string }) => oc.id === lead.columnId);
          return origCol ? origCol.position === i : false;
        });
        colIdToIndex[lead.columnId] = colIdx >= 0 ? colIdx : 0;
      }
      const seedData = {
        columns: columnNames.map((c: { name: string; color: string }, i: number) => ({ name: c.name, color: c.color, position: i })),
        leads: (data.leads as Lead[]).map((l) => ({
          name: l.name, company: l.company, channel: l.channel, phone: l.phone, email: l.email,
          sector: l.sector, columnIndex: colIdToIndex[l.columnId] ?? 0, priority: l.priority,
          estimatedBudget: l.estimatedBudget, mainNote: l.mainNote, tags: l.tags,
          notes: l.notes.map((n) => ({ text: n.text, createdAt: n.createdAt })),
          messages: l.messages.map((m) => ({ text: m.text, direction: m.direction, channel: m.channel, createdAt: m.createdAt })),
          createdAt: l.createdAt, updatedAt: l.updatedAt,
        })),
      };
      const res = await api<{ ok: boolean }>("/api/leads/seed", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(seedData),
      });
      if (res.ok) await loadPipeline();
      else alert("Error al importar datos.");
    } catch { alert("Error al importar: formato de archivo invalido."); }
  }, [loadPipeline]);

  // --- Open forms ---
  const openEditForm = useCallback((leadId: string) => { setEditingLeadId(leadId); setShowLeadForm(true); }, []);
  const openCreateForm = useCallback(() => { setEditingLeadId(null); setShowLeadForm(true); }, []);

  // --- Sort ---
  const toggleSort = useCallback((key: string) => {
    setSort((prev) => prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  }, []);

  return {
    state: {
      columns: sortedColumns,
      leads: viewMode === "table" ? sortedLeads : filteredLeads,
      allLeads: leads,
      tags, doctors, followUps,
      viewMode, selectedLead, selectedLeadId, editingLead, editingLeadId,
      showLeadForm, showColumnEditor, filters, dragState, loaded, stats, sectors, sort,
    },
    actions: {
      setViewMode, setSelectedLeadId, setShowLeadForm, setShowColumnEditor, setFilters,
      createLead, updateLead, deleteLead, archiveLead, moveLead, convertLead,
      addNote, addMessage, addColumn, updateColumn, deleteColumn, reorderColumns,
      startDrag, endDrag, dropOnColumn, exportData, importData,
      openEditForm, openCreateForm, toggleSort, loadPipeline,
    },
  };
}
