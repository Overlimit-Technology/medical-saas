"use client";

import React from "react";
import {
  CalendarDays,
  Eye,
  EyeOff,
  FileHeart,
  Lock,
  Mail,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useLoginViewModel } from "./LoginViewModel";

const rightPanelHighlights = [
  {
    icon: ShieldCheck,
    label: "100% seguro",
  },
  {
    icon: CalendarDays,
    label: "Agenda clínica",
  },
  {
    icon: FileHeart,
    label: "Historial médico",
  },
  {
    icon: UsersRound,
    label: "Pacientes centralizados",
  },
];

export default function Login() {
  const { state, actions } = useLoginViewModel();
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#eef5f7] md:h-screen md:overflow-hidden">
      <div className="grid min-h-screen md:h-screen md:grid-cols-[420px_minmax(0,1fr)] lg:grid-cols-[480px_minmax(0,1fr)]">
        <section className="flex min-h-screen items-center bg-white px-8 py-10 md:min-h-0 md:px-12 md:py-0 lg:px-16">
          <div className="mx-auto w-full max-w-[384px]">
            <div className="space-y-6">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://i.imgur.com/Phz9XZE.png"
                  alt="Zensya"
                  className="mb-6 h-auto w-[220px] sm:w-[250px]"
                />
                <h1 className="text-[1.05rem] font-semibold leading-tight text-slate-700 sm:text-[1.15rem]">
                  Gestión clínica inteligente
                </h1>
                <p className="mt-1.5 text-sm leading-6 text-slate-400">
                  Accede a tu panel de gestión clínica.
                </p>
              </div>

              {state.formError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Correo electrónico
                  </label>
                  <div className="group flex items-center rounded-xl border border-slate-200 bg-white transition focus-within:border-[#50c9d5] focus-within:ring-4 focus-within:ring-[#50c9d5]/10">
                    <Mail className="ml-4 h-4.5 w-4.5 shrink-0 text-slate-400 transition group-focus-within:text-[#168d98]" />
                    <input
                      id="email"
                      type="email"
                      placeholder="nombre@ejemplo.cl"
                      value={state.email}
                      onChange={(e) => actions.setEmail(e.target.value)}
                      disabled={state.loading}
                      className="w-full rounded-xl bg-transparent px-3 py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
                    />
                  </div>
                  {state.fieldErrors.email && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {state.fieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Contraseña
                  </label>
                  <div className="group flex items-center rounded-xl border border-slate-200 bg-white transition focus-within:border-[#50c9d5] focus-within:ring-4 focus-within:ring-[#50c9d5]/10">
                    <Lock className="ml-4 h-4.5 w-4.5 shrink-0 text-slate-400 transition group-focus-within:text-[#168d98]" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={state.password}
                      onChange={(e) => actions.setPassword(e.target.value)}
                      disabled={state.loading}
                      className="w-full rounded-xl bg-transparent px-3 py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={
                        showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4.5 w-4.5" />
                      ) : (
                        <Eye className="h-4.5 w-4.5" />
                      )}
                    </button>
                  </div>
                  {state.fieldErrors.password && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {state.fieldErrors.password}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={state.loading}
                  className="w-full rounded-xl bg-[#19b3bc] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#159ea7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#50c9d5] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60"
                >
                  {state.loading ? "Ingresando..." : "Iniciar sesión"}
                </button>
              </form>
            </div>
          </div>
        </section>

        <section
          className="relative hidden h-screen overflow-hidden md:block"
          style={{
            backgroundImage:
              "linear-gradient(145deg, rgba(22,184,191,0.58) 0%, rgba(80,201,213,0.5) 46%, rgba(122,224,230,0.44) 100%), url('https://images.unsplash.com/photo-1764727291644-5dcb0b1a0375?auto=format&fit=crop&fm=jpg&q=80&w=1800')",
            backgroundSize: "cover",
            backgroundPosition: "center center",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_48%)]" />
          <div className="relative h-full px-10 py-10 text-white lg:px-14 lg:py-12">
            <div className="absolute right-10 top-10 lg:right-14 lg:top-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                <ShieldCheck className="h-4 w-4" />
                100% seguro
              </div>
            </div>

            <div className="flex h-full items-center">
              <div className="w-full max-w-[560px]">
                <div className="max-w-[520px]">
                  <h2 className="text-[2rem] font-semibold leading-[1.02] tracking-[-0.04em] lg:text-[2.6rem]">
                    Tu clínica, más simple y ordenada.
                  </h2>
                  <p className="mt-4 max-w-[460px] text-base leading-7 text-white/92 lg:text-lg">
                    Gestiona pacientes, agenda y fichas clínicas desde un solo lugar, con una experiencia clara para el equipo de salud.
                  </p>
                </div>

                <div className="mt-10 grid max-w-[560px] grid-cols-2 gap-3">
                  {rightPanelHighlights.map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/14">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-sm font-medium leading-5 text-white">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
