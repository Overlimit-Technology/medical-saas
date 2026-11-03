import { ChartArea, ChartBar, ChartColumn, ChartLine, ChartPie, FolderUp, Gauge, Hash, List, MousePointerClick, Table2, TrendingUp, type LucideIcon } from "lucide-react";
import type { ChartType } from "@/lib/dashboard/catalog";

export const CHART_ICON: Record<ChartType, LucideIcon> = {
  kpi: Hash,
  spark: TrendingUp,
  ring: Gauge,
  line: ChartLine,
  area: ChartArea,
  bar: ChartColumn,
  hbar: ChartBar,
  donut: ChartPie,
  table: Table2,
  list: List,
  files: FolderUp,
  shortcut: MousePointerClick,
};
