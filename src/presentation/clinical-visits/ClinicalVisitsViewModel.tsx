"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppointmentsRepositoryHttp } from "@/data/appointments/AppointmentsRepository";
import { AuthRepositoryHttp } from "@/data/auth/AuthRepository";
import { ClinicalVisitsRepositoryHttp } from "@/data/clinical-visits/ClinicalVisitsRepository";
import { PatientsRepositoryHttp } from "@/data/patients/PatientsRepository";
import { GetAppointmentsUseCase } from "@/domain/appointments/usecases/GetAppointmentsUseCase";
import { GetCurrentSessionUseCase } from "@/domain/auth/usecases/GetCurrentSessionUseCase";
import type { ClinicalVisit } from "@/domain/clinical-visits/entities/ClinicalVisit";
import {
  GetClinicalVisitsUseCase,
  StartClinicalVisitUseCase,
} from "@/domain/clinical-visits/usecases/ClinicalVisitsUseCases";
import type { PatientDetail } from "@/domain/patients/entities/Patient";
import { GetPatientsUseCase } from "@/domain/patients/usecases/PatientsUseCases";

export type Patient = Pick<PatientDetail, "id" | "firstName" | "lastName">;
export type Appointment = Awaited<ReturnType<GetAppointmentsUseCase["execute"]>>[number];
export type { ClinicalVisit };

export function useClinicalVisitsViewModel() {
  const searchParams = useSearchParams();
  const qsAppointmentId = searchParams.get("appointmentId");
  const qsPatientId = searchParams.get("patientId");

  const [role, setRole] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [visits, setVisits] = useState<ClinicalVisit[]>([]);
  const [patientId, setPatientId] = useState(qsPatientId ?? "");
  const [appointmentId, setAppointmentId] = useState(qsAppointmentId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    getCurrentSessionUseCase,
    getPatientsUseCase,
    getAppointmentsUseCase,
    getClinicalVisitsUseCase,
    startClinicalVisitUseCase,
  } = useMemo(() => {
    const authRepo = new AuthRepositoryHttp();
    const patientsRepo = new PatientsRepositoryHttp();
    const appointmentsRepo = new AppointmentsRepositoryHttp();
    const clinicalVisitsRepo = new ClinicalVisitsRepositoryHttp();
    return {
      getCurrentSessionUseCase: new GetCurrentSessionUseCase(authRepo),
      getPatientsUseCase: new GetPatientsUseCase(patientsRepo),
      getAppointmentsUseCase: new GetAppointmentsUseCase(appointmentsRepo),
      getClinicalVisitsUseCase: new GetClinicalVisitsUseCase(clinicalVisitsRepo),
      startClinicalVisitUseCase: new StartClinicalVisitUseCase(clinicalVisitsRepo),
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const session = await getCurrentSessionUseCase.execute();
        setRole(session.role);
      } catch {
        setRole(null);
      }

      try {
        const patientsResult = await getPatientsUseCase.execute({ pageSize: 200 });
        setPatients(
          patientsResult.items.map((patient) => ({
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
          }))
        );
      } catch {
        setPatients([]);
      }

      try {
        const from = new Date();
        const to = new Date();
        to.setDate(to.getDate() + 30);
        setAppointments(await getAppointmentsUseCase.execute({ from: from.toISOString(), to: to.toISOString() }));
      } catch {
        setAppointments([]);
      }

      try {
        setVisits(await getClinicalVisitsUseCase.execute());
      } catch {
        setVisits([]);
      }
    };

    void load();
  }, [getAppointmentsUseCase, getClinicalVisitsUseCase, getCurrentSessionUseCase, getPatientsUseCase]);

  useEffect(() => {
    if (!qsPatientId) return;
    setPatientId(qsPatientId);
  }, [qsPatientId]);

  useEffect(() => {
    if (!qsAppointmentId) return;
    setAppointmentId(qsAppointmentId);
  }, [qsAppointmentId]);

  const filteredAppointments = useMemo(() => {
    if (!patientId) return appointments;
    return appointments.filter((appointment) => appointment.patient.id === patientId);
  }, [appointments, patientId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (role !== "DOCTOR") {
      setError("Solo el rol Doctor puede iniciar una cita clínica.");
      return;
    }
    if (!patientId) {
      setError("Debes seleccionar un paciente para iniciar la cita clínica.");
      return;
    }

    setLoading(true);
    try {
      const item = await startClinicalVisitUseCase.execute({
        patientId,
        appointmentId: appointmentId || null,
      });
      setSuccess("Cita clínica iniciada y registrada.");
      setVisits((previous) => [item, ...previous]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo iniciar la cita clínica.");
    } finally {
      setLoading(false);
    }
  };

  return {
    state: {
      role,
      patients,
      visits,
      patientId,
      appointmentId,
      filteredAppointments,
      loading,
      error,
      success,
    },
    actions: {
      setPatientId,
      setAppointmentId,
      handleSubmit,
    },
  };
}
