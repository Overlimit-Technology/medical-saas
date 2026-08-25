"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppointmentsRepositoryHttp } from "@/data/appointments/AppointmentsRepository";
import { CrmRepositoryHttp } from "@/data/crm/CrmRepository";
import { DashboardRepositoryHttp } from "@/data/dashboard/DashboardRepository";
import {
  UpdateAppointmentArrivalUseCase,
  UpdateAppointmentPaymentUseCase,
} from "@/domain/appointments/usecases/ManageAppointmentsUseCases";
import { GetCrmTreatmentsUseCase } from "@/domain/crm/usecases/CrmUseCases";
import type { SecretaryDashboardData as DashboardData } from "@/domain/dashboard/entities/Dashboard";
import { GetSecretaryDashboardUseCase } from "@/domain/dashboard/usecases/DashboardUseCases";
import type { Treatment } from "@/domain/treatments/entities/Treatment";

export type QuickPaymentInput = {
  treatmentId: string;
  status: "PENDING" | "PAID" | "WAIVED";
  amount: number;
  notes: string | null;
};

export type ArrivalInput = {
  status: "WAITING" | "ARRIVED" | "DELAYED";
  delayMinutes?: number;
  notify?: boolean;
};

export function useSecretaryDashboardViewModel() {
  const useCases = useMemo(() => {
    const dashboardRepo = new DashboardRepositoryHttp();
    const appointmentsRepo = new AppointmentsRepositoryHttp();
    const crmRepo = new CrmRepositoryHttp();

    return {
      getSecretaryDashboard: new GetSecretaryDashboardUseCase(dashboardRepo),
      updateAppointmentPayment: new UpdateAppointmentPaymentUseCase(appointmentsRepo),
      updateAppointmentArrival: new UpdateAppointmentArrivalUseCase(appointmentsRepo),
      getCrmTreatments: new GetCrmTreatmentsUseCase(crmRepo),
    };
  }, []);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [savingAppointmentId, setSavingAppointmentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextData = await useCases.getSecretaryDashboard.execute();
      setData(nextData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [useCases]);

  // Catalogo de tratamientos: alimenta el selector del cobro rapido y el precio
  // sugerido. Falla en silencio porque el dashboard sigue siendo util sin el.
  const fetchTreatments = useCallback(async () => {
    try {
      setTreatments(await useCases.getCrmTreatments.execute());
    } catch {
      setTreatments([]);
    }
  }, [useCases]);

  useEffect(() => {
    void fetchData();
    void fetchTreatments();
  }, [fetchData, fetchTreatments]);

  /**
   * Registra el cobro de una cita usando el MISMO endpoint que la caja del dia
   * de /agenda (PATCH /api/appointments/:id). Es idempotente porque
   * PaymentHistory.appointmentId es unico: recobrar sobrescribe, no duplica.
   */
  const registerPayment = useCallback(
    async (appointmentId: string, input: QuickPaymentInput) => {
      setSavingAppointmentId(appointmentId);
      setActionError(null);
      try {
        await useCases.updateAppointmentPayment.execute(appointmentId, input);
        await fetchData();
        return true;
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : "No se pudo registrar el cobro.");
        return false;
      } finally {
        setSavingAppointmentId(null);
      }
    },
    [fetchData, useCases]
  );

  /** Marca llegada/demora en la sala de espera y avisa al profesional. */
  const updateArrival = useCallback(
    async (appointmentId: string, input: ArrivalInput) => {
      setSavingAppointmentId(appointmentId);
      setActionError(null);
      try {
        await useCases.updateAppointmentArrival.execute(appointmentId, input);
        await fetchData();
        return true;
      } catch (err: unknown) {
        setActionError(
          err instanceof Error ? err.message : "No se pudo actualizar la sala de espera."
        );
        return false;
      } finally {
        setSavingAppointmentId(null);
      }
    },
    [fetchData, useCases]
  );

  return {
    state: { data, loading, error, treatments, savingAppointmentId, actionError },
    actions: { fetchData, registerPayment, updateArrival, clearActionError: () => setActionError(null) },
  };
}
