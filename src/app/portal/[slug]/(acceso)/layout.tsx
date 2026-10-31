import { notFound, redirect } from "next/navigation";
import { CalendarPlus, ClipboardList, Wallet } from "lucide-react";
import ZensyaLogo from "@/presentation/portal/ZensyaLogo";
import { resolvePortalClinic } from "@/server/portal/PortalAuthService";
import { readPortalSession } from "@/server/portal/portalSession";

export const dynamic = "force-dynamic";

export default async function PortalAccessLayout({ children, params }: { children: React.ReactNode; params: { slug: string } }) {
  const clinic = await resolvePortalClinic(params.slug);
  if (!clinic) notFound();
  const session = await readPortalSession();
  if (session && session.clinicId === clinic.clinicId) redirect(`/portal/${params.slug}`);

  const perks = [
    { icon: CalendarPlus, text: "Reserva, confirma o cancela tus horas" },
    { icon: ClipboardList, text: "Revisa tu historial y tus exámenes" },
    { icon: Wallet, text: "Mira tus pagos y tu tratamiento" },
  ];

  return (
    <div className="auth">
      <aside className="auth-art">
        <div className="brand">
          <ZensyaLogo size={40} />
          <div>
            <b>{clinic.name}</b>
            <small>Portal del paciente</small>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <ZensyaLogo size={120} className="big-logo" />
          <h1>
            Tu salud, <span className="accent">en un solo lugar</span>
          </h1>
          <ul>
            {perks.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span className="icon">
                  <Icon size={17} strokeWidth={1.8} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="small">Con la tecnología de Zensya</p>
      </aside>
      <div className="auth-form">{children}</div>
    </div>
  );
}
