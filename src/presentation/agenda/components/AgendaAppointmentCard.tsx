"use client";

import { getCardClasses, type AppointmentStatus, type ColorName } from "../statusColors";
import type { AgendaAppointment } from "../agenda.types";
import { formatTimeLabel } from "../agenda.utils";

type Props = {
  item: AgendaAppointment;
  start: Date;
  end: Date;
  durationSlots: number;
  canDrag: boolean;
  canResize: boolean;
  isDraggingDisabled: boolean;
  isGhost?: boolean;
  isBeingDragged?: boolean;
  className?: string;
  resolvedColors: Record<AppointmentStatus, ColorName>;
  onClick: () => void;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizeStartPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onResizeEndPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
};

export default function AgendaAppointmentCard({
  item,
  start,
  end,
  durationSlots,
  canDrag,
  canResize,
  isDraggingDisabled,
  isGhost = false,
  isBeingDragged = false,
  className = "",
  resolvedColors,
  onClick,
  onPointerDown,
  onResizeStartPointerDown,
  onResizeEndPointerDown,
}: Props) {
  const colors = getCardClasses(item.status, resolvedColors);
  const patientName = `${item.patient.firstName} ${item.patient.lastName}`.trim();
  const doctorName = `${item.doctor.profile?.firstName ?? ""} ${item.doctor.profile?.lastName ?? ""}`.trim();
  const boxName = item.box?.name?.trim() ?? "";
  const treatmentPlanLabel = item.treatmentPlan
    ? `${item.treatmentPlan.name} - S${item.treatmentPlan.sessionIndex ?? "?"}/${item.treatmentPlan.totalSessions}`
    : "";
  const scheduleLabel = `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`;
  const isCompact = durationSlots <= 1;
  const isCondensed = durationSlots === 2;
  const showCombinedMeta = durationSlots >= 2;
  const showSeparatedMeta = durationSlots >= 4;
  const combinedMeta = [doctorName, boxName, treatmentPlanLabel].filter(Boolean).join(" · ");
  const cardTitle = [patientName, scheduleLabel, doctorName, boxName, treatmentPlanLabel].filter(Boolean).join(" · ");
  const canShowResizeHandles = canResize && !isGhost && !isDraggingDisabled;

  return (
    <div
      title={cardTitle}
      onClick={onClick}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown?.(event);
      }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-lg border ${colors.card} transition-all duration-200 ${colors.shadow} ${
        isGhost
          ? "pointer-events-none opacity-80 shadow-lg ring-2 ring-blue-300/60"
          : canDrag
            ? "cursor-grab touch-none hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
            : "cursor-pointer"
      } ${isDraggingDisabled ? "pointer-events-none opacity-40" : ""} ${
        isBeingDragged ? "opacity-30 saturate-75" : ""
      } ${className}`}
    >
      {canShowResizeHandles && (
        <>
          <button
            type="button"
            aria-label="Ajustar inicio de la cita"
            className="absolute inset-x-0 top-0 z-20 h-2 cursor-ns-resize"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => {
              event.stopPropagation();
              event.preventDefault();
              onResizeStartPointerDown?.(event);
            }}
          />
          <button
            type="button"
            aria-label="Ajustar fin de la cita"
            className="absolute inset-x-0 bottom-0 z-20 h-2 cursor-ns-resize"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => {
              event.stopPropagation();
              event.preventDefault();
              onResizeEndPointerDown?.(event);
            }}
          />
          <div className="pointer-events-none absolute inset-x-3 top-[2px] h-px rounded-full bg-[#19b3bc]/55 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-x-3 bottom-[2px] h-px rounded-full bg-[#19b3bc]/55 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </>
      )}

      <div
        className={`relative flex h-full min-h-0 flex-col ${
          isCompact
            ? "items-center justify-center px-1 py-0.5 text-center"
            : isCondensed
              ? "justify-center px-1.5 py-1 text-center"
              : "px-2 py-1.5"
        }`}
      >
        <p
          className={`w-full truncate font-semibold text-slate-700 ${
            isCompact ? "text-[10px] leading-none" : "text-[11px] leading-tight"
          }`}
        >
          {patientName}
        </p>
        <p
          className={`w-full truncate font-medium ${
            isCompact
              ? `mt-0.5 text-[9px] leading-none ${colors.time}`
              : `mt-0.5 text-[10px] ${colors.time}`
          }`}
        >
          {scheduleLabel}
        </p>

        {showSeparatedMeta ? (
          <>
            {treatmentPlanLabel ? (
              <p className="mt-1 truncate text-[10px] font-semibold leading-tight text-[#0f8f98]">
                {treatmentPlanLabel}
              </p>
            ) : null}
            {doctorName ? (
              <p className="mt-1 truncate text-[10px] leading-tight text-slate-500">{doctorName}</p>
            ) : null}
            {boxName ? (
              <p className="mt-0.5 truncate text-[10px] leading-tight text-slate-500">{boxName}</p>
            ) : null}
          </>
        ) : showCombinedMeta && combinedMeta ? (
          <p className="mt-1 truncate text-[9px] leading-tight text-slate-500">{combinedMeta}</p>
        ) : null}
      </div>
    </div>
  );
}

