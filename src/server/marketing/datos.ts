// Acceso a datos del marketing del sitio (tablas Marketing* en Neon).
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SQL_EXPERIMENTO, SQL_LANDING, SQL_RESUMEN } from "./sql";
import { configAFront, experimentoAFront, landingAFront, eventoADb, type EventoEntrada } from "./mapeo";
import type { z } from "zod";
import type { ConfigEntrada, ExperimentoEntrada, LandingEntrada } from "./mapeo";

async function unValor<T>(sql: string, ...params: unknown[]): Promise<T> {
  const filas = await prisma.$queryRawUnsafe<{ r: T }[]>(sql, ...params);
  return filas[0]?.r as T;
}

// ── Configuración ──
export async function leerConfig() {
  const c = await prisma.marketingConfig.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return configAFront(c);
}

export async function guardarConfig(d: z.infer<typeof ConfigEntrada>) {
  const c = await prisma.marketingConfig.upsert({
    where: { id: 1 },
    update: { metaPixelId: d.meta_pixel_id, ga4Id: d.ga4_id, googleAdsId: d.google_ads_id, googleAdsLabel: d.google_ads_label, requireConsent: d.medicion_requiere_consentimiento },
    create: { id: 1, metaPixelId: d.meta_pixel_id, ga4Id: d.ga4_id, googleAdsId: d.google_ads_id, googleAdsLabel: d.google_ads_label, requireConsent: d.medicion_requiere_consentimiento },
  });
  return configAFront(c);
}

// ── Experimentos ──
export async function listarExperimentos() {
  return (await prisma.marketingExperiment.findMany({ orderBy: { createdAt: "desc" } })).map(experimentoAFront);
}

export async function experimentosActivos() {
  const lista = await prisma.marketingExperiment.findMany({ where: { status: "activo" }, select: { id: true, page: true, type: true, variants: true } });
  return lista.map((e) => ({ id: e.id, pagina: e.page, tipo: e.type, variantes: e.variants }));
}

export async function guardarExperimento(d: z.infer<typeof ExperimentoEntrada>) {
  const datos = {
    name: d.nombre,
    page: d.pagina,
    type: d.tipo,
    status: d.estado,
    goal: d.objetivo,
    variants: d.variantes as Prisma.InputJsonValue,
    winner: d.ganador ?? null,
    startedAt: d.inicio ? new Date(d.inicio) : null,
    endedAt: d.fin ? new Date(d.fin) : null,
  };
  const e = d.id
    ? await prisma.marketingExperiment.update({ where: { id: d.id }, data: datos })
    : await prisma.marketingExperiment.create({ data: datos });
  return experimentoAFront(e);
}

export async function borrarExperimento(id: string) {
  await prisma.marketingExperiment.delete({ where: { id } });
}

export async function statsExperimento(id: string) {
  const e = await prisma.marketingExperiment.findUnique({ where: { id }, select: { goal: true } });
  if (!e) throw new Error("Test no encontrado.");
  return (await unValor<unknown[]>(SQL_EXPERIMENTO, id, e.goal)) ?? [];
}

// ── Landings ──
export async function listarLandings() {
  return (await prisma.marketingLanding.findMany({ orderBy: { createdAt: "desc" } })).map(landingAFront);
}

export async function landingPublicada(slug: string) {
  const l = await prisma.marketingLanding.findFirst({ where: { slug, published: true } });
  return l ? landingAFront(l) : null;
}

export async function guardarLanding(d: z.infer<typeof LandingEntrada>) {
  const datos = {
    slug: d.slug,
    title: d.titulo,
    subtitle: d.bajada,
    videoUrl: d.video_url,
    bullets: d.puntos as Prisma.InputJsonValue,
    ctaText: d.cta_texto,
    ctaAction: d.cta_accion,
    ctaLink: d.cta_link,
    ctaMessage: d.cta_mensaje,
    note: d.nota,
    published: d.publicada,
  };
  try {
    const l = d.id
      ? await prisma.marketingLanding.update({ where: { id: d.id }, data: datos })
      : await prisma.marketingLanding.create({ data: datos });
    return landingAFront(l);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Ya existe una landing con esa dirección.");
    }
    throw error;
  }
}

export async function borrarLanding(id: string) {
  await prisma.marketingLanding.delete({ where: { id } });
}

export async function statsLanding(ruta: string, desde: Date, hasta: Date) {
  return unValor<Record<string, unknown>>(SQL_LANDING, ruta, desde, hasta);
}

// ── Eventos y resumen ──
export async function registrarEventos(lista: z.infer<typeof EventoEntrada>[]) {
  if (!lista.length) return 0;
  const r = await prisma.marketingEvent.createMany({ data: lista.map(eventoADb) });
  return r.count;
}

export async function resumen(desde: Date, hasta: Date) {
  return unValor<Record<string, unknown>>(SQL_RESUMEN, desde, hasta);
}
