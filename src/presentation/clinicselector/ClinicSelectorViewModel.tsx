'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Clinic } from '@/domain/clinics/entities/Clinic'
import { ClinicsRepositoryHttp } from '@/data/clinics/ClinicsRepository'
import { GetMyClinicsUseCase } from '@/domain/clinics/usecases/GetMyClinicsUseCase'
import { SelectClinicUseCase } from '@/domain/clinics/usecases/SelectClinicUseCase'

type State = {
  loading: boolean
  selecting: boolean
  clinics: Clinic[]
  error: string | null
}

export function useClinicSelectorViewModel() {
  const { getMyClinicsUseCase, selectClinicUseCase } = useMemo(() => {
    const repo = new ClinicsRepositoryHttp()
    return {
      getMyClinicsUseCase: new GetMyClinicsUseCase(repo),
      selectClinicUseCase: new SelectClinicUseCase(repo),
    }
  }, [])

  const [state, setState] = useState<State>({
    loading: true,
    selecting: false,
    clinics: [],
    error: null,
  })

  const actions = useMemo(() => {
    return {
      async load() {
        setState((s) => ({ ...s, loading: true, error: null }))
        try {
          const clinics = await getMyClinicsUseCase.execute()
          setState((s) => ({ ...s, clinics, loading: false }))
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Unexpected error'
          setState((s) => ({ ...s, loading: false, error: msg }))
        }
      },

      async selectClinic(clinicId: string) {
        setState((s) => ({ ...s, selecting: true, error: null }))
        try {
          const { redirectTo } = await selectClinicUseCase.execute({ clinicId })
          window.location.assign(redirectTo)
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Unexpected error'
          setState((s) => ({ ...s, selecting: false, error: msg }))
        }
      },

      async signOut() {
        setState((s) => ({ ...s, selecting: true }))
        try {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        } finally {
          window.location.assign('/login')
        }
      },
    }
  }, [getMyClinicsUseCase, selectClinicUseCase])

  useEffect(() => {
    void actions.load()
  }, [actions])

  return { state, actions }
}
