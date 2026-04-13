import type { Lead } from "./Lead";

export type PipelineColumn = {
  id: string;
  name: string;
  color: string;
  position: number;
};

export type PipelineConfig = {
  columns: PipelineColumn[];
};

export type LeadsCrmData = {
  version: number;
  pipeline: PipelineConfig;
  leads: Lead[];
  tags: string[];
};

export const DEFAULT_COLUMNS: PipelineColumn[] = [
  { id: "col_nuevo", name: "Nuevo Lead", color: "#818cf8", position: 0 },
  { id: "col_contactado", name: "Contactado", color: "#f59e0b", position: 1 },
  { id: "col_negociacion", name: "En Negociacion", color: "#3b82f6", position: 2 },
  { id: "col_propuesta", name: "Propuesta Enviada", color: "#8b5cf6", position: 3 },
  { id: "col_ganado", name: "Ganado", color: "#10b981", position: 4 },
  { id: "col_perdido", name: "Perdido", color: "#ef4444", position: 5 },
];

export const STORAGE_KEY = "zensya_crm_leads_v1";

export function createDefaultCrmData(): LeadsCrmData {
  return {
    version: 1,
    pipeline: { columns: [...DEFAULT_COLUMNS] },
    leads: [],
    tags: [],
  };
}
