export default function DashboardPage() {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-3xl bg-white border border-neutral-100 shadow-lg p-8">
          <h1 className="text-2xl font-semibold text-neutral-900">
            ✅ Inicio de sesión exitoso
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Si estás viendo esto, significa que tu cookie de sesión existe y la ruta está protegida.
          </p>
  
          <div className="mt-6 rounded-2xl bg-neutral-50 border border-neutral-200 p-4">
            <p className="text-sm text-neutral-700">
              Próximo paso: reemplazar esto por el layout real del panel (sidebar, rutas por rol, etc.).
            </p>
          </div>
  
          <form action="/api/auth/logout" method="post" className="mt-6">
            <button
              type="submit"
              className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-900"
            >
              Cerrar sesión (logout)
            </button>
          </form>
        </div>
      </div>
    );
  }
  