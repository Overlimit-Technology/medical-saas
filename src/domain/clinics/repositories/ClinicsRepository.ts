// src/domain/clinics/repositories/ClinicsRepository.ts

import type { Clinic } from '@/domain/clinics/entities/Clinic'

export type SelectClinicResult = {
  redirectTo: string
}

export interface ClinicsRepository {
  getMyClinics(): Promise<Clinic[]>
  selectClinic(clinicId: string): Promise<SelectClinicResult>
}
