"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SLOT_HEIGHT,
  SLOT_MINUTES,
  START_HOUR,
} from "../agenda.constants";
import type { AgendaAppointment, AgendaSelection } from "../agenda.types";
import {
  formatTimeLabel,
  minutesToLabel,
  toSlotIndex,
} from "../agenda.utils";
import type { AppointmentStatus, ColorName } from "../statusColors";
import AgendaAppointmentCard from "./AgendaAppointmentCard";

const HEADER_HEIGHT = 48;
const TIME_COLUMN_WIDTH = 56;
const DRAG_THRESHOLD = 6;

type Props = {
  weekStart: Date;
  days: Date[];
  slots: number[];
  now: Date;
  todayIndex: number;
  isCurrentWeek: boolean;
  isWithinHours: boolean;
  nowSlot: number;
  selection: AgendaSelection | null;
  appointments: AgendaAppointment[];
  canEdit: boolean;
  draggingId: string | null;
  resolvedColors: Record<AppointmentStatus, ColorName>;
  isSlotSelectionUnavailable: (dayIndex: number, slot: number) => boolean;
  canDropAppointmentAt: (appointmentId: string, dayIndex: number, slot: number) => boolean;
  slotToDate: (dayIndex: number, slotIndex: number) => Date;
  onPointerDown: (dayIndex: number, slot: number, event?: React.PointerEvent) => void;
  onPointerEnter: (dayIndex: number, slot: number) => void;
  onMoveAppointment: (appointmentId: string, dayIndex: number, slot: number) => void;
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
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  durationSlots: number;
  sourceDayIndex: number;
  sourceSlot: number;
  targetDayIndex: number;
  targetSlot: number;
  active: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function AgendaGrid({
  weekStart,
  days,
  slots,
  now,
  todayIndex,
  isCurrentWeek,
  isWithinHours,
  nowSlot,
  selection,
  appointments,
  canEdit,
  draggingId,
  resolvedColors,
  isSlotSelectionUnavailable,
  canDropAppointmentAt,
  slotToDate,
  onPointerDown,
  onPointerEnter,
  onMoveAppointment,
  onAppointmentClick,
  onAppointmentDragStart,
  onAppointmentDragEnd,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const suppressClickRef = useRef(false);
  const suppressClickTimeoutRef = useRef<number | null>(null);
  const [dragSession, setDragSession] = useState<DragSession | null>(null);

  const updateDragSession = useCallback((next: DragSession | null) => {
    dragSessionRef.current = next;
    setDragSession(next);
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
      if (!container) return null;

      const rect = container.getBoundingClientRect();
      const contentWidth = Math.max(rect.width - TIME_COLUMN_WIDTH, 1);
      const columnWidth = contentWidth / Math.max(days.length, 1);
      const rawDayIndex = Math.floor((clientX - rect.left - TIME_COLUMN_WIDTH) / columnWidth);
      const rawSlot = Math.floor((clientY - rect.top - HEADER_HEIGHT) / SLOT_HEIGHT);
      const maxStartSlot = Math.max(0, slots.length - durationSlots);

      return {
        dayIndex: clamp(rawDayIndex, 0, Math.max(days.length - 1, 0)),
        slot: clamp(rawSlot, 0, maxStartSlot),
      };
    },
    [days.length, slots.length]
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
        const target = getDropTargetFromPoint(event.clientX, event.clientY, nextSession.durationSlots);
        if (target) {
          nextSession.targetDayIndex = target.dayIndex;
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
      const finalTarget = getDropTargetFromPoint(finalX, finalY, currentSession.durationSlots);

      updateDragSession(null);

      if (currentSession.active) {
        onAppointmentDragEnd();
        releaseClickSuppression();
      }

      if (!currentSession.active || cancelled || !finalTarget) return;

      const moved =
        finalTarget.dayIndex !== currentSession.sourceDayIndex ||
        finalTarget.slot !== currentSession.sourceSlot;

      if (!moved) return;
      if (!canDropAppointmentAt(currentSession.appointmentId, finalTarget.dayIndex, finalTarget.slot)) return;

      onMoveAppointment(currentSession.appointmentId, finalTarget.dayIndex, finalTarget.slot);
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

  const activeDrag = dragSession?.active ? dragSession : null;
  const showDragOverlay = canEdit && Boolean(activeDrag);

  const draggingAppointment = useMemo(
    () =>
      activeDrag
        ? appointments.find((item) => item.id === activeDrag.appointmentId) ?? null
        : null,
    [activeDrag, appointments]
  );

  const previewStart = useMemo(() => {
    if (!activeDrag) return null;
    return slotToDate(activeDrag.targetDayIndex, activeDrag.targetSlot);
  }, [activeDrag, slotToDate]);

  const previewEnd = useMemo(() => {
    if (!draggingAppointment || !previewStart) return null;
    const duration =
      new Date(draggingAppointment.endAt).getTime() - new Date(draggingAppointment.startAt).getTime();
    return new Date(previewStart.getTime() + duration);
  }, [draggingAppointment, previewStart]);

  const previewAllowed = activeDrag
    ? canDropAppointmentAt(
        activeDrag.appointmentId,
        activeDrag.targetDayIndex,
        activeDrag.targetSlot
      )
    : false;

  const handleAppointmentPointerDown = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      appointmentId: string,
      sourceDayIndex: number,
      sourceSlot: number,
      durationSlots: number
    ) => {
      if (!canEdit || event.button !== 0 || dragSessionRef.current) return;

      const rect = event.currentTarget.getBoundingClientRect();
      updateDragSession({
        appointmentId,
        pointerId: event.pointerId,
        originX: event.clientX,
        originY: event.clientY,
        currentX: event.clientX,
        currentY: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        width: rect.width,
        height: rect.height,
        durationSlots,
        sourceDayIndex,
        sourceSlot,
        targetDayIndex: sourceDayIndex,
        targetSlot: sourceSlot,
        active: false,
      });
    },
    [canEdit, updateDragSession]
  );

  return (
    <>
      <div
        ref={containerRef}
        key={weekStart.getTime()}
        className="animate-grid-fade mt-5 relative select-none text-xs"
        style={{
          display: "grid",
          gridTemplateColumns: "56px repeat(7, minmax(0,1fr))",
          gridTemplateRows: `48px repeat(${slots.length}, ${SLOT_HEIGHT}px)`,
        }}
      >
        <div className="border-b border-slate-100" />

        {days.map((day, dayIndex) => {
          const isToday = day.toDateString() === now.toDateString();
          return (
            <div
              key={day.toISOString()}
              style={{ gridColumnStart: dayIndex + 2, gridRowStart: 1 }}
              className={`flex flex-col items-center justify-center border-b border-slate-100 pb-1 ${
                dayIndex > 0 ? "border-l border-l-slate-50" : ""
              }`}
            >
              <span className={`text-[11px] uppercase tracking-wider ${isToday ? "font-semibold text-blue-500" : "text-slate-400"}`}>
                {day.toLocaleDateString("es-CL", { weekday: "short" }).slice(0, 2)}
              </span>
              {isToday ? (
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white shadow-sm shadow-blue-200">
                  {day.getDate()}
                </span>
              ) : (
                <span className="mt-0.5 text-sm font-semibold text-slate-700">{day.getDate()}</span>
              )}
            </div>
          );
        })}

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
          days.map((_, dayIndex) => {
            const row = slot + 2;
            const col = dayIndex + 2;
            const isToday = dayIndex === todayIndex;
            const minute = (slot * SLOT_MINUTES) % 60;
            const isHourBoundary = minute === 0;
            const isUnavailable = isSlotSelectionUnavailable(dayIndex, slot);

            return (
              <div
                key={`${slot}-${dayIndex}`}
                style={{ gridColumnStart: col, gridRowStart: row }}
                className={`relative transition-colors duration-150 ${
                  isHourBoundary ? "border-t border-slate-100" : ""
                } ${isToday ? "bg-blue-50/30" : "bg-white"} ${
                  dayIndex > 0 ? "border-l border-l-slate-50" : ""
                } ${isUnavailable ? "cursor-not-allowed" : "hover:bg-blue-50/50"}`}
                data-slot={slot}
                data-day={dayIndex}
                onPointerDown={(event) => {
                  if (isUnavailable || activeDrag) return;
                  onPointerDown(dayIndex, slot, event);
                }}
                onPointerEnter={() => {
                  if (activeDrag) return;
                  onPointerEnter(dayIndex, slot);
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
            days.map((_, dayIndex) => {
              const row = slot + 2;
              const col = dayIndex + 2;
              const isActiveTarget =
                activeDrag?.targetDayIndex === dayIndex && activeDrag?.targetSlot === slot;
              const isDropAllowed = activeDrag
                ? canDropAppointmentAt(activeDrag.appointmentId, dayIndex, slot)
                : false;

              return (
                <div
                  key={`drag-overlay-${slot}-${dayIndex}`}
                  style={{ gridColumnStart: col, gridRowStart: row }}
                  className="pointer-events-none z-20"
                >
                  <div
                    className={`mx-0.5 h-full rounded-md border border-dashed transition-colors duration-150 ${
                      isDropAllowed
                        ? isActiveTarget
                          ? "border-blue-400 bg-blue-100/60"
                          : "border-transparent bg-blue-100/10"
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
              gridColumnStart: selection.dayIndex + 2,
              gridRowStart: Math.min(selection.startSlot, selection.endSlot) + 2,
              gridRowEnd: Math.max(selection.startSlot, selection.endSlot) + 3,
            }}
          >
            <div className="relative mx-0.5 h-full rounded-xl border-2 border-blue-300/60 bg-blue-100/50 p-2 text-[11px] text-blue-800 backdrop-blur-sm">
              <div className="font-semibold">Nueva cita</div>
              <div className="mt-0.5 text-blue-500">
                {formatTimeLabel(slotToDate(selection.dayIndex, Math.min(selection.startSlot, selection.endSlot)))} -{" "}
                {formatTimeLabel(slotToDate(selection.dayIndex, Math.max(selection.startSlot, selection.endSlot) + 1))}
              </div>
              <div className="text-blue-400">
                {minutesToLabel((Math.abs(selection.endSlot - selection.startSlot) + 1) * SLOT_MINUTES)}
              </div>
            </div>
          </div>
        )}

        {isCurrentWeek && isWithinHours && (
          <div
            className="pointer-events-none z-20"
            style={{
              gridColumnStart: todayIndex + 2,
              gridRowStart: nowSlot + 2,
              gridRowEnd: nowSlot + 3,
            }}
          >
            <div className="relative h-full">
              <div className="absolute left-0 right-0 top-1/2 h-[2px] rounded-full bg-blue-500/70" />
              <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-blue-500 shadow-sm shadow-blue-300" />
              <div className="absolute -left-[58px] top-1/2 -translate-y-1/2 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                {formatTimeLabel(now)}
              </div>
            </div>
          </div>
        )}

        {activeDrag && draggingAppointment && previewStart && previewEnd && (
          <div
            className="pointer-events-none z-30 px-0.5"
            style={{
              gridColumnStart: activeDrag.targetDayIndex + 2,
              gridRowStart: activeDrag.targetSlot + 2,
              gridRowEnd: activeDrag.targetSlot + 2 + activeDrag.durationSlots,
            }}
          >
            <AgendaAppointmentCard
              item={draggingAppointment}
              start={previewStart}
              end={previewEnd}
              durationSlots={activeDrag.durationSlots}
              canEdit={false}
              isDraggingDisabled={false}
              isGhost
              className={previewAllowed ? "" : "opacity-50 grayscale"}
              resolvedColors={resolvedColors}
              onClick={() => undefined}
            />
          </div>
        )}

        {appointments.map((item, index) => {
          const start = new Date(item.startAt);
          const end = new Date(item.endAt);
          const dayIndex = Math.floor((start.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
          if (dayIndex < 0 || dayIndex > 6) return null;

          const slotIndex = toSlotIndex(start);
          const durationSlots = Math.max(
            1,
            Math.ceil((end.getTime() - start.getTime()) / (SLOT_MINUTES * 60000))
          );

          return (
            <div
              key={item.id}
              style={{
                gridColumnStart: dayIndex + 2,
                gridRowStart: slotIndex + 2,
                gridRowEnd: slotIndex + 2 + durationSlots,
                animationDelay: `${index * 40}ms`,
              }}
              className="z-10 animate-card-in px-0.5"
            >
              <AgendaAppointmentCard
                item={item}
                start={start}
                end={end}
                durationSlots={durationSlots}
                canEdit={canEdit}
                isDraggingDisabled={Boolean((draggingId ?? activeDrag?.appointmentId) && (draggingId ?? activeDrag?.appointmentId) !== item.id)}
                isBeingDragged={draggingId === item.id || activeDrag?.appointmentId === item.id}
                resolvedColors={resolvedColors}
                onClick={() => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  onAppointmentClick(item);
                }}
                onPointerDown={(event) =>
                  handleAppointmentPointerDown(event, item.id, dayIndex, slotIndex, durationSlots)
                }
              />
            </div>
          );
        })}
      </div>

      {activeDrag && draggingAppointment && previewStart && previewEnd && (
        <div
          className="pointer-events-none fixed z-[70]"
          style={{
            left: activeDrag.currentX - activeDrag.offsetX,
            top: activeDrag.currentY - activeDrag.offsetY,
            width: activeDrag.width,
            height: activeDrag.height,
          }}
        >
          <AgendaAppointmentCard
            item={draggingAppointment}
            start={previewStart}
            end={previewEnd}
            durationSlots={activeDrag.durationSlots}
            canEdit={false}
            isDraggingDisabled={false}
            isGhost
            className={`${previewAllowed ? "opacity-90" : "opacity-60 grayscale"} shadow-2xl`}
            resolvedColors={resolvedColors}
            onClick={() => undefined}
          />
        </div>
      )}
    </>
  );
}
