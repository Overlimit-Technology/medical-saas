"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClinicSettingsRepositoryHttp } from "@/data/clinic-settings/ClinicSettingsRepository";
import { ProfessionalPayoutsRepositoryHttp } from "@/data/professional-payouts/ProfessionalPayoutsRepository";
import { ProfileRepositoryHttp } from "@/data/profile/ProfileRepository";
import type {
  ProfessionalPayoutMonthResponse,
  ProfessionalPayoutRow,
} from "@/domain/professional-payouts/entities/ProfessionalPayout";
import { SaveProfessionalPayoutSettingsUseCase } from "@/domain/clinic-settings/usecases/ClinicSettingsUseCases";
import { GetProfessionalPayoutsUseCase } from "@/domain/professional-payouts/usecases/ProfessionalPayoutUseCases";
import { GetMyProfileUseCase } from "@/domain/profile/usecases/ProfileUseCases";

type DerivedProfessionalPayoutRow = ProfessionalPayoutRow & {
  clinicRetentionAmount: number;
  siiRetentionAmount: number;
  netAmount: number;
};

function getCurrentMonthValue(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function roundAmount(value: number) {
  return Number(value.toFixed(2));
}

function formatPercentageInput(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function parsePercentageInput(value: string) {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;

  return parsed;
}

function validatePercentageInput(value: string) {
  const parsed = parsePercentageInput(value);
  if (parsed === null) return "Ingresa un porcentaje.";
  if (parsed < 0 || parsed > 100) return "Debe estar entre 0 y 100.";
  if (Number(parsed.toFixed(2)) !== parsed) return "Maximo 2 decimales.";
  return null;
}

function formatMonthLabel(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function derivePayoutRow(
  row: ProfessionalPayoutRow,
  clinicPercentage: number,
  siiPercentage: number
): DerivedProfessionalPayoutRow {
  const clinicRetentionAmount = roundAmount((row.grossAmount * clinicPercentage) / 100);
  const siiRetentionAmount = roundAmount((row.grossAmount * siiPercentage) / 100);
  const netAmount = roundAmount(
    row.grossAmount - clinicRetentionAmount - siiRetentionAmount
  );

  return {
    ...row,
    clinicRetentionAmount,
    siiRetentionAmount,
    netAmount,
  };
}

export function useLiquidacionesViewModel() {
  const [month, setMonth] = useState(getCurrentMonthValue);
  const [profileLoading, setProfileLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [clinicLabel, setClinicLabel] = useState<string | null>(null);
  const [data, setData] = useState<ProfessionalPayoutMonthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [draftClinicPercentage, setDraftClinicPercentage] = useState("0");
  const [draftSiiPercentage, setDraftSiiPercentage] = useState("0");
  const [expandedDoctorIds, setExpandedDoctorIds] = useState<string[]>([]);

  const { getMyProfileUseCase, getProfessionalPayoutsUseCase, saveProfessionalPayoutSettingsUseCase } =
    useMemo(() => {
      const profileRepo = new ProfileRepositoryHttp();
      const clinicSettingsRepo = new ClinicSettingsRepositoryHttp();
      const professionalPayoutsRepo = new ProfessionalPayoutsRepositoryHttp();

      return {
        getMyProfileUseCase: new GetMyProfileUseCase(profileRepo),
        getProfessionalPayoutsUseCase: new GetProfessionalPayoutsUseCase(
          professionalPayoutsRepo
        ),
        saveProfessionalPayoutSettingsUseCase: new SaveProfessionalPayoutSettingsUseCase(
          clinicSettingsRepo
        ),
      };
    }, []);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await getMyProfileUseCase.execute();
      setRole(profile.role);
      setClinicLabel(profile.clinicLabel ?? null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "No se pudo cargar el perfil."
      );
      setRole(null);
      setClinicLabel(null);
    } finally {
      setProfileLoading(false);
    }
  }, [getMyProfileUseCase]);

  const loadMonthData = useCallback(
    async (targetMonth: string) => {
      setLoading(true);
      setError(null);
      setSaveError(null);

      try {
        const nextData = await getProfessionalPayoutsUseCase.execute(targetMonth);
        setData(nextData);
        setDraftClinicPercentage(formatPercentageInput(nextData.settings.clinicPercentage));
        setDraftSiiPercentage(formatPercentageInput(nextData.settings.siiPercentage));
        setExpandedDoctorIds([]);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar la liquidacion mensual."
        );
      } finally {
        setLoading(false);
      }
    },
    [getProfessionalPayoutsUseCase]
  );

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profileLoading) return;

    if (role !== "ADMIN") {
      window.location.assign("/dashboard");
      return;
    }

    void loadMonthData(month);
  }, [loadMonthData, month, profileLoading, role]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const clinicPercentageError = validatePercentageInput(draftClinicPercentage);
  const siiPercentageError = validatePercentageInput(draftSiiPercentage);
  const hasValidationErrors = Boolean(clinicPercentageError || siiPercentageError);

  const effectiveClinicPercentage = Math.min(
    100,
    Math.max(0, parsePercentageInput(draftClinicPercentage) ?? 0)
  );
  const effectiveSiiPercentage = Math.min(
    100,
    Math.max(0, parsePercentageInput(draftSiiPercentage) ?? 0)
  );

  const rows = useMemo(() => {
    const baseRows = data?.professionals ?? [];
    const mapped = baseRows.map((row) =>
      derivePayoutRow(row, effectiveClinicPercentage, effectiveSiiPercentage)
    );

    mapped.sort((left, right) => {
      if (right.netAmount !== left.netAmount) {
        return right.netAmount - left.netAmount;
      }
      return left.name.localeCompare(right.name, "es");
    });

    return mapped;
  }, [data?.professionals, effectiveClinicPercentage, effectiveSiiPercentage]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.activeProfessionals += 1;
        acc.sessions += row.sessionCount;
        acc.grossAmount += row.grossAmount;
        acc.clinicRetentionAmount += row.clinicRetentionAmount;
        acc.siiRetentionAmount += row.siiRetentionAmount;
        acc.netAmount += row.netAmount;
        return acc;
      },
      {
        activeProfessionals: 0,
        sessions: 0,
        grossAmount: 0,
        clinicRetentionAmount: 0,
        siiRetentionAmount: 0,
        netAmount: 0,
      }
    );
  }, [rows]);

  const hasAccess = role === "ADMIN";
  const hasData = data !== null;
  const savedClinicPercentage = data?.settings.clinicPercentage ?? 0;
  const savedSiiPercentage = data?.settings.siiPercentage ?? 0;
  const parsedClinicPercentage = parsePercentageInput(draftClinicPercentage);
  const parsedSiiPercentage = parsePercentageInput(draftSiiPercentage);
  const hasUnsavedChanges =
    parsedClinicPercentage !== null &&
    parsedSiiPercentage !== null &&
    (Math.abs(parsedClinicPercentage - savedClinicPercentage) > 0.0001 ||
      Math.abs(parsedSiiPercentage - savedSiiPercentage) > 0.0001);

  const saveDisabled = saving || !hasData || hasValidationErrors || !hasUnsavedChanges;
  const currentMonthLabel = formatMonthLabel(month);
  const isEmptyMonth = summary.sessions === 0;

  const handleSave = useCallback(async () => {
    const nextClinicPercentage = parsePercentageInput(draftClinicPercentage);
    const nextSiiPercentage = parsePercentageInput(draftSiiPercentage);

    if (
      nextClinicPercentage === null ||
      nextSiiPercentage === null ||
      validatePercentageInput(draftClinicPercentage) ||
      validatePercentageInput(draftSiiPercentage)
    ) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await saveProfessionalPayoutSettingsUseCase.execute({
        clinicPercentage: nextClinicPercentage,
        siiPercentage: nextSiiPercentage,
      });

      setData((current) =>
        current
          ? {
              ...current,
              settings: {
                clinicPercentage: nextClinicPercentage,
                siiPercentage: nextSiiPercentage,
              },
            }
          : current
      );
      setDraftClinicPercentage(formatPercentageInput(nextClinicPercentage));
      setDraftSiiPercentage(formatPercentageInput(nextSiiPercentage));
      setSuccessMessage("Configuracion guardada.");
    } catch (saveSettingsError) {
      setSaveError(
        saveSettingsError instanceof Error
          ? saveSettingsError.message
          : "No se pudo guardar la configuracion."
      );
    } finally {
      setSaving(false);
    }
  }, [
    draftClinicPercentage,
    draftSiiPercentage,
    saveProfessionalPayoutSettingsUseCase,
  ]);

  const handleReset = useCallback(() => {
    if (!data) return;
    setDraftClinicPercentage(formatPercentageInput(data.settings.clinicPercentage));
    setDraftSiiPercentage(formatPercentageInput(data.settings.siiPercentage));
    setSaveError(null);
  }, [data]);

  const toggleDoctor = useCallback((doctorId: string) => {
    setExpandedDoctorIds((current) =>
      current.includes(doctorId)
        ? current.filter((item) => item !== doctorId)
        : [...current, doctorId]
    );
  }, []);

  return {
    state: {
      month,
      currentMonthLabel,
      clinicLabel,
      roleLoading: profileLoading,
      loading,
      saving,
      error,
      saveError,
      successMessage,
      hasAccess,
      rows,
      summary: {
        activeProfessionals: summary.activeProfessionals,
        sessions: summary.sessions,
        grossAmount: roundAmount(summary.grossAmount),
        clinicRetentionAmount: roundAmount(summary.clinicRetentionAmount),
        siiRetentionAmount: roundAmount(summary.siiRetentionAmount),
        netAmount: roundAmount(summary.netAmount),
      },
      isEmptyMonth,
      draftClinicPercentage,
      draftSiiPercentage,
      clinicPercentageError,
      siiPercentageError,
      hasUnsavedChanges,
      saveDisabled,
      expandedDoctorIds,
    },
    actions: {
      setMonth,
      setDraftClinicPercentage,
      setDraftSiiPercentage,
      saveSettings: handleSave,
      resetSettings: handleReset,
      refresh: () => loadMonthData(month),
      toggleDoctor,
    },
  };
}
