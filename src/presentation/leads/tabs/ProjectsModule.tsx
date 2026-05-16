"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Filter,
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Timer,
} from "lucide-react";
import type { Lead } from "@/domain/leads/entities/Lead";
import type { PipelineColumn } from "@/domain/leads/entities/Pipeline";

type PipelineData = {
  columns: PipelineColumn[];
  leads: Lead[];
};

type ProjectView = "list" | "board" | "timeline";
type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
type TaskPriority = "low" | "medium" | "high";
type TaskGroup = "design" | "development" | "testing" | "marketing" | "management";

type ProjectTask = {
  id: string;
  code: string;
  projectId: string;
  projectName: string;
  taskName: string;
  estimateHours: number;
  spentHours: number;
  assignee: string;
  status: TaskStatus;
  priority: TaskPriority;
  group: TaskGroup;
  timelineStartDay: number;
  timelineDuration: number;
};

type Project = {
  id: string;
  code: string;
  name: string;
  tasks: ProjectTask[];
};

type FiltersState = {
  period: string;
  groups: TaskGroup[];
  priorities: TaskPriority[];
  assigneeQuery: string;
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  in_review: "bg-fuchsia-100 text-fuchsia-700",
  done: "bg-emerald-100 text-emerald-700",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  low: "text-emerald-600",
  medium: "text-amber-600",
  high: "text-rose-600",
};

const GROUP_LABEL: Record<TaskGroup, string> = {
  design: "Design",
  development: "Development",
  testing: "Testing",
  marketing: "Marketing",
  management: "Project Management",
};

const DEFAULT_FILTERS: FiltersState = {
  period: "first_month",
  groups: [],
  priorities: [],
  assigneeQuery: "",
};

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase())
    .join("");
}

function toStatus(position: number, total: number): TaskStatus {
  if (position === total - 1) return "done";
  if (position >= Math.floor(total * 0.66)) return "in_review";
  if (position >= Math.floor(total * 0.33)) return "in_progress";
  return "todo";
}

function toPriority(index: number): TaskPriority {
  if (index % 4 === 0) return "high";
  if (index % 3 === 0) return "low";
  return "medium";
}

function toGroup(index: number): TaskGroup {
  const values: TaskGroup[] = ["design", "development", "testing", "marketing", "management"];
  return values[index % values.length];
}

function estimateFromBudget(value: Lead["estimatedBudget"], fallback: number) {
  const budget = Number(value ?? 0);
  if (!Number.isFinite(budget) || budget <= 0) return fallback;
  const hours = Math.max(4, Math.min(72, Math.round(budget / 15000)));
  return hours;
}

function buildProjects(data: PipelineData | null): Project[] {
  if (!data) return [];

  const byColumn = new Map<string, Lead[]>();
  data.columns.forEach((column) => byColumn.set(column.id, []));
  data.leads
    .filter((lead) => !lead.archived)
    .forEach((lead) => {
      const current = byColumn.get(lead.columnId);
      if (current) current.push(lead);
    });

  const sortedColumns = [...data.columns].sort((a, b) => a.position - b.position);

  return sortedColumns.map((column, columnIndex) => {
    const leads = byColumn.get(column.id) ?? [];
    const tasks = leads.slice(0, 10).map((lead, leadIndex) => {
      const estimateHours = estimateFromBudget(lead.estimatedBudget, 8 + leadIndex * 2);
      const spentHours = Math.max(1, Math.round(estimateHours * (leadIndex % 2 === 0 ? 0.6 : 0.4)));
      const status = toStatus(column.position, sortedColumns.length);
      return {
        id: lead.id,
        code: `TS${String(leadIndex + 1245).padStart(7, "0")}`,
        projectId: column.id,
        projectName: column.name,
        taskName: lead.name || "Task",
        estimateHours,
        spentHours,
        assignee: lead.assignedDoctorId ? `Dr ${lead.assignedDoctorId.slice(0, 4)}` : "Team",
        status: lead.converted ? "done" : status,
        priority: toPriority(leadIndex + columnIndex),
        group: toGroup(leadIndex + columnIndex),
        timelineStartDay: 2 + ((leadIndex * 3 + columnIndex * 2) % 16),
        timelineDuration: 1 + ((leadIndex + columnIndex) % 4),
      } satisfies ProjectTask;
    });

    return {
      id: column.id,
      code: `PN${String(column.position + 1245).padStart(7, "0")}`,
      name: column.name,
      tasks,
    };
  });
}

export default function ProjectsModule() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ProjectView>("list");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);

  useEffect(() => {
    fetch("/api/leads/pipeline", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setData({ columns: d.columns, leads: d.leads });
      })
      .finally(() => setLoading(false));
  }, []);

  const projects = useMemo(() => buildProjects(data), [data]);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null,
    [projects, selectedProjectId]
  );

  const allTasks = selectedProject?.tasks ?? [];

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const q = search.trim().toLowerCase();
      if (q && !`${task.taskName} ${task.code}`.toLowerCase().includes(q)) return false;
      if (filters.groups.length > 0 && !filters.groups.includes(task.group)) return false;
      if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false;
      if (filters.assigneeQuery.trim()) {
        const assigneeQ = filters.assigneeQuery.trim().toLowerCase();
        if (!task.assignee.toLowerCase().includes(assigneeQ)) return false;
      }
      return true;
    });
  }, [allTasks, search, filters]);

  const activeTasks = filteredTasks.filter((task) => task.status !== "todo");
  const backlogTasks = filteredTasks.filter((task) => task.status === "todo");
  const tasksByStatus = {
    todo: filteredTasks.filter((task) => task.status === "todo"),
    in_progress: filteredTasks.filter((task) => task.status === "in_progress"),
    in_review: filteredTasks.filter((task) => task.status === "in_review"),
    done: filteredTasks.filter((task) => task.status === "done"),
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-400">Cargando modulo de proyectos...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-100/60">
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-300"
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" />
            Add Project
          </button>
        </div>

        <h2 className="mb-4 text-3xl font-semibold text-slate-900">Projects</h2>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-700">Current Projects</p>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
            <div className="max-h-[650px] space-y-1 overflow-y-auto p-2">
              {projects.map((project) => {
                const active = selectedProject?.id === project.id;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-blue-100 bg-slate-50 shadow-sm"
                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-[11px] text-slate-400">{project.code}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{project.name}</p>
                    {active && <p className="mt-1 text-xs text-blue-600">View details</p>}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <p className="text-base font-semibold text-slate-800">Tasks</p>
              <div className="flex items-center gap-2">
                <ViewToggleButton active={view === "list"} onClick={() => setView("list")} icon={<List className="h-4 w-4" />} />
                <ViewToggleButton active={view === "board"} onClick={() => setView("board")} icon={<LayoutGrid className="h-4 w-4" />} />
                <ViewToggleButton active={view === "timeline"} onClick={() => setView("timeline")} icon={<Timer className="h-4 w-4" />} />
                <button
                  type="button"
                  onClick={() => setShowFilters((current) => !current)}
                  className={`rounded-xl border p-2 text-slate-500 transition hover:bg-slate-50 ${
                    showFilters ? "border-blue-300 bg-blue-50 text-blue-600" : "border-slate-200"
                  }`}
                >
                  <Filter className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative">
              <div className={`p-3 sm:p-4 ${showFilters ? "xl:pr-[340px]" : ""}`}>
                {view === "list" && (
                  <TaskListView
                    activeTasks={activeTasks}
                    backlogTasks={backlogTasks}
                  />
                )}
                {view === "board" && <TaskBoardView tasksByStatus={tasksByStatus} />}
                {view === "timeline" && <TaskTimelineView tasks={filteredTasks} />}
              </div>

              {showFilters && (
                <aside className="right-0 top-0 z-10 h-full w-full border-t border-slate-200 bg-white p-4 xl:absolute xl:w-[330px] xl:border-l xl:border-t-0">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-lg font-semibold text-slate-800">Filters</p>
                    <button
                      type="button"
                      onClick={() => setShowFilters(false)}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:bg-slate-50"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <FilterSelect
                      label="Period"
                      value={filters.period}
                      onChange={(value) => setFilters((prev) => ({ ...prev, period: value }))}
                      options={[
                        { value: "first_month", label: "First month (September)" },
                        { value: "full_quarter", label: "Full quarter" },
                      ]}
                    />

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Task Group</p>
                      <div className="space-y-2">
                        {(Object.keys(GROUP_LABEL) as TaskGroup[]).map((group) => (
                          <FilterCheckbox
                            key={group}
                            checked={filters.groups.includes(group)}
                            label={GROUP_LABEL[group]}
                            onChange={(checked) =>
                              setFilters((prev) => ({
                                ...prev,
                                groups: checked
                                  ? [...prev.groups, group]
                                  : prev.groups.filter((value) => value !== group),
                              }))
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Priority</p>
                      <div className="space-y-2">
                        {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((priority) => (
                          <FilterCheckbox
                            key={priority}
                            checked={filters.priorities.includes(priority)}
                            label={PRIORITY_LABEL[priority]}
                            onChange={(checked) =>
                              setFilters((prev) => ({
                                ...prev,
                                priorities: checked
                                  ? [...prev.priorities, priority]
                                  : prev.priorities.filter((value) => value !== priority),
                              }))
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Assignee</p>
                      <input
                        value={filters.assigneeQuery}
                        onChange={(event) => setFilters((prev) => ({ ...prev, assigneeQuery: event.target.value }))}
                        placeholder="Search assignee"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setFilters(DEFAULT_FILTERS)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        Clear filters
                      </button>
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ViewToggleButton({
  active,
  onClick,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-2 transition ${
        active
          ? "border-blue-300 bg-blue-50 text-blue-600"
          : "border-slate-200 text-slate-500 hover:bg-slate-50"
      }`}
    >
      {icon}
    </button>
  );
}

function TaskListView({
  activeTasks,
  backlogTasks,
}: {
  activeTasks: ProjectTask[];
  backlogTasks: ProjectTask[];
}) {
  return (
    <div className="space-y-4">
      <TaskGroupSection title="Active Tasks" tasks={activeTasks} />
      <TaskGroupSection title="Backlog" tasks={backlogTasks} />
    </div>
  );
}

function TaskGroupSection({ title, tasks }: { title: string; tasks: ProjectTask[] }) {
  return (
    <div>
      <div className="mb-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
        {title}
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <article key={task.id} className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 md:grid-cols-[minmax(0,1.6fr)_95px_95px_95px_90px_96px] md:items-center">
            <div>
              <p className="text-[10px] text-slate-400">Task Name</p>
              <p className="text-sm font-medium text-slate-800">{task.taskName}</p>
            </div>
            <TaskValue label="Estimate" value={`${task.estimateHours}h`} />
            <TaskValue label="Spent Time" value={`${task.spentHours}h`} />
            <div>
              <p className="text-[10px] text-slate-400">Assignee</p>
              <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
                {initialsFromName(task.assignee)}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Priority</p>
              <p className={`text-xs font-semibold ${PRIORITY_STYLE[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</p>
            </div>
            <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[task.status]}`}>
              {STATUS_LABEL[task.status]}
            </span>
          </article>
        ))}
        {tasks.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No tasks in this group.</p>}
      </div>
    </div>
  );
}

function TaskValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-xs font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function TaskBoardView({
  tasksByStatus,
}: {
  tasksByStatus: Record<TaskStatus, ProjectTask[]>;
}) {
  const order: TaskStatus[] = ["todo", "in_progress", "in_review", "done"];

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
      {order.map((status) => (
        <div key={status} className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
          <div className="mb-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600">
            {STATUS_LABEL[status]}
          </div>
          <div className="space-y-2">
            {tasksByStatus[status].map((task) => (
              <article key={task.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] text-slate-400">{task.code}</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{task.taskName}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className={PRIORITY_STYLE[task.priority]}>{PRIORITY_LABEL[task.priority]}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{task.estimateHours}h</span>
                </div>
              </article>
            ))}
            {tasksByStatus[status].length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-400">
                Empty
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskTimelineView({ tasks }: { tasks: ProjectTask[] }) {
  const days = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[860px] rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[220px_repeat(20,minmax(20px,1fr))] border-b border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-xs font-semibold text-slate-600">First month (September)</div>
          {days.map((day) => (
            <div key={day} className="text-center text-[10px] text-slate-400">
              {day}
            </div>
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {tasks.map((task) => (
            <div key={task.id} className="grid grid-cols-[220px_repeat(20,minmax(20px,1fr))] items-center px-3 py-2">
              <div className="pr-2 text-xs text-slate-700">{task.taskName}</div>
              {days.map((day) => {
                const active =
                  day >= task.timelineStartDay &&
                  day < task.timelineStartDay + task.timelineDuration;
                return (
                  <div key={day} className="px-[2px] py-[2px]">
                    <div
                      className={`h-5 rounded-sm ${
                        active ? "bg-blue-300" : "bg-slate-100"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-slate-400">No tasks available.</div>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          Timeline preview
        </span>
        <span>Use filters to refine tasks</span>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-400"
      />
      <span>{label}</span>
    </label>
  );
}
