// src/domain/clinics/usecases/GetMyClinicsUseCase.ts

import type { Clinic } from '@/domain/clinics/entities/Clinic'
import type { ClinicsRepository } from '@/domain/clinics/repositories/ClinicsRepository'

export class GetMyClinicsUseCase {
  constructor(private readonly repo: ClinicsRepository) {}

  async execute(): Promise<Clinic[]> {
    // MVP: no extra input. Future: pagination, search, filtering.
    return this.repo.getMyClinics()
  }
}
