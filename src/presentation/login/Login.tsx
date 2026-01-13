"use client";

import React from "react";
import { useLoginViewModel } from "./LoginViewModel";

export default function Login() {
  const { state, actions } = useLoginViewModel();

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Marca / placeholder de logo */}
        <div className="mb-6 text-center">
          <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-700 shadow-sm">
            <span className="tracking-wide">Medi</span>
            <span className="font-bold tracking-tight">Gest</span>
          </span>
        </div>

        {/* Tarjeta de login */}
        <div className="rounded-3xl bg-white border border-neutral-100 shadow-lg px-8 py-10">
          {/* Título */}
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-neutral-900">
              Iniciar sesión
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Accede a tu panel de gestión clínica
            </p>
          </div>

          {/* Error general */}
          {state.formError && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.formError}
            </div>
          )}

          {/* Formulario */}
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              actions.submit();
            }}
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                placeholder="nombre@ejemplo.cl"
                value={state.email}
                onChange={(e) => actions.setEmail(e.target.value)}
                disabled={state.loading}
                className="w-full rounded-full border border-neutral-200 bg-neutral-50/60 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              />
              {state.fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {state.fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-blue-500 hover:text-blue-600"
                  onClick={() => alert("MVP: flujo de recuperación aún no implementado")}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={state.password}
                onChange={(e) => actions.setPassword(e.target.value)}
                disabled={state.loading}
                className="w-full rounded-full border border-neutral-200 bg-neutral-50/60 px-4 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              />
              {state.fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {state.fieldErrors.password}
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={state.loading}
                className="w-full rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60"
              >
                {state.loading ? "Ingresando..." : "Iniciar sesión"}
              </button>
            </div>
          </form>

          {/* Enlace a registro */}
          <div className="mt-6 text-center">
            <p className="text-xs text-neutral-500">
              ¿Aún no tienes cuenta?{" "}
              <button
                type="button"
                className="font-medium text-blue-500 hover:text-blue-600"
                onClick={() => alert("MVP: flujo de registro aún no implementado")}
              >
                Crear cuenta
              </button>
            </p>
          </div>
        </div>

        {/* Footer pequeño opcional */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-neutral-400">
            © {new Date().getFullYear()} MediGest. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
