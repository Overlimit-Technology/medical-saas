import MarcoMarketing from "@/presentation/superadmin/marketing/Contexto";

// Marketing del sitio zensya.cl dentro del super-admin: pestañas y período compartidos por todas las secciones
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <MarcoMarketing>{children}</MarcoMarketing>;
}
