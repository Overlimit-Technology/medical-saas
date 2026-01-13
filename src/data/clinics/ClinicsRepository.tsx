// src/data/clinics/ClinicsRepository.tsx

import type { Clinic } from '@/domain/clinics/entities/Clinic'
import type { ClinicsRepository, SelectClinicResult } from '@/domain/clinics/repositories/ClinicsRepository'

type MyClinicsResponse =
  | { ok: true; items: Clinic[] }
  | { ok: false; error: string }

type SelectClinicResponse =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string }

export class ClinicsRepositoryHttp implements ClinicsRepository {
  async getMyClinics(): Promise<Clinic[]> {
    const res = await fetch('/api/clinics/my', {
      method: 'GET',
      credentials: 'include',
    })

    const data = (await res.json().catch(() => null)) as MyClinicsResponse | null
    if (!res.ok || !data || data.ok !== true) {
      const err = data && 'error' in data ? data.error : 'Failed to load clinics'
      throw new Error(err)
    }

    return data.items ?? []
  }

  async selectClinic(clinicId: string): Promise<SelectClinicResult> {
    const res = await fetch('/api/clinics/select', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinicId }),
    })

    const data = (await res.json().catch(() => null)) as SelectClinicResponse | null
    if (!res.ok || !data || data.ok !== true || !data.redirectTo) {
      const err = data && 'error' in data ? data.error : 'Failed to select clinic'
      throw new Error(err)
    }

    return { redirectTo: data.redirectTo }
  }
}
