export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">Panel de administración</p>
          <h1 className="text-2xl font-semibold text-slate-900">Resumen general</h1>
        </div>
        <div className="text-xs text-slate-400">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 shadow-sm border border-slate-200">
            Vista Admin
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { label: "Citas de hoy", value: "7,265", delta: "+10.1%" },
            { label: "Pacientes nuevos", value: "3,671", delta: "-0.63%" },
            { label: "Tasa de asistencia", value: "256", delta: "+16.93%" },
            { label: "Ingresos del día", value: "2,318", delta: "+0.68%" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm"
            >
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
              <p className="text-xs text-emerald-600 mt-1">{item.delta}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Actividad del día</p>
            <span className="text-xs text-slate-500">Últimas 24h</span>
          </div>
          <div className="mt-4 h-36 rounded-xl bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-100 flex items-end gap-2 px-4 pb-3">
            {[32, 60, 48, 70, 44, 80, 52].map((height, idx) => (
              <div
                key={idx}
                style={{ height: `${height}%` }}
                className="flex-1 rounded-full bg-indigo-200"
              />
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Doctores con más agendamientos</p>
              <span className="text-xs text-slate-500">Top 5</span>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { name: "Isidora", value: 82 },
                { name: "Raúl", value: 74 },
                { name: "Lorena", value: 68 },
                { name: "Luciano", value: 55 },
                { name: "Agustina", value: 42 },
              ].map((doctor) => (
                <div key={doctor.name}>
                  <div className="flex items-center justify-between text-sm text-slate-700">
                    <span>{doctor.name}</span>
                    <span className="text-xs text-slate-500">{doctor.value}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-indigo-400 to-sky-300"
                      style={{ width: `${doctor.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Tratamientos más realizados</p>
              <span className="text-xs text-slate-500">Repartición %</span>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { label: "Odontología", value: 52.1 },
                { label: "Nutricionista", value: 13.13 },
                { label: "Cirugía menor", value: 69.69 },
                { label: "Sala de Médico", value: 11.11 },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-indigo-400" />
                    <p className="text-sm text-slate-700">{item.label}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{item.value}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
