-- =============================================================================
-- Vista de resultados por ronda y función de posibles duplicados
-- =============================================================================

-- resultados_ronda: por ronda y propuesta → promedio general, promedio por
-- criterio, número de gerentes que calificaron y posición en el ranking.
-- security_invoker: respeta el RLS de quien consulta (admins o service role).
create or replace view public.resultados_ronda
with (security_invoker = true)
as
with por_criterio as (
  select
    c.ronda_id,
    c.propuesta_id,
    c.criterio_id,
    avg(c.puntaje)::numeric      as promedio,
    count(*)::integer            as calificaciones
  from public.calificaciones c
  join public.criterios cr on cr.id = c.criterio_id and cr.activo
  group by c.ronda_id, c.propuesta_id, c.criterio_id
),
por_propuesta as (
  select
    rp.ronda_id,
    rp.propuesta_id,
    rp.posicion_final,
    (select round(avg(c.puntaje)::numeric, 2)
       from public.calificaciones c
       join public.criterios cr on cr.id = c.criterio_id and cr.activo
      where c.ronda_id = rp.ronda_id and c.propuesta_id = rp.propuesta_id) as promedio_general,
    (select count(distinct c.votante_id)::integer
       from public.calificaciones c
      where c.ronda_id = rp.ronda_id and c.propuesta_id = rp.propuesta_id) as gerentes_calificaron,
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'criterio_id', cr.id,
               'criterio',    cr.nombre,
               'orden',       cr.orden,
               'promedio',    round(pc.promedio, 2),
               'calificaciones', pc.calificaciones
             ) order by cr.orden)
        from public.criterios cr
        join por_criterio pc
          on pc.criterio_id = cr.id
         and pc.ronda_id = rp.ronda_id
         and pc.propuesta_id = rp.propuesta_id
       where cr.activo
    ), '[]'::jsonb) as promedio_por_criterio
  from public.ronda_propuestas rp
)
select
  pp.ronda_id,
  r.numero          as ronda_numero,
  pp.propuesta_id,
  p.folio,
  p.nombre_propuesto,
  p.participante_nombre,
  p.estado          as propuesta_estado,
  pp.promedio_general,
  pp.promedio_por_criterio,
  pp.gerentes_calificaron,
  rank() over (
    partition by pp.ronda_id
    order by pp.promedio_general desc nulls last
  )::integer        as posicion,
  pp.posicion_final
from por_propuesta pp
join public.rondas r     on r.id = pp.ronda_id
join public.propuestas p on p.id = pp.propuesta_id;

comment on view public.resultados_ronda is
  'Ranking por ronda. posicion usa rank() (empates comparten lugar); posicion_final es la decisión registrada por admins.';

-- buscar_posibles_duplicados: mismo participante o nombre propuesto parecido
-- (ignora mayúsculas y acentos). security invoker → respeta RLS (solo admins).
create or replace function public.buscar_posibles_duplicados(
  p_participante     text,
  p_nombre_propuesto text,
  p_excluir_id       uuid default null
)
returns table (
  id                  uuid,
  folio               integer,
  participante_nombre text,
  nombre_propuesto    text,
  estado              text,
  motivo              text,
  similitud           real
)
language sql
stable
set search_path = ''
as $$
  with normal as (
    select
      lower(extensions.unaccent(btrim(coalesce(p_participante, ''))))     as part,
      lower(extensions.unaccent(btrim(coalesce(p_nombre_propuesto, '')))) as nom
  )
  select
    p.id,
    p.folio,
    p.participante_nombre,
    p.nombre_propuesto,
    p.estado,
    case
      when extensions.similarity(lower(extensions.unaccent(p.nombre_propuesto)), n.nom) >= 0.45
        then 'nombre_similar'
      else 'mismo_participante'
    end as motivo,
    greatest(
      extensions.similarity(lower(extensions.unaccent(p.nombre_propuesto)), n.nom),
      extensions.similarity(lower(extensions.unaccent(p.participante_nombre)), n.part)
    ) as similitud
  from public.propuestas p
  cross join normal n
  where (p_excluir_id is null or p.id <> p_excluir_id)
    and (
      (n.nom  <> '' and extensions.similarity(lower(extensions.unaccent(p.nombre_propuesto)), n.nom) >= 0.45)
      or
      (n.part <> '' and extensions.similarity(lower(extensions.unaccent(p.participante_nombre)), n.part) >= 0.6)
    )
  order by similitud desc
  limit 10;
$$;
