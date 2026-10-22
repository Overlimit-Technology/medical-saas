// Traduce entre las tablas de marketing (Prisma, camelCase en inglés) y el formato que usan el dashboard
// y el sitio zensya.cl (claves en español). Así el sitio y el panel no dependen de los nombres de columnas.
import type { MarketingConfig, MarketingExperiment, MarketingLanding } from "@prisma/client";
import { z } from "zod";

export const configAFront = (c: MarketingConfig) => ({
  meta_pixel_id: c.metaPixelId,
  ga4_id: c.ga4Id,
  google_ads_id: c.googleAdsId,
  google_ads_label: c.googleAdsLabel,
  medicion_requiere_consentimiento: c.requireConsent,
  actualizado: c.updatedAt.toISOString(),
});

export const experimentoAFront = (e: MarketingExperiment) => ({
  id: e.id,
  nombre: e.name,
  pagina: e.page,
  tipo: e.type,
  estado: e.status,
  objetivo: e.goal,
  variantes: e.variants,
  ganador: e.winner,
  inicio: e.startedAt?.toISOString() ?? null,
  fin: e.endedAt?.toISOString() ?? null,
  creado: e.createdAt.toISOString(),
  actualizado: e.updatedAt.toISOString(),
});

export const landingAFront = (l: MarketingLanding) => ({
  id: l.id,
  slug: l.slug,
  titulo: l.title,
  bajada: l.subtitle,
  video_url: l.videoUrl,
  puntos: l.bullets,
  cta_texto: l.ctaText,
  cta_accion: l.ctaAction,
  cta_link: l.ctaLink,
  cta_mensaje: l.ctaMessage,
  nota: l.note,
  publicada: l.published,
  creado: l.createdAt.toISOString(),
  actualizado: l.updatedAt.toISOString(),
});

const texto = (max: number) => z.string().trim().max(max);
const fecha = z.string().datetime({ offset: true }).nullable().optional();

export const ConfigEntrada = z.object({
  meta_pixel_id: z.string().trim().regex(/^(\d{10,20})?$/, "ID de Meta inválido"),
  ga4_id: z.string().trim().regex(/^(G-[A-Z0-9]{4,})?$/, "ID de Google Analytics inválido"),
  google_ads_id: z.string().trim().regex(/^(AW-\d{6,})?$/, "ID de Google Ads inválido"),
  google_ads_label: z.string().trim().regex(/^([\w-]{6,})?$/, "Etiqueta de Google Ads inválida"),
  medicion_requiere_consentimiento: z.boolean(),
});

const Variante = z.object({
  clave: z.string().regex(/^[A-D]$/),
  nombre: texto(80),
  peso: z.number().min(0).max(100),
  cambios: z.array(z.object({ elemento: texto(200), texto: texto(500) })).max(10).optional().default([]),
  url: texto(300).optional(),
});

export const ExperimentoEntrada = z.object({
  id: z.string().optional(),
  nombre: texto(140).min(1, "Ponle un nombre al test."),
  pagina: texto(300).regex(/^\//, "La página debe empezar con /"),
  tipo: z.enum(["contenido", "url"]),
  estado: z.enum(["borrador", "activo", "pausado", "terminado"]),
  objetivo: texto(40),
  variantes: z.array(Variante).min(1).max(4),
  ganador: z.string().nullable().optional(),
  inicio: fecha,
  fin: fecha,
});

export const LandingEntrada = z.object({
  id: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "La dirección solo puede tener minúsculas, números y guiones."),
  titulo: texto(200).min(1, "Escribe el título de la landing."),
  bajada: texto(500).default(""),
  video_url: texto(500).default(""),
  puntos: z.array(texto(200)).max(12).default([]),
  cta_texto: texto(80).min(1),
  cta_accion: z.enum(["whatsapp", "link"]),
  cta_link: texto(500).default(""),
  cta_mensaje: texto(500).default(""),
  nota: texto(200).default(""),
  publicada: z.boolean(),
});

const opcional = (max: number) => z.string().max(max).nullable().optional();
// Evento que envía el sitio (lib/medicion.js)
export const EventoEntrada = z.object({
  visitante: z.string().min(8).max(64),
  sesion: opcional(64),
  tipo: z.enum(["visita", "clic", "conversion", "ab_exposicion", "video"]),
  ruta: z.string().min(1).max(300),
  etiqueta: opcional(120),
  experimento: opcional(40),
  variante: opcional(20),
  utm_source: opcional(120),
  utm_medium: opcional(120),
  utm_campaign: opcional(160),
  referente: opcional(300),
  dispositivo: z.enum(["escritorio", "tablet", "celular"]).nullable().optional(),
  extra: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const eventoADb = (e: z.infer<typeof EventoEntrada>) => ({
  visitorId: e.visitante,
  sessionId: e.sesion ?? null,
  type: e.tipo,
  path: e.ruta,
  label: e.etiqueta ?? null,
  experimentId: e.experimento ?? null,
  variant: e.variante ?? null,
  utmSource: e.utm_source ?? null,
  utmMedium: e.utm_medium ?? null,
  utmCampaign: e.utm_campaign ?? null,
  referrer: e.referente ?? null,
  device: e.dispositivo ?? null,
  extra: (e.extra as object | null | undefined) ?? undefined,
});

export const primerError = (error: z.ZodError) => error.issues[0]?.message ?? "Datos inválidos.";
