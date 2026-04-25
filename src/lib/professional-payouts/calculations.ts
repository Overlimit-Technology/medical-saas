export type ProfessionalPayoutDerivedAmounts = {
  clinicRetentionAmount: number;
  payoutBaseAmount: number;
  siiRetentionAmount: number;
  netAmount: number;
  netPercentage: number;
};

export function roundProfessionalPayoutAmount(value: number) {
  return Number(value.toFixed(2));
}

export function deriveProfessionalPayoutAmounts(
  grossAmount: number,
  clinicPercentage: number,
  siiPercentage: number
): ProfessionalPayoutDerivedAmounts {
  const safeGrossAmount = Number.isFinite(grossAmount) ? grossAmount : 0;
  const safeClinicPercentage = Number.isFinite(clinicPercentage) ? clinicPercentage : 0;
  const safeSiiPercentage = Number.isFinite(siiPercentage) ? siiPercentage : 0;

  const clinicRetentionAmount = roundProfessionalPayoutAmount(
    (safeGrossAmount * safeClinicPercentage) / 100
  );
  const payoutBaseAmount = roundProfessionalPayoutAmount(
    safeGrossAmount - clinicRetentionAmount
  );
  const siiRetentionAmount = roundProfessionalPayoutAmount(
    (payoutBaseAmount * safeSiiPercentage) / 100
  );
  const netAmount = roundProfessionalPayoutAmount(
    payoutBaseAmount - siiRetentionAmount
  );
  const netPercentage = roundProfessionalPayoutAmount(
    ((100 - safeClinicPercentage) * (100 - safeSiiPercentage)) / 100
  );

  return {
    clinicRetentionAmount,
    payoutBaseAmount,
    siiRetentionAmount,
    netAmount,
    netPercentage,
  };
}

