-- =============================================================================
-- Se quita el criterio «Alineación con la visión».
-- La votación queda con 3 criterios: Creatividad, Impacto visual y Claridad del mensaje.
-- No se borra la fila (hay calificaciones que la referencian): solo se desactiva.
-- Todo filtra por criterios.activo (envío del voto, trigger, resultados_ronda y /votar),
-- así que las calificaciones de ese criterio dejan de pedirse y de contar.
-- =============================================================================

update public.criterios
set activo = false
where nombre = 'Alineación con la visión';
