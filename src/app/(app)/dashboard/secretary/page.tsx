export default function SecretaryDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">Panel de secretaria</p>
          <h1 className="text-2xl font-semibold text-slate-900">Coordinación diaria</h1>
        </div>
        <div className="text-xs text-slate-400">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 shadow-sm border border-slate-200">
            Vista Secretaria
          </span>
        </div>
      </div>

      <div className="rounded-[28px] bg-white border border-slate-100 shadow-sm p-8">
        <p className="text-sm font-semibold text-slate-900">Plantilla de correo</p>
        <p className="text-xs text-slate-500">Confirmación de pago y agendamiento</p>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Revitamed · Boleta</p>
              <p className="text-xs text-slate-500">Enviada a Ignacio Castillo</p>
            </div>
            <p className="text-xs text-slate-400 text-right">
              ID Boleta · #9125900835
              <br />
              Fecha · Feb 20, 2025, 8:00 AM
            </p>
          </div>

          <div className="mt-4 rounded-xl bg-white border border-slate-100">
            <div className="grid grid-cols-4 gap-3 px-5 py-3 text-xs text-slate-500 border-b border-slate-100">
              <span>Boleta para</span>
              <span>Método de pago</span>
              <span className="text-right">Monto total + IVA</span>
              <span className="text-right">Estado</span>
            </div>
            <div className="grid grid-cols-4 gap-3 px-5 py-4 text-sm text-slate-900">
              <span className="font-semibold">Ignacio Castillo</span>
              <span>Débito</span>
              <span className="text-right font-semibold">$40.000</span>
              <span className="text-right text-emerald-600 font-semibold">Pagado</span>
            </div>
            <div className="border-t border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Código</span>
                <span>Descripción</span>
                <span>Cantidad</span>
                <span className="text-right">Monto</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-800">
                <span>Bleu2738</span>
                <span className="text-slate-600">AG05 Baby High Waist</span>
                <span>1</span>
                <span className="text-right font-semibold">$37.942</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-900 font-semibold">
                <span>Total</span>
                <span className="text-right">$40.000</span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 text-xs text-slate-500">
            <span>+562 2347 2318</span>
            <span>contacto@revitamed.cl</span>
            <span className="text-right">La Concepción 241, piso 5, Providencia</span>
          </div>
        </div>
      </div>
    </div>
  );
}
