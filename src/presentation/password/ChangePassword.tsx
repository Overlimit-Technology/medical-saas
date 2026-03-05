"use client";

import React from "react";
import { useChangePasswordViewModel } from "./ChangePasswordViewModel";

export default function ChangePassword() {
  const { state, actions } = useChangePasswordViewModel();

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
            <h1 className="text-xl font-semibold text-neutral-900">
              Cambiar contrasena
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Debes actualizar tu contrasena temporal para continuar
            </p>
          </div>

          {state.formError && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.formError}
            </div>
          )}

          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              actions.submit();
            }}
          >
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Contrasena actual
              </label>
              <input
                id="currentPassword"
                type="password"
                placeholder="********"
                value={state.currentPassword}
                onChange={(e) => actions.setCurrentPassword(e.target.value)}
                disabled={state.loading}
                className="w-full rounded-full border border-neutral-200 bg-neutral-50/60 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              />
              {state.fieldErrors.currentPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {state.fieldErrors.currentPassword}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Nueva contrasena
              </label>
              <input
                id="newPassword"
                type="password"
                placeholder="Minimo 8 caracteres"
                value={state.newPassword}
                onChange={(e) => actions.setNewPassword(e.target.value)}
                disabled={state.loading}
                className="w-full rounded-full border border-neutral-200 bg-neutral-50/60 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              />
              {state.fieldErrors.newPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {state.fieldErrors.newPassword}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Confirmar contrasena
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Repite la nueva contrasena"
                value={state.confirmPassword}
                onChange={(e) => actions.setConfirmPassword(e.target.value)}
                disabled={state.loading}
                className="w-full rounded-full border border-neutral-200 bg-neutral-50/60 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              />
              {state.fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {state.fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={state.loading}
                className="w-full rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60"
              >
                {state.loading ? "Actualizando..." : "Actualizar contrasena"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="text-xs font-medium text-blue-500 hover:text-blue-600"
              >
                Cerrar sesion
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[11px] text-neutral-400">
            (c) {new Date().getFullYear()} MediGest. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
