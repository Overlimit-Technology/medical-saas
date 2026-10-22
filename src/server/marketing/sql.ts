// Consultas de estadísticas del marketing del sitio (tabla "MarketingEvent").
// Devuelven un solo valor JSON ("r") para que el dashboard reciba todo listo en una llamada.
// $1/$2 = desde/hasta (timestamps). Las visitas internas (/admin) se excluyen.

export const SQL_RESUMEN = `
with e as (
  select * from "MarketingEvent" where "createdAt" >= $1 and "createdAt" < $2 and "path" not like '/admin%'
),
conv as (select distinct "visitorId" from e where "type" = 'conversion')
select jsonb_build_object(
  'visitas', (select count(*) from e where "type" = 'visita'),
  'visitantes', (select count(distinct "visitorId") from e where "type" = 'visita'),
  'sesiones', (select count(distinct "sessionId") from e where "type" = 'visita'),
  'conversiones', (select count(*) from e where "type" = 'conversion'),
  'convertidos', (select count(*) from conv),
  'por_dia', coalesce((
    select jsonb_agg(x order by x->>'dia') from (
      select jsonb_build_object('dia', to_char(date_trunc('day', ("createdAt" at time zone 'UTC') at time zone 'America/Santiago'), 'YYYY-MM-DD'),
        'visitas', count(*) filter (where "type" = 'visita'),
        'visitantes', count(distinct "visitorId") filter (where "type" = 'visita'),
        'conversiones', count(*) filter (where "type" = 'conversion')) x
      from e group by date_trunc('day', ("createdAt" at time zone 'UTC') at time zone 'America/Santiago')) d), '[]'::jsonb),
  'paginas', coalesce((
    select jsonb_agg(x order by (x->>'visitas')::int desc) from (
      select jsonb_build_object('ruta', "path",
        'visitas', count(*) filter (where "type" = 'visita'),
        'visitantes', count(distinct "visitorId") filter (where "type" = 'visita'),
        'conversiones', count(*) filter (where "type" = 'conversion')) x
      from e group by "path") p), '[]'::jsonb),
  'fuentes', coalesce((
    select jsonb_agg(x order by (x->>'visitantes')::int desc) from (
      select jsonb_build_object('fuente', fuente, 'visitantes', count(distinct "visitorId"),
        'convertidos', count(distinct "visitorId") filter (where "visitorId" in (select "visitorId" from conv))) x
      from (select "visitorId", coalesce(nullif("utmSource", ''),
              case when coalesce("referrer", '') = '' then 'directo'
                   else split_part(regexp_replace("referrer", '^https?://(www\\.)?', ''), '/', 1) end) fuente
            from e where "type" = 'visita') f
      group by fuente) s), '[]'::jsonb),
  'campanas', coalesce((
    select jsonb_agg(x order by (x->>'visitantes')::int desc) from (
      select jsonb_build_object('campana', "utmCampaign", 'visitantes', count(distinct "visitorId"),
        'convertidos', count(distinct "visitorId") filter (where "visitorId" in (select "visitorId" from conv))) x
      from e where "type" = 'visita' and coalesce("utmCampaign", '') <> '' group by "utmCampaign") c), '[]'::jsonb),
  'dispositivos', coalesce((
    select jsonb_agg(jsonb_build_object('dispositivo', coalesce("device", 'otro'), 'visitantes', n)) from (
      select "device", count(distinct "visitorId") n from e where "type" = 'visita' group by "device") d), '[]'::jsonb),
  'objetivos', coalesce((
    select jsonb_agg(jsonb_build_object('objetivo', coalesce("label", 'otro'), 'conversiones', n) order by n desc) from (
      select "label", count(*) n from e where "type" = 'conversion' group by "label") o), '[]'::jsonb)
) as r`;

// $1 = id del experimento, $2 = objetivo ('cualquiera' o la etiqueta de conversión)
export const SQL_EXPERIMENTO = `
with expo as (
  select "visitorId", min("variant") variante, min("createdAt") primera
  from "MarketingEvent" where "type" = 'ab_exposicion' and "experimentId" = $1 group by "visitorId"
),
conv as (
  select distinct x."visitorId" from expo x
  join "MarketingEvent" c on c."visitorId" = x."visitorId" and c."type" = 'conversion' and c."createdAt" >= x.primera
    and ($2 = 'cualquiera' or c."label" = $2)
)
select coalesce(jsonb_agg(jsonb_build_object('variante', variante, 'visitantes', n, 'convertidos', k) order by variante), '[]'::jsonb) as r
from (select x.variante, count(*) n, count(c."visitorId") k from expo x left join conv c using ("visitorId") group by x.variante) t`;

// $1 = ruta de la landing (/l/slug), $2/$3 = desde/hasta
export const SQL_LANDING = `
with e as (select * from "MarketingEvent" where "path" = $1 and "createdAt" >= $2 and "createdAt" < $3)
select jsonb_build_object(
  'visitantes', (select count(distinct "visitorId") from e where "type" = 'visita'),
  'reproducciones', (select count(distinct "visitorId") from e where "type" = 'video' and "label" = 'play'),
  'video_25', (select count(distinct "visitorId") from e where "type" = 'video' and "label" = '25'),
  'video_50', (select count(distinct "visitorId") from e where "type" = 'video' and "label" = '50'),
  'video_75', (select count(distinct "visitorId") from e where "type" = 'video' and "label" = '75'),
  'video_100', (select count(distinct "visitorId") from e where "type" = 'video' and "label" = '100'),
  'convertidos', (select count(distinct "visitorId") from e where "type" = 'conversion'),
  'fuentes', coalesce((select jsonb_agg(jsonb_build_object('fuente', f, 'visitantes', n) order by n desc) from (
     select coalesce(nullif("utmSource", ''), 'directo') f, count(distinct "visitorId") n from e where "type" = 'visita' group by 1) s), '[]'::jsonb)
) as r`;
