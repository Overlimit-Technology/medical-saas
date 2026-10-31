import type { Metadata } from "next";
import "@/presentation/portal/portal.css";

export const metadata: Metadata = {
  title: "Portal del paciente",
  robots: { index: false, follow: false },
};

// El tema claro es el de siempre. Solo si el paciente eligio el oscuro con el boton se aplica antes de pintar.
const themeScript =
  "try{if(localStorage.getItem('zensya-portal-theme')==='dark')document.getElementById('zp-root').dataset.theme='dark'}catch(e){}";

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="zp-root" className="zp" data-theme="light" suppressHydrationWarning>
      {/* Syne y Lexend, las tipografias de zensya.cl */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;600&family=Syne:wght@400;500;600;700&display=swap"
      />
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      {children}
    </div>
  );
}
