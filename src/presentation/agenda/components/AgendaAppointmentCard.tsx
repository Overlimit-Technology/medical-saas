"use client";

import { getCardClasses, type AppointmentStatus, type ColorName } from "../statusColors";
import type { AgendaAppointment } from "../agenda.types";
import { formatTimeLabel } from "../agenda.utils";

type Props = {
  item: AgendaAppointment;
  start: Date;
  end: Date;
  durationSlots: number;
  canEdit: boolean;
  isDraggingDisabled: boolean;
  isGhost?: boolean;
  isBeingDragged?: boolean;
  className?: string;
  resolvedColors: Record<AppointmentStatus, ColorName>;
  onClick: () => void;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export default function AgendaAppointmentCard({
  item,
  start,
  end,
  durationSlots,
  canEdit,
  isDraggingDisabled,
  isGhost = false,
  isBeingDragged = false,
  className = "",
  resolvedColors,
  onClick,
  onPointerDown,
}: Props) {
  const doctorInitial = item.doctor.profile?.firstName?.charAt(0)?.toUpperCase() ?? "?";
  const isLarge = durationSlots >= 3;
  const colors = getCardClasses(item.status, resolvedColors);

  return (
    <div
      onClick={onClick}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown?.(event);
      }}
      className={`group flex h-full flex-col overflow-hidden rounded-lg border ${colors.card} px-2 py-1.5 transition-all duration-200 ${colors.shadow} ${
        isGhost
          ? "pointer-events-none opacity-80 shadow-lg ring-2 ring-blue-300/60"
          : canEdit
            ? "cursor-grab touch-none hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
            : "cursor-pointer"
      } ${isDraggingDisabled ? "pointer-events-none opacity-40" : ""} ${
        isBeingDragged ? "opacity-30 saturate-75" : ""
      } ${className}`}
    >
      <p className="truncate text-[11px] font-semibold leading-tight text-slate-700">
        {`${item.patient.firstName} ${item.patient.lastName}`}
      </p>
      <p className={`mt-0.5 truncate text-[10px] ${colors.time}`}>
        {formatTimeLabel(start)} - {formatTimeLabel(end)}
      </p>
      {isLarge && (
        <div className="mt-auto flex -space-x-1 pt-1">
          <div className={`flex h-5 w-5 items-center justify-center rounded-full ${colors.badge} text-[9px] font-semibold ring-1 ring-white`}>
            {doctorInitial}
          </div>
        </div>
      )}
    </div>
  );
}
