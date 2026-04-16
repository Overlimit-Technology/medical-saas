"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SLOT_HEIGHT,
  SLOT_MINUTES,
  START_HOUR,
} from "../agenda.constants";
import type {
  AgendaAppointment,
  AgendaGridColumn,
  AgendaSelection,
} from "../agenda.types";
import {
  formatTimeLabel,
  minutesToLabel,
} from "../agenda.utils";
import type { AppointmentStatus, ColorName } from "../statusColors";
import AgendaAppointmentCard from "./AgendaAppointmentCard";

const HEADER_HEIGHT = 48;
const TIME_COLUMN_WIDTH = 56;
const DRAG_THRESHOLD = 6;
const RESIZE_THRESHOLD = 2;

type AppointmentPlacement = {
  columnIndex: number;
  slotIndex: number;
  durationSlots: number;
};

type PositionedAppointment = {
  item: AgendaAppointment;
  placement: AppointmentPlacement;
  startSlot: number;
  endSlot: number;
};

type AppointmentLaneLayout = {
  laneIndex: number;
  laneCount: number;
};

type Props = {
  gridKey: string;
  columns: AgendaGridColumn[];
  slots: number[];
  now: Date;
  currentTimeColumnIndex: number;
  isCurrentRange: boolean;
  isWithinHours: boolean;
  nowSlot: number;
  showCurrentTimeAcrossAllColumns?: boolean;
  selection: AgendaSelection | null;
  appointments: AgendaAppointment[];
  canSelectSlots: boolean;
  canDragAppointments: boolean;
  canResizeAppointments: boolean;
  draggingId: string | null;
  resolvedColors: Record<AppointmentStatus, ColorName>;
  getAppointmentPlacement: (item: AgendaAppointment) => AppointmentPlacement | null;
  isSlotSelectionUnavailable: (columnIndex: number, slot: number) => boolean;
  canDropAppointmentAt: (appointmentId: string, columnIndex: number, slot: number) => boolean;
  canResizeAppointmentAt: (
    appointmentId: string,
    columnIndex: number,
    startSlot: number,
    endSlot: number
  ) => boolean;
  slotToDate: (columnIndex: number, slotIndex: number) => Date;
  onPointerDown: (columnIndex: number, slot: number, event?: React.PointerEvent) => void;
  onPointerEnter: (columnIndex: number, slot: number) => void;
  onMoveAppointment: (appointmentId: string, columnIndex: number, slot: number) => void;
  onResizeAppointment: (
    appointmentId: string,
    columnIndex: number,
    startSlot: number,
    endSlot: number
  ) => void;
  onAppointmentClick: (item: AgendaAppointment) => void;
  onAppointmentDragStart: (appointmentId: string) => void;
  onAppointmentDragEnd: () => void;
};

type DragSession = {
  appointmentId: string;
  pointerId: number;
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
  durationSlots: number;
  sourceColumnIndex: number;
  sourceSlot: number;
  targetColumnIndex: number;
  targetSlot: number;
  active: boolean;
};

type ResizeEdge = "start" | "end";

type ResizeSession = {
  appointmentId: string;
  pointerId: number;
  originY: number;
  currentY: number;
  sourceColumnIndex: number;
  sourceStartSlot: number;
  sourceEndSlot: number;
  targetStartSlot: number;
  targetEndSlot: number;
  edge: ResizeEdge;
  active: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function assignClusterLayouts(
  cluster: PositionedAppointment[],
  layoutMap: Map<string, AppointmentLaneLayout>
) {
  const laneEndSlots: number[] = [];
  const assignments: Array<{ id: string; laneIndex: number }> = [];

  for (const entry of cluster) {
    let laneIndex = laneEndSlots.findIndex((laneEndSlot) => laneEndSlot <= entry.startSlot);

    if (laneIndex < 0) {
      laneIndex = laneEndSlots.length;
      laneEndSlots.push(entry.endSlot);
    } else {
      laneEndSlots[laneIndex] = entry.endSlot;
    }

    assignments.push({ id: entry.item.id, laneIndex });
  }

  const laneCount = Math.max(laneEndSlots.length, 1);

  assignments.forEach(({ id, laneIndex }) => {
    layoutMap.set(id, { laneIndex, laneCount });
  });
}

function buildAppointmentLayouts(entries: PositionedAppointment[]) {
  const layoutMap = new Map<string, AppointmentLaneLayout>();
  const byColumn = new Map<number, PositionedAppointment[]>();

  entries.forEach((entry) => {
    const columnEntries = byColumn.get(entry.placement.columnIndex) ?? [];
    columnEntries.push(entry);
    byColumn.set(entry.placement.columnIndex, columnEntries);
  });

  byColumn.forEach((columnEntries) => {
    const sortedEntries = [...columnEntries].sort(
      (left, right) =>
        left.startSlot - right.startSlot ||
        left.endSlot - right.endSlot ||
        left.item.id.localeCompare(right.item.id)
    );

    let cluster: PositionedAppointment[] = [];
    let clusterEndSlot = -1;

    const flushCluster = () => {
      if (!cluster.length) return;
      assignClusterLayouts(cluster, layoutMap);
      cluster = [];
      clusterEndSlot = -1;
    };

    sortedEntries.forEach((entry) => {
      if (!cluster.length) {
        cluster = [entry];
        clusterEndSlot = entry.endSlot;
        return;
      }

      if (entry.startSlot < clusterEndSlot) {
        cluster.push(entry);
        clusterEndSlot = Math.max(clusterEndSlot, entry.endSlot);
        return;
      }

      flushCluster();
      cluster = [entry];
      clusterEndSlot = entry.endSlot;
    });

    flushCluster();
  });

  return layoutMap;
}

export default function AgendaGrid({
  gridKey,
  columns,
  slots,
  now,
  currentTimeColumnIndex,
  isCurrentRange,
  isWithinHours,
  nowSlot,
  showCurrentTimeAcrossAllColumns = false,
  selection,
  appointments,
  canSelectSlots,
  canDragAppointments,
  canResizeAppointments,
  draggingId,
  resolvedColors,
  getAppointmentPlacement,
  isSlotSelectionUnavailable,
  canDropAppointmentAt,
  canResizeAppointmentAt,
  slotToDate,
  onPointerDown,
  onPointerEnter,
  onMoveAppointment,
  onResizeAppointment,
  onAppointmentClick,
  onAppointmentDragStart,
  onAppointmentDragEnd,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const resizeSessionRef = useRef<ResizeSession | null>(null);
  const suppressClickRef = useRef(false);
  const suppressClickTimeoutRef = useRef<number | null>(null);
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [resizeSession, setResizeSession] = useState<ResizeSession | null>(null);

  const updateDragSession = useCallback((next: DragSession | null) => {
    dragSessionRef.current = next;
    setDragSession(next);
  }, []);

  const updateResizeSession = useCallback((next: ResizeSession | null) => {
    resizeSessionRef.current = next;
    setResizeSession(next);
  }, []);

  useEffect(() => {
    return () => {
      if (suppressClickTimeoutRef.current) {
        window.clearTimeout(suppressClickTimeoutRef.current);
      }
    };
  }, []);

  const releaseClickSuppression = useCallback(() => {
    suppressClickRef.current = true;
    if (suppressClickTimeoutRef.current) {
      window.clearTimeout(suppressClickTimeoutRef.current);
    }
    suppressClickTimeoutRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 140);
  }, []);

  const getDropTargetFromPoint = useCallback(
    (clientX: number, clientY: number, durationSlots: number) => {
      const container = containerRef.current;
      if (!container || columns.length === 0) return null;

      const rect = container.getBoundingClientRect();
      const contentWidth = Math.max(rect.width - TIME_COLUMN_WIDTH, 1);
      const columnWidth = contentWidth / Math.max(columns.length, 1);
      const rawColumnIndex = Math.floor((clientX - rect.left - TIME_COLUMN_WIDTH) / columnWidth);
      const rawSlot = Math.floor((clientY - rect.top - HEADER_HEIGHT) / SLOT_HEIGHT);
      const maxStartSlot = Math.max(0, slots.length - durationSlots);

      return {
        columnIndex: clamp(rawColumnIndex, 0, Math.max(columns.length - 1, 0)),
        slot: clamp(rawSlot, 0, maxStartSlot),
      };
    },
    [columns.length, slots.length]
  );

  const getResizeSlotFromPoint = useCallback(
    (clientY: number, edge: ResizeEdge) => {
      const container = containerRef.current;
      if (!container) return null;

      const rect = container.getBoundingClientRect();
      const relativeY = clientY - rect.top - HEADER_HEIGHT;

      if (edge === "start") {
        return clamp(Math.floor(relativeY / SLOT_HEIGHT), 0, Math.max(slots.length - 1, 0));
      }

      return clamp(Math.ceil(relativeY / SLOT_HEIGHT), 1, slots.length);
    },
    [slots.length]
  );

  useEffect(() => {
    if (!dragSession) return;

    const handlePointerMove = (event: PointerEvent) => {
      const currentSession = dragSessionRef.current;
      if (!currentSession || event.pointerId !== currentSession.pointerId) return;

      const nextSession: DragSession = {
        ...currentSession,
        currentX: event.clientX,
        currentY: event.clientY,
      };

      if (!nextSession.active) {
        const distanceX = Math.abs(event.clientX - nextSession.originX);
        const distanceY = Math.abs(event.clientY - nextSession.originY);
        if (Math.max(distanceX, distanceY) >= DRAG_THRESHOLD) {
          nextSession.active = true;
          onAppointmentDragStart(nextSession.appointmentId);
        }
      }

      if (nextSession.active) {
        const target = getDropTargetFromPoint(
          event.clientX,
          event.clientY,
          nextSession.durationSlots
        );
        if (target) {
          nextSession.targetColumnIndex = target.columnIndex;
          nextSession.targetSlot = target.slot;
        }
      }

      updateDragSession(nextSession);
    };

    const finishDrag = (pointerEvent?: PointerEvent, cancelled = false) => {
      const currentSession = dragSessionRef.current;
      if (!currentSession) return;
      if (pointerEvent && pointerEvent.pointerId !== currentSession.pointerId) return;

      const finalX = pointerEvent?.clientX ?? currentSession.currentX;
      const finalY = pointerEvent?.clientY ?? currentSession.currentY;
      const finalTarget = getDropTargetFromPoint(
        finalX,
        finalY,
        currentSession.durationSlots
      );

      updateDragSession(null);

      if (currentSession.active) {
        onAppointmentDragEnd();
        releaseClickSuppression();
      }

      if (!currentSession.active || cancelled || !finalTarget) return;

      const moved =
        finalTarget.columnIndex !== currentSession.sourceColumnIndex ||
        finalTarget.slot !== currentSession.sourceSlot;

      if (!moved) return;
      if (
        !canDropAppointmentAt(
          currentSession.appointmentId,
          finalTarget.columnIndex,
          finalTarget.slot
        )
      ) {
        return;
      }

      onMoveAppointment(
        currentSession.appointmentId,
        finalTarget.columnIndex,
        finalTarget.slot
      );
    };

    const handlePointerCancel = () => finishDrag(undefined, true);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [
    canDropAppointmentAt,
    dragSession,
    getDropTargetFromPoint,
    onAppointmentDragEnd,
    onAppointmentDragStart,
    onMoveAppointment,
    releaseClickSuppression,
    updateDragSession,
  ]);

  useEffect(() => {
    if (!resizeSession) return;

    const handlePointerMove = (event: PointerEvent) => {
      const currentSession = resizeSessionRef.current;
      if (!currentSession || event.pointerId !== currentSession.pointerId) return;

      const nextSession: ResizeSession = {
        ...currentSession,
        currentY: event.clientY,
      };

      if (!nextSession.active) {
        const distanceY = Math.abs(event.clientY - nextSession.originY);
        if (distanceY >= RESIZE_THRESHOLD) {
          nextSession.active = true;
          onAppointmentDragStart(nextSession.appointmentId);
        }
      }

      if (nextSession.active) {
        const nextSlot = getResizeSlotFromPoint(event.clientY, nextSession.edge);
        if (nextSlot !== null) {
          if (nextSession.edge === "start") {
            nextSession.targetStartSlot = clamp(
              nextSlot,
              0,
              nextSession.sourceEndSlot - 1
            );
          } else {
            nextSession.targetEndSlot = clamp(
              nextSlot,
              nextSession.sourceStartSlot + 1,
              slots.length
            );
          }
        }
      }

      updateResizeSession(nextSession);
    };

    const finishResize = (pointerEvent?: PointerEvent, cancelled = false) => {
      const currentSession = resizeSessionRef.current;
      if (!currentSession) return;
      if (pointerEvent && pointerEvent.pointerId !== currentSession.pointerId) return;

      let finalStartSlot = currentSession.targetStartSlot;
      let finalEndSlot = currentSession.targetEndSlot;

      if (pointerEvent) {
        const nextSlot = getResizeSlotFromPoint(pointerEvent.clientY, currentSession.edge);
        if (nextSlot !== null) {
          if (currentSession.edge === "start") {
            finalStartSlot = clamp(nextSlot, 0, currentSession.sourceEndSlot - 1);
          } else {
            finalEndSlot = clamp(
              nextSlot,
              currentSession.sourceStartSlot + 1,
              slots.length
            );
          }
        }
      }

      updateResizeSession(null);

      if (currentSession.active) {
        onAppointmentDragEnd();
        releaseClickSuppression();
      }

      if (!currentSession.active || cancelled) return;

      const resized =
        finalStartSlot !== currentSession.sourceStartSlot ||
        finalEndSlot !== currentSession.sourceEndSlot;

      if (!resized) return;
      if (
        !canResizeAppointmentAt(
          currentSession.appointmentId,
          currentSession.sourceColumnIndex,
          finalStartSlot,
          finalEndSlot
        )
      ) {
        return;
      }

      onResizeAppointment(
        currentSession.appointmentId,
        currentSession.sourceColumnIndex,
        finalStartSlot,
        finalEndSlot
      );
    };

    const handlePointerCancel = () => finishResize(undefined, true);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishResize);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishResize);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [
    canResizeAppointmentAt,
    getResizeSlotFromPoint,
    onAppointmentDragEnd,
    onAppointmentDragStart,
    onResizeAppointment,
    releaseClickSuppression,
    resizeSession,
    slots.length,
    updateResizeSession,
  ]);

  const activeDrag = dragSession?.active ? dragSession : null;
  const activeResize = resizeSession?.active ? resizeSession : null;
  const activeInteraction = activeDrag ?? activeResize;
  const showDragOverlay = canDragAppointments && Boolean(activeDrag);

  const positionedAppointments = useMemo<PositionedAppointment[]>(
    () =>
      appointments
        .map((item) => {
          const placement = getAppointmentPlacement(item);
          if (!placement) return null;

          return {
            item,
            placement,
            startSlot: placement.slotIndex,
            endSlot: placement.slotIndex + placement.durationSlots,
          };
        })
        .filter((entry): entry is PositionedAppointment => entry !== null),
    [appointments, getAppointmentPlacement]
  );

  const appointmentLayouts = useMemo(
    () => buildAppointmentLayouts(positionedAppointments),
    [positionedAppointments]
  );

  const previewAppointment = useMemo(() => {
    const appointmentId = activeDrag?.appointmentId ?? activeResize?.appointmentId;
    if (!appointmentId) return null;
    return appointments.find((item) => item.id === appointmentId) ?? null;
  }, [activeDrag, activeResize, appointments]);

  const previewPlacement = useMemo(() => {
    if (activeDrag) {
      return {
        columnIndex: activeDrag.targetColumnIndex,
        startSlot: activeDrag.targetSlot,
        endSlot: activeDrag.targetSlot + activeDrag.durationSlots,
      };
    }

    if (activeResize) {
      return {
        columnIndex: activeResize.sourceColumnIndex,
        startSlot: activeResize.targetStartSlot,
        endSlot: activeResize.targetEndSlot,
      };
    }

    return null;
  }, [activeDrag, activeResize]);

  const previewStart = useMemo(() => {
    if (!previewPlacement) return null;
    return slotToDate(previewPlacement.columnIndex, previewPlacement.startSlot);
  }, [previewPlacement, slotToDate]);

  const previewEnd = useMemo(() => {
    if (!previewPlacement) return null;
    return slotToDate(previewPlacement.columnIndex, previewPlacement.endSlot);
  }, [previewPlacement, slotToDate]);

  const previewDurationSlots = previewPlacement
    ? previewPlacement.endSlot - previewPlacement.startSlot
    : null;

  const previewAllowed = activeDrag
    ? canDropAppointmentAt(
        activeDrag.appointmentId,
        activeDrag.targetColumnIndex,
        activeDrag.targetSlot
      )
    : activeResize
      ? canResizeAppointmentAt(
          activeResize.appointmentId,
          activeResize.sourceColumnIndex,
          activeResize.targetStartSlot,
          activeResize.targetEndSlot
        )
      : false;

  const handleAppointmentPointerDown = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      appointmentId: string,
      sourceColumnIndex: number,
      sourceSlot: number,
      durationSlots: number
    ) => {
      if (
        !canDragAppointments ||
        event.button !== 0 ||
        dragSessionRef.current ||
        resizeSessionRef.current
      ) {
        return;
      }

      updateDragSession({
        appointmentId,
        pointerId: event.pointerId,
        originX: event.clientX,
        originY: event.clientY,
        currentX: event.clientX,
        currentY: event.clientY,
        durationSlots,
        sourceColumnIndex,
        sourceSlot,
        targetColumnIndex: sourceColumnIndex,
        targetSlot: sourceSlot,
        active: false,
      });
    },
    [canDragAppointments, updateDragSession]
  );

  const handleAppointmentResizePointerDown = useCallback(
    (
      event: React.PointerEvent<HTMLButtonElement>,
      appointmentId: string,
      sourceColumnIndex: number,
      sourceSlot: number,
      durationSlots: number,
      edge: ResizeEdge
    ) => {
      if (
        !canResizeAppointments ||
        event.button !== 0 ||
        dragSessionRef.current ||
        resizeSessionRef.current
      ) {
        return;
      }

      updateResizeSession({
        appointmentId,
        pointerId: event.pointerId,
        originY: event.clientY,
        currentY: event.clientY,
        sourceColumnIndex,
        sourceStartSlot: sourceSlot,
        sourceEndSlot: sourceSlot + durationSlots,
        targetStartSlot: sourceSlot,
        targetEndSlot: sourceSlot + durationSlots,
        edge,
        active: false,
      });
    },
    [canResizeAppointments, updateResizeSession]
  );

  if (columns.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-[#19b3bc]/20 bg-[#19b3bc]/[0.03] px-6 py-10 text-center text-sm text-slate-500">
        No hay elementos disponibles para esta vista del calendario.
      </div>
    );
  }

  const minimumColumnWidth = columns.some((column) => column.variant === "resource") ? 180 : 0;

  return (
    <>
      <div
        ref={containerRef}
        key={gridKey}
        className="animate-grid-fade mt-5 relative select-none text-xs"
        style={{
          display: "grid",
          gridTemplateColumns: `56px repeat(${columns.length}, minmax(${minimumColumnWidth}px,1fr))`,
          gridTemplateRows: `48px repeat(${slots.length}, ${SLOT_HEIGHT}px)`,
        }}
      >
        <div className="border-b border-slate-100" />

        {columns.map((column, columnIndex) => (
          <div
            key={column.id}
            style={{ gridColumnStart: columnIndex + 2, gridRowStart: 1 }}
            className={`flex flex-col items-center justify-center border-b border-slate-100 px-2 pb-1 ${
              columnIndex > 0 ? "border-l border-l-slate-50" : ""
            }`}
          >
            <span
              className={`text-[11px] uppercase tracking-wider ${
                column.isToday ? "font-semibold text-[#19b3bc]" : "text-slate-400"
              }`}
            >
              {column.caption}
            </span>
            {column.variant === "resource" ? (
              <span
                className={`mt-1 inline-flex max-w-full items-center rounded-full px-3 py-1 text-sm font-semibold ${
                  column.isToday
                    ? "bg-[#19b3bc]/10 text-[#0f8f98]"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <span className="truncate">{column.label}</span>
              </span>
            ) : column.isToday ? (
              <span className="mt-0.5 flex h-7 min-w-7 items-center justify-center rounded-full bg-[#19b3bc] px-2 text-sm font-bold text-white shadow-sm shadow-[#19b3bc]/30">
                {column.label}
              </span>
            ) : (
              <span className="mt-0.5 text-sm font-semibold text-slate-700">{column.label}</span>
            )}
          </div>
        ))}

        {slots.map((slot) => {
          const hour = START_HOUR + Math.floor((slot * SLOT_MINUTES) / 60);
          const minute = (slot * SLOT_MINUTES) % 60;
          const row = slot + 2;

          return (
            <div
              key={`time-${slot}`}
              style={{ gridColumnStart: 1, gridRowStart: row }}
              className="flex items-start justify-end border-r border-slate-100 pr-2 pt-0.5 text-[11px] leading-none text-slate-300"
            >
              {minute === 0 ? (
                <span className="text-slate-400">{`${hour.toString().padStart(2, "0")}:00`}</span>
              ) : null}
            </div>
          );
        })}

        {slots.map((slot) =>
          columns.map((column, columnIndex) => {
            const row = slot + 2;
            const col = columnIndex + 2;
            const isHighlightedColumn = column.isToday === true;
            const minute = (slot * SLOT_MINUTES) % 60;
            const isHourBoundary = minute === 0;
            const isUnavailable = isSlotSelectionUnavailable(columnIndex, slot);

            return (
              <div
                key={`${slot}-${column.id}`}
                style={{ gridColumnStart: col, gridRowStart: row }}
                className={`relative transition-colors duration-150 ${
                  isHourBoundary ? "border-t border-slate-100" : ""
                } ${isHighlightedColumn ? "bg-[#19b3bc]/[0.08]" : "bg-white"} ${
                  columnIndex > 0 ? "border-l border-l-slate-50" : ""
                } ${
                  isUnavailable
                    ? "cursor-not-allowed"
                    : canSelectSlots
                      ? "hover:bg-[#19b3bc]/10"
                      : ""
                }`}
                data-slot={slot}
                data-column={columnIndex}
                onPointerDown={(event) => {
                  if (!canSelectSlots || isUnavailable || activeInteraction) return;
                  onPointerDown(columnIndex, slot, event);
                }}
                onPointerEnter={() => {
                  if (!canSelectSlots || activeInteraction) return;
                  onPointerEnter(columnIndex, slot);
                }}
              >
                {isUnavailable && (
                  <div className="pointer-events-none absolute inset-0 bg-slate-50/80" />
                )}
              </div>
            );
          })
        )}

        {showDragOverlay &&
          slots.map((slot) =>
            columns.map((column, columnIndex) => {
              const row = slot + 2;
              const col = columnIndex + 2;
              const isActiveTarget =
                activeDrag?.targetColumnIndex === columnIndex && activeDrag?.targetSlot === slot;
              const isDropAllowed = activeDrag
                ? canDropAppointmentAt(activeDrag.appointmentId, columnIndex, slot)
                : false;

              return (
                <div
                  key={`drag-overlay-${slot}-${column.id}`}
                  style={{ gridColumnStart: col, gridRowStart: row }}
                  className="pointer-events-none z-20"
                >
                  <div
                    className={`mx-0.5 h-full rounded-md border border-dashed transition-colors duration-150 ${
                      isDropAllowed
                        ? isActiveTarget
                          ? "border-[#19b3bc] bg-[#19b3bc]/20"
                          : "border-transparent bg-[#19b3bc]/10"
                        : isActiveTarget
                          ? "border-rose-300 bg-rose-100/60"
                          : "border-transparent bg-rose-100/20"
                    }`}
                  />
                </div>
              );
            })
          )}

        {selection && (
          <div
            className="pointer-events-none"
            style={{
              gridColumnStart: selection.columnIndex + 2,
              gridRowStart: Math.min(selection.startSlot, selection.endSlot) + 2,
              gridRowEnd: Math.max(selection.startSlot, selection.endSlot) + 3,
            }}
          >
            <div className="relative mx-0.5 h-full rounded-xl border-2 border-[#19b3bc]/40 bg-[#19b3bc]/15 p-2 text-[11px] text-[#0f8f98] backdrop-blur-sm">
              <div className="font-semibold">Nueva cita</div>
              <div className="mt-0.5 text-[#19b3bc]">
                {formatTimeLabel(
                  slotToDate(
                    selection.columnIndex,
                    Math.min(selection.startSlot, selection.endSlot)
                  )
                )}{" "}
                -{" "}
                {formatTimeLabel(
                  slotToDate(
                    selection.columnIndex,
                    Math.max(selection.startSlot, selection.endSlot) + 1
                  )
                )}
              </div>
              <div className="text-[#19b3bc]/80">
                {minutesToLabel(
                  (Math.abs(selection.endSlot - selection.startSlot) + 1) * SLOT_MINUTES
                )}
              </div>
            </div>
          </div>
        )}

        {isCurrentRange && isWithinHours && (
          <div
            className="pointer-events-none z-20"
            style={{
              gridColumnStart: showCurrentTimeAcrossAllColumns ? 2 : currentTimeColumnIndex + 2,
              gridColumnEnd: showCurrentTimeAcrossAllColumns ? columns.length + 2 : undefined,
              gridRowStart: nowSlot + 2,
              gridRowEnd: nowSlot + 3,
            }}
          >
            <div className="relative h-full">
              <div className="absolute left-0 right-0 top-1/2 h-[2px] rounded-full bg-[#19b3bc]/70" />
              <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#19b3bc] shadow-sm shadow-[#19b3bc]/30" />
              <div className="absolute -left-[58px] top-1/2 -translate-y-1/2 rounded-md border border-[#19b3bc]/20 bg-[#e8f8f9] px-1.5 py-0.5 text-[10px] font-semibold text-[#0f8f98]">
                {formatTimeLabel(now)}
              </div>
            </div>
          </div>
        )}

        {previewPlacement &&
          previewAppointment &&
          previewStart &&
          previewEnd &&
          previewDurationSlots && (
            <div
              className="pointer-events-none z-30 relative"
              style={{
                gridColumnStart: previewPlacement.columnIndex + 2,
                gridRowStart: previewPlacement.startSlot + 2,
                gridRowEnd: previewPlacement.endSlot + 2,
              }}
            >
              <div className="absolute inset-y-0 left-[2px] right-[2px]">
                <AgendaAppointmentCard
                  item={previewAppointment}
                  start={previewStart}
                  end={previewEnd}
                  durationSlots={previewDurationSlots}
                  canDrag={false}
                  canResize={false}
                  isDraggingDisabled={false}
                  isGhost
                  className={previewAllowed ? "" : "opacity-50 grayscale"}
                  resolvedColors={resolvedColors}
                  onClick={() => undefined}
                />
              </div>
            </div>
          )}

        {positionedAppointments.map(({ item, placement }, index) => {
          const start = new Date(item.startAt);
          const end = new Date(item.endAt);
          const layout = appointmentLayouts.get(item.id) ?? { laneIndex: 0, laneCount: 1 };
          const widthPercent = 100 / layout.laneCount;
          const leftPercent = layout.laneIndex * widthPercent;

          return (
            <div
              key={item.id}
              style={{
                gridColumnStart: placement.columnIndex + 2,
                gridRowStart: placement.slotIndex + 2,
                gridRowEnd: placement.slotIndex + 2 + placement.durationSlots,
                animationDelay: `${index * 40}ms`,
              }}
              className="z-10 animate-card-in relative"
            >
              <div
                className="absolute inset-y-0"
                style={{
                  left: `calc(${leftPercent}% + 2px)`,
                  width: `calc(${widthPercent}% - 4px)`,
                }}
              >
                <AgendaAppointmentCard
                  item={item}
                  start={start}
                  end={end}
                  durationSlots={placement.durationSlots}
                  canDrag={canDragAppointments}
                  canResize={canResizeAppointments}
                  isDraggingDisabled={Boolean(
                    (draggingId ?? activeInteraction?.appointmentId) &&
                      (draggingId ?? activeInteraction?.appointmentId) !== item.id
                  )}
                  isBeingDragged={
                    draggingId === item.id || activeInteraction?.appointmentId === item.id
                  }
                  resolvedColors={resolvedColors}
                  onClick={() => {
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false;
                      return;
                    }
                    onAppointmentClick(item);
                  }}
                  onPointerDown={(event) =>
                    handleAppointmentPointerDown(
                      event,
                      item.id,
                      placement.columnIndex,
                      placement.slotIndex,
                      placement.durationSlots
                    )
                  }
                  onResizeStartPointerDown={(event) =>
                    handleAppointmentResizePointerDown(
                      event,
                      item.id,
                      placement.columnIndex,
                      placement.slotIndex,
                      placement.durationSlots,
                      "start"
                    )
                  }
                  onResizeEndPointerDown={(event) =>
                    handleAppointmentResizePointerDown(
                      event,
                      item.id,
                      placement.columnIndex,
                      placement.slotIndex,
                      placement.durationSlots,
                      "end"
                    )
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
