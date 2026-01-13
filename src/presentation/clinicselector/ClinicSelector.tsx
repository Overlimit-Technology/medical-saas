'use client'

import React from 'react'
import { useClinicSelectorViewModel } from './ClinicSelectorViewModel'

export default function ClinicSelector() {
  const { state, actions } = useClinicSelectorViewModel()

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-700 shadow-sm">
            <span className="tracking-wide">Medi</span>
            <span className="font-bold tracking-tight">Gest</span>
          </span>
        </div>

        <div className="rounded-3xl bg-white border border-neutral-100 shadow-lg px-8 py-10">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-neutral-900">Selecciona tu sede</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Elige la clínica/hospital donde gestionarás tu trabajo hoy
            </p>
          </div>

          {state.error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          {state.loading ? (
            <div className="text-sm text-neutral-500">Cargando sedes...</div>
          ) : state.clinics.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                No tienes sedes activas asignadas.
              </div>
              <button
                type="button"
                disabled={state.selecting}
                onClick={() => actions.signOut()}
                className="w-full rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-900 disabled:opacity-60"
              >
                Volver y cerrar sesión
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {state.clinics.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={state.selecting}
                  onClick={() => actions.selectClinic(c.id)}
                  className="w-full text-left rounded-2xl border border-neutral-200 bg-neutral-50/60 px-4 py-3 transition hover:bg-white hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                >
                  <div className="text-sm font-semibold text-neutral-900">{c.name}</div>
                  <div className="text-xs text-neutral-500">{c.city}</div>
                </button>
              ))}

              <div className="pt-3">
                <button
                  type="button"
                  disabled={state.selecting}
                  onClick={() => actions.signOut()}
                  className="w-full rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:opacity-60"
                >
                  Volver y cerrar sesión
                </button>
              </div>

              {state.selecting && (
                <p className="text-xs text-neutral-500 text-center pt-2">Procesando...</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-[11px] text-neutral-400">
            © {new Date().getFullYear()} MediGest. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
