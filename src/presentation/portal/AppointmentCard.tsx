import { Clock, DoorOpen, UserRound } from "lucide-react";
import type { PortalAppointment } from "@/server/portal/PortalService";
import AppointmentActions from "./AppointmentActions";
import { APPOINTMENT_STATUS, capFirst, dateBlock, longDate, minutesBetween, timeOf } from "./format";

export default function AppointmentCard({ slug, appointment, compact }: { slug: string; appointment: PortalAppointment; compact?: boolean }) {
  const d = dateBlock(appointment.startAt);
  const st = APPOINTMENT_STATUS[appointment.status];
  const upcoming = appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED";
  const title = appointment.planName
    ? `${appointment.planName}${appointment.sessionIndex ? ` · sesión ${appointment.sessionIndex}` : ""}`
    : appointment.specialty;

  return (
    <div className="appt">
      <div className={`date ${appointment.status === "CONFIRMED" ? "soft" : upcoming ? "" : "off"}`}>
        <small>{d.weekday}</small>
        <b>{d.day}</b>
        <span>{d.month}</span>
      </div>
      <div>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <h3>{title}</h3>
          <span className={`st ${st.tone}`}>{st.label}</span>
        </div>
        <div className="meta">
          <span>
            <Clock size={15} strokeWidth={1.8} />
            {`${capFirst(longDate(appointment.startAt))} · ${timeOf(appointment.startAt)} · ${minutesBetween(appointment.startAt, appointment.endAt)} min`}
          </span>
          <span>
            <UserRound size={15} strokeWidth={1.8} />
            {`${appointment.doctorName} · ${appointment.specialty}`}
          </span>
          <span>
            <DoorOpen size={15} strokeWidth={1.8} />
            {appointment.boxName}
          </span>
        </div>
        {upcoming ? (
          <AppointmentActions slug={slug} id={appointment.id} status={appointment.status} canChange={appointment.canChange} compact={compact} />
        ) : null}
      </div>
    </div>
  );
}
