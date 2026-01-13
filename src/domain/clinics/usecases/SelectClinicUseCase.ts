// src/domain/clinics/usecases/SelectClinicUseCase.ts

import type { ClinicsRepository, SelectClinicResult } from '@/domain/clinics/repositories/ClinicsRepository'

export class SelectClinicUseCase {
  constructor(private readonly repo: ClinicsRepository) {}

  async execute(input: { clinicId: string }): Promise<SelectClinicResult> {
    const clinicId = input?.clinicId?.trim()
    if (!clinicId) {
      throw new Error('Invalid clinicId')
    }

    return this.repo.selectClinic(clinicId)
  }
}
