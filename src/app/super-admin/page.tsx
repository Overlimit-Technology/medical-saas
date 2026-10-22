import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SuperAdminInicio from "@/presentation/superadmin/SuperAdminInicio";
import { requireAuthSession } from "@/server/auth/requireSession";
import { resumen } from "@/server/marketing/datos";

const formato = (n: number) => new Intl.NumberFormat("es-CL").format(n);

// Inicio del super-admin (a donde llega después de entrar): elige entre Marketing y Clínicas
export default async function SuperAdminInicioPage() {
  const session = await requireAuthSession();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }

  const hasta = new Date();
  const desde = new Date(hasta.getTime() - 7 * 86400000);
  const [perfil, clinicasActivas, usuarios, sitio] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: session.userId }, select: { firstName: true } }),
    prisma.clinic.count({ where: { isActive: true } }),
    prisma.user.count(),
    // Si todavía no se corrió la migración de marketing, el inicio igual carga
    resumen(desde, hasta).catch(() => null),
  ]);

  const r = sitio as { visitantes?: number; convertidos?: number } | null;
  return (
    <SuperAdminInicio
      data={{
        nombre: perfil?.firstName?.trim() || "Super Admin",
        marketing: [
          { valor: r ? formato(r.visitantes ?? 0) : "—", etiqueta: "visitantes en 7 días" },
          { valor: r ? formato(r.convertidos ?? 0) : "—", etiqueta: "contactos en 7 días" },
        ],
        clinicas: [
          { valor: formato(clinicasActivas), etiqueta: "clínicas activas" },
          { valor: formato(usuarios), etiqueta: "usuarios" },
        ],
      }}
    />
  );
}
