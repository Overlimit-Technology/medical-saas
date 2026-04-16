"use client";

import { useLeadsViewModel } from "./LeadsViewModel";
import KanbanBoard from "./components/KanbanBoard";
import LeadTable from "./components/LeadTable";
import LeadDetailPanel from "./components/LeadDetailPanel";
import LeadForm from "./components/LeadForm";
import LeadFilters from "./components/LeadFilters";
import ColumnEditor from "./components/ColumnEditor";
import ChannelFilter from "./components/ChannelFilter";

export default function Leads() {
  const { state, actions } = useLeadsViewModel();

  if (!state.loaded) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-400">Cargando pipeline...</p>
      </div>
    );
  }

  return (
    <div className="leads-module flex h-full flex-col">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-slate-200/60 bg-white px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <p className="text-[11px] text-slate-400">
              {state.stats.total} leads &middot; {state.stats.inProcess} activos &middot; {state.stats.conversionRate}% conversion
            </p>
            <div className="hidden lg:flex items-center gap-4 pl-4 border-l border-slate-200">
              <MiniStat label="Ganados" value={state.stats.wonCount} color="text-emerald-600" />
              <MiniStat label="Perdidos" value={state.stats.lostCount} color="text-red-500" />
              <MiniStat label="Pipeline" value={`$${state.stats.totalBudget.toLocaleString("es-CL")}`} color="text-slate-700" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => actions.setViewMode("kanban")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                  state.viewMode === "kanban"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Kanban
              </button>
              <button
                type="button"
                onClick={() => actions.setViewMode("table")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                  state.viewMode === "table"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Tabla
              </button>
            </div>

            <button
              type="button"
              onClick={() => actions.setShowColumnEditor(true)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              Columnas
            </button>

            <button
              type="button"
              onClick={actions.openCreateForm}
              className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
            >
              + Nuevo Lead
            </button>
          </div>
        </div>
      </div>

      {/* Channel filter */}
      <div className="shrink-0 px-5 pt-3 pb-1 bg-slate-50/50 border-b border-slate-100">
        <ChannelFilter
          selected={state.filters.channel}
          counts={state.stats.byChannel}
          onChange={(channel) =>
            actions.setFilters((prev) => ({ ...prev, channel }))
          }
        />
      </div>

      {/* Follow-ups alert */}
      {state.followUps.length > 0 && (
        <div className="shrink-0 border-b border-amber-200/60 bg-amber-50/70 px-5 py-2">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-500"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span className="text-[11px] font-medium text-amber-700">
              {state.followUps.length} seguimiento{state.followUps.length > 1 ? "s" : ""}
            </span>
            <div className="flex gap-1.5 overflow-x-auto">
              {state.followUps.slice(0, 4).map((f) => (
                <button
                  key={f.id} type="button"
                  onClick={() => actions.setSelectedLeadId(f.id)}
                  className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-medium text-amber-700 shadow-sm ring-1 ring-amber-200/60 hover:bg-amber-50 transition"
                >
                  {f.name}
                  <span className="ml-1 tabular-nums text-amber-400">{new Date(f.followUpDate).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}</span>
                </button>
              ))}
              {state.followUps.length > 4 && <span className="self-center text-[10px] text-amber-400">+{state.followUps.length - 4}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="shrink-0 px-5 pt-3">
        <LeadFilters
          filters={state.filters} columns={state.columns}
          tags={state.tags} doctors={state.doctors}
          onFiltersChange={actions.setFilters}
          onExport={actions.exportData} onImport={actions.importData}
        />
      </div>

      {/* Main content */}
      <div className="relative min-h-0 flex-1 px-4 pt-1">
        {state.viewMode === "kanban" ? (
          <KanbanBoard
            columns={state.columns} leads={state.leads} dragState={state.dragState}
            onLeadClick={(id) => actions.setSelectedLeadId(id)}
            onStartDrag={actions.startDrag} onEndDrag={actions.endDrag} onDropOnColumn={actions.dropOnColumn}
            onArchive={actions.archiveLead} onDelete={actions.deleteLead}
          />
        ) : (
          <LeadTable
            leads={state.leads} columns={state.columns} doctors={state.doctors} sort={state.sort}
            onLeadClick={(id) => actions.setSelectedLeadId(id)}
            onArchive={actions.archiveLead} onDelete={actions.deleteLead} onSort={actions.toggleSort}
          />
        )}

        {state.selectedLead && (
          <LeadDetailPanel
            lead={state.selectedLead} columns={state.columns} doctors={state.doctors}
            onClose={() => actions.setSelectedLeadId(null)}
            onEdit={() => actions.openEditForm(state.selectedLead!.id)}
            onDelete={() => { actions.deleteLead(state.selectedLead!.id); actions.setSelectedLeadId(null); }}
            onArchive={() => { actions.archiveLead(state.selectedLead!.id); actions.setSelectedLeadId(null); }}
            onConvert={async () => {
              if (!confirm("Convertir este lead en paciente? Se creara un nuevo registro de paciente.")) return;
              const res = await actions.convertLead(state.selectedLead!.id);
              if (res.ok) alert("Lead convertido a paciente exitosamente.");
            }}
            onMoveLead={actions.moveLead}
            onAddNote={actions.addNote}
            onAddMessage={actions.addMessage}
          />
        )}
      </div>

      {state.showLeadForm && (
        <LeadForm
          lead={state.editingLead} columns={state.columns} tags={state.tags} doctors={state.doctors}
          onSave={(data) => {
            if (state.editingLeadId) actions.updateLead(state.editingLeadId, data);
            else actions.createLead(data);
          }}
          onClose={() => actions.setShowLeadForm(false)}
        />
      )}

      {state.showColumnEditor && (
        <ColumnEditor
          columns={state.columns}
          onAdd={actions.addColumn} onUpdate={actions.updateColumn} onDelete={actions.deleteColumn} onReorder={actions.reorderColumns}
          onClose={() => actions.setShowColumnEditor(false)}
        />
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-sm font-semibold tabular-nums ${color ?? "text-slate-800"}`}>{value}</span>
      <span className="text-[10px] text-slate-400">{label}</span>
    </div>
  );
}
