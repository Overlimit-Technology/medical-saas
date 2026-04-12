"use client";

import { useLeadsViewModel } from "./LeadsViewModel";
import KanbanBoard from "./components/KanbanBoard";
import LeadTable from "./components/LeadTable";
import LeadDetailPanel from "./components/LeadDetailPanel";
import LeadForm from "./components/LeadForm";
import LeadFilters from "./components/LeadFilters";
import ColumnEditor from "./components/ColumnEditor";

export default function Leads() {
  const { state, actions } = useLeadsViewModel();

  if (!state.loaded) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-400">Cargando CRM...</p>
      </div>
    );
  }

  return (
    <div className="leads-module flex h-[calc(100vh-64px)] flex-col bg-white">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-100 px-6 pb-0 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-800">CRM Pipeline</h1>
              <p className="text-xs text-slate-400">
                {state.stats.total} leads &middot; {state.stats.inProcess} en proceso
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-slate-200">
              <button type="button" onClick={() => actions.setViewMode("kanban")} className={`px-3 py-1.5 text-xs font-medium transition ${state.viewMode === "kanban" ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>Kanban</button>
              <button type="button" onClick={() => actions.setViewMode("table")} className={`px-3 py-1.5 text-xs font-medium transition ${state.viewMode === "table" ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>Tabla</button>
            </div>
            <button type="button" onClick={() => actions.setShowColumnEditor(true)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50">Columnas</button>
            <button type="button" onClick={actions.openCreateForm} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700">+ Nuevo Lead</button>
          </div>
        </div>

        {/* Stats inline */}
        <div className="mt-4 flex gap-6 overflow-x-auto pb-3">
          <StatInline label="Total" value={state.stats.total} />
          <StatInline label="En proceso" value={state.stats.inProcess} />
          <StatInline label="Ganados" value={state.stats.wonCount} color="text-emerald-600" />
          <StatInline label="Perdidos" value={state.stats.lostCount} color="text-red-500" />
          <StatInline label="Conversion" value={`${state.stats.conversionRate}%`} />
          <StatInline label="Pipeline" value={`$${state.stats.totalBudget.toLocaleString("es-CL")}`} />
        </div>
      </div>

      {/* Follow-up alerts */}
      {state.followUps.length > 0 && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-2.5">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-600"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span className="text-xs font-medium text-amber-800">
              {state.followUps.length} seguimiento{state.followUps.length > 1 ? "s" : ""} pendiente{state.followUps.length > 1 ? "s" : ""}:
            </span>
            <div className="flex gap-2 overflow-x-auto">
              {state.followUps.slice(0, 5).map((f) => (
                <button
                  key={f.id} type="button"
                  onClick={() => actions.setSelectedLeadId(f.id)}
                  className="shrink-0 rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100 transition"
                >
                  {f.name}
                  <span className="ml-1 tabular-nums text-amber-500">{new Date(f.followUpDate).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}</span>
                </button>
              ))}
              {state.followUps.length > 5 && <span className="text-[11px] text-amber-500">+{state.followUps.length - 5} mas</span>}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="shrink-0 px-6 pt-4">
        <LeadFilters
          filters={state.filters} columns={state.columns} sectors={state.sectors}
          tags={state.tags} doctors={state.doctors} viewMode={state.viewMode}
          onFiltersChange={actions.setFilters} onViewModeChange={actions.setViewMode}
          onExport={actions.exportData} onImport={actions.importData}
        />
      </div>

      {/* Main content */}
      <div className="relative min-h-0 flex-1 px-4 pt-2">
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

        {/* Detail panel — non-blocking, pushes content */}
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

      {/* Modals */}
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

function StatInline({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex shrink-0 items-baseline gap-1.5">
      <span className={`text-lg font-semibold tabular-nums ${color ?? "text-slate-800"}`}>{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
