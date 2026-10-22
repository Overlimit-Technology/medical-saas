// Inicio del super-admin: después de entrar con correo y contraseña se elige el espacio de trabajo.
//   · Marketing y sitio web (zensya.cl): visitas, tests A/B, campañas y VSL, pixeles
//   · Clínicas: la administración de la plataforma (clínicas, usuarios, roles, módulos, trials, recursos)
import Link from "next/link";
import { ArrowRight, Building2, Megaphone } from "lucide-react";
import "./marketing/marketing.css";

type Dato = { valor: string; etiqueta: string };

export type InicioData = {
  nombre: string;
  marketing: Dato[];
  clinicas: Dato[];
};

function Estadisticas({ datos }: { datos: Dato[] }) {
  return (
    <div className="mk-hub-stats">
      {datos.map((d) => (
        <div key={d.etiqueta}>
          <b>{d.valor}</b>
          <span>{d.etiqueta}</span>
        </div>
      ))}
    </div>
  );
}

export default function SuperAdminInicio({ data }: { data: InicioData }) {
  return (
    <div className="mk-hub">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Super Admin</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal text-slate-950">Hola, {data.nombre}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">¿Qué quieres administrar hoy?</p>
      </div>
      <div className="mk-hub-cards">
        <Link href="/super-admin/marketing" className="mk-hub-card">
          <span className="mk-hub-ico"><Megaphone size={26} aria-hidden="true" /></span>
          <div>
            <h2>Marketing y sitio web</h2>
            <p>Visitas de zensya.cl, tests A/B, landings de campaña con video, links con seguimiento y pixeles de Meta y Google.</p>
          </div>
          <div className="mk-hub-links"><span>Resumen</span><span>Páginas</span><span>Tests A/B</span><span>Campañas y VSL</span><span>Pixeles</span></div>
          <Estadisticas datos={data.marketing} />
          <span className="mk-hub-ir">Entrar a marketing <ArrowRight size={16} aria-hidden="true" /></span>
        </Link>
        <Link href="/super-admin/resumen" className="mk-hub-card is-dark">
          <span className="mk-hub-ico"><Building2 size={26} aria-hidden="true" /></span>
          <div>
            <h2>Clínicas</h2>
            <p>La administración de la plataforma: clínicas, usuarios, roles y permisos, acceso a módulos, trials y recursos.</p>
          </div>
          <div className="mk-hub-links"><span>Overview</span><span>Clínicas</span><span>Usuarios</span><span>Roles</span><span>Módulos</span><span>Trials</span></div>
          <Estadisticas datos={data.clinicas} />
          <span className="mk-hub-ir">Entrar a clínicas <ArrowRight size={16} aria-hidden="true" /></span>
        </Link>
      </div>
    </div>
  );
}
