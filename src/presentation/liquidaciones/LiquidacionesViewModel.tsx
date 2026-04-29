"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClinicSettingsRepositoryHttp } from "@/data/clinic-settings/ClinicSettingsRepository";
import { ProfessionalPayoutsRepositoryHttp } from "@/data/professional-payouts/ProfessionalPayoutsRepository";
import { ProfileRepositoryHttp } from "@/data/profile/ProfileRepository";
import { formatCurrency } from "@/presentation/dashboard/shared";
import type {
  ProfessionalPayoutMonthResponse,
  ProfessionalPayoutRow,
} from "@/domain/professional-payouts/entities/ProfessionalPayout";
import { SaveProfessionalPayoutSettingsUseCase } from "@/domain/clinic-settings/usecases/ClinicSettingsUseCases";
import {
  GetProfessionalPayoutsUseCase,
  SendProfessionalPayoutEmailsUseCase,
} from "@/domain/professional-payouts/usecases/ProfessionalPayoutUseCases";
import { GetMyProfileUseCase } from "@/domain/profile/usecases/ProfileUseCases";
import {
  deriveProfessionalPayoutAmounts,
  roundProfessionalPayoutAmount,
} from "@/lib/professional-payouts/calculations";

type DerivedProfessionalPayoutRow = ProfessionalPayoutRow & {
  clinicRetentionAmount: number;
  siiRetentionAmount: number;
  netAmount: number;
  netPercentage: number;
};

type SummaryState = {
  activeProfessionals: number;
  sessions: number;
  grossAmount: number;
  clinicRetentionAmount: number;
  siiRetentionAmount: number;
  netAmount: number;
};

function getCurrentMonthValue(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function formatPercentageInput(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function formatPercentageLabel(value: number) {
  return `${value.toFixed(2).replace(/\.?0+$/, "")}%`;
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
  const derived = deriveProfessionalPayoutAmounts(
    row.grossAmount,
    clinicPercentage,
    siiPercentage
  );

  return {
    ...row,
    clinicRetentionAmount: derived.clinicRetentionAmount,
    siiRetentionAmount: derived.siiRetentionAmount,
    netAmount: derived.netAmount,
    netPercentage: derived.netPercentage,
  };
}

function escapeExcelHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function exportLiquidacionesToExcel(input: {
  clinicLabel: string | null;
  monthLabel: string;
  clinicPercentage: number;
  siiPercentage: number;
  rows: DerivedProfessionalPayoutRow[];
  summary: SummaryState;
}) {
  const generatedAt = new Date().toLocaleString("es-CL");
  const detailRows = input.rows
    .map((row) => {
      const treatments = row.treatments.length
        ? row.treatments
            .map(
              (treatment) =>
                `${treatment.name} (${treatment.sessionCount} - ${formatCurrency(
                  treatment.grossAmount
                )})`
            )
            .join(" | ")
        : "Sin sesiones liquidables";

      return `
        <tr>
          <td>${escapeExcelHtml(row.name)}</td>
          <td>${escapeExcelHtml(row.specialty || "Sin especialidad")}</td>
          <td>${row.sessionCount}</td>
          <td>${escapeExcelHtml(formatCurrency(row.grossAmount))}</td>
          <td>${escapeExcelHtml(formatCurrency(row.clinicRetentionAmount))}</td>
          <td>${escapeExcelHtml(formatCurrency(row.siiRetentionAmount))}</td>
          <td>${escapeExcelHtml(formatPercentageLabel(row.netPercentage))}</td>
          <td>${escapeExcelHtml(formatCurrency(row.netAmount))}</td>
          <td>${escapeExcelHtml(treatments)}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          p { margin: 0 0 8px; }
          table { border-collapse: collapse; width: 100%; margin-top: 16px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; vertical-align: top; }
          th { background: #eef2f7; text-align: left; }
          .summary td:first-child { font-weight: 700; width: 220px; }
        </style>
      </head>
      <body>
        <h1>Liquidaciones</h1>
        <p><strong>Sede:</strong> ${escapeExcelHtml(input.clinicLabel ?? "Sede actual")}</p>
        <p><strong>Mes:</strong> ${escapeExcelHtml(input.monthLabel)}</p>
        <p><strong>Exportado:</strong> ${escapeExcelHtml(generatedAt)}</p>

        <table class="summary">
          <tbody>
            <tr><td>% Clinica</td><td>${escapeExcelHtml(formatPercentageLabel(input.clinicPercentage))}</td></tr>
            <tr><td>% SII</td><td>${escapeExcelHtml(formatPercentageLabel(input.siiPercentage))}</td></tr>
            <tr><td>Profesionales activos</td><td>${input.summary.activeProfessionals}</td></tr>
            <tr><td>Sesiones liquidables</td><td>${input.summary.sessions}</td></tr>
            <tr><td>Bruto total</td><td>${escapeExcelHtml(formatCurrency(input.summary.grossAmount))}</td></tr>
            <tr><td>Descuento clinica</td><td>${escapeExcelHtml(formatCurrency(input.summary.clinicRetentionAmount))}</td></tr>
            <tr><td>Descuento SII</td><td>${escapeExcelHtml(formatCurrency(input.summary.siiRetentionAmount))}</td></tr>
            <tr><td>Neto total</td><td>${escapeExcelHtml(formatCurrency(input.summary.netAmount))}</td></tr>
          </tbody>
        </table>

        <table>
          <thead>
            <tr>
              <th>Profesional</th>
              <th>Especialidad</th>
              <th>Atenciones</th>
              <th>Bruto</th>
              <th>Desc. Clinica</th>
              <th>Desc. SII</th>
              <th>% Final</th>
              <th>Neto</th>
              <th>Tratamientos</th>
            </tr>
          </thead>
          <tbody>${detailRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `liquidaciones-${input.monthLabel.replace(/\s+/g, "-").toLowerCase()}.xls`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export function useLiquidacionesViewModel() {
  const [month, setMonth] = useState(getCurrentMonthValue);
  const [profileLoading, setProfileLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [clinicLabel, setClinicLabel] = useState<string | null>(null);
  const [data, setData] = useState<ProfessionalPayoutMonthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailFeedback, setEmailFeedback] = useState<{
    kind: "success" | "warning" | "error";
    message: string;
  } | null>(null);
  const [draftClinicPercentage, setDraftClinicPercentage] = useState("0");
  const [draftSiiPercentage, setDraftSiiPercentage] = useState("0");
  const [expandedDoctorIds, setExpandedDoctorIds] = useState<string[]>([]);

  const {
    getMyProfileUseCase,
    getProfessionalPayoutsUseCase,
    sendProfessionalPayoutEmailsUseCase,
    saveProfessionalPayoutSettingsUseCase,
  } = useMemo(() => {
    const profileRepo = new ProfileRepositoryHttp();
    const clinicSettingsRepo = new ClinicSettingsRepositoryHttp();
    const professionalPayoutsRepo = new ProfessionalPayoutsRepositoryHttp();

    return {
      getMyProfileUseCase: new GetMyProfileUseCase(profileRepo),
      getProfessionalPayoutsUseCase: new GetProfessionalPayoutsUseCase(
        professionalPayoutsRepo
      ),
      sendProfessionalPayoutEmailsUseCase: new SendProfessionalPayoutEmailsUseCase(
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

  useEffect(() => {
    if (!emailFeedback) return;
    const timeout = window.setTimeout(() => setEmailFeedback(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [emailFeedback]);

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
      } satisfies SummaryState
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
      sendingEmails,
      error,
      saveError,
      successMessage,
      emailFeedback,
      hasAccess,
      rows,
      summary: {
        activeProfessionals: summary.activeProfessionals,
        sessions: summary.sessions,
        grossAmount: roundProfessionalPayoutAmount(summary.grossAmount),
        clinicRetentionAmount: roundProfessionalPayoutAmount(summary.clinicRetentionAmount),
        siiRetentionAmount: roundProfessionalPayoutAmount(summary.siiRetentionAmount),
        netAmount: roundProfessionalPayoutAmount(summary.netAmount),
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
      sendEmails: async () => {
        setSendingEmails(true);
        setEmailFeedback(null);

        try {
          const result = await sendProfessionalPayoutEmailsUseCase.execute(month);
          const pieces = [`${result.sentCount} enviados`];
          if (result.failedCount > 0) {
            pieces.push(`${result.failedCount} fallidos`);
          }
          if (result.skippedCount > 0) {
            pieces.push(`${result.skippedCount} omitidos`);
          }

          setEmailFeedback({
            kind:
              result.failedCount > 0
                ? result.sentCount > 0
                  ? "warning"
                  : "error"
                : "success",
            message:
              result.warning && result.failedCount > 0
                ? `Envio de boletas: ${pieces.join(", ")}. ${result.warning}`
                : `Envio de boletas completado: ${pieces.join(", ")}.`,
          });
        } catch (sendError) {
          setEmailFeedback({
            kind: "error",
            message:
              sendError instanceof Error
                ? sendError.message
                : "No se pudieron enviar las boletas por correo.",
          });
        } finally {
          setSendingEmails(false);
        }
      },
      exportToExcel: () => {
        exportLiquidacionesToExcel({
          clinicLabel,
          monthLabel: currentMonthLabel,
          clinicPercentage: effectiveClinicPercentage,
          siiPercentage: effectiveSiiPercentage,
          rows,
          summary: {
            activeProfessionals: summary.activeProfessionals,
            sessions: summary.sessions,
            grossAmount: roundProfessionalPayoutAmount(summary.grossAmount),
            clinicRetentionAmount: roundProfessionalPayoutAmount(summary.clinicRetentionAmount),
            siiRetentionAmount: roundProfessionalPayoutAmount(summary.siiRetentionAmount),
            netAmount: roundProfessionalPayoutAmount(summary.netAmount),
          },
        });
      },
    },
  };
}
