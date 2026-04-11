"use client";

import { useEffect, useMemo, useState } from "react";
import { AppointmentsRepositoryHttp } from "@/data/appointments/AppointmentsRepository";
import { GetAppointmentDetailUseCase } from "@/domain/appointments/usecases/GetAppointmentDetailUseCase";
import type { Appointment } from "@/domain/appointments/entities/Appointment";

export function useAppointmentDetailViewModel(appointmentId: string) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const getAppointmentDetailUseCase = useMemo(() => {
    const repo = new AppointmentsRepositoryHttp();
    return new GetAppointmentDetailUseCase(repo);
  }, []);

  useEffect(() => {
    const load = async () => {
      const item = await getAppointmentDetailUseCase.execute(appointmentId);
      if (item) setAppointment(item);
      setLoading(false);
    };
    void load();
  }, [appointmentId, getAppointmentDetailUseCase]);

  return { state: { appointment, loading } };
}
