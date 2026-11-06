/**
 * Corte del ranking en el top N y detección de empates (lógica pura, sin servidor).
 * `posicion` viene de rank(): las propuestas empatadas comparten posición.
 */
export type FilaRanking = { propuesta_id: string; posicion: number; promedio_general: number | null };

export type AnalisisCorte = {
  /** Propuestas que quedan dentro del corte por ranking (puede ser > topN si hay empate). */
  dentro: string[];
  /** Hay empate justo en el lugar de corte. */
  empate: boolean;
  /** Lugar (posición) donde ocurre el empate. */
  lugarEmpate: number | null;
  /** Propuestas empatadas en ese lugar. */
  empatadas: string[];
  /** Cuántas de las empatadas caben en el corte. */
  cupoEmpate: number;
};

export function analizarCorte(filas: FilaRanking[], topN: number): AnalisisCorte {
  const ordenadas = [...filas].sort((a, b) => a.posicion - b.posicion);
  const conVotos = ordenadas.filter((f) => f.promedio_general !== null);
  if (conVotos.length <= topN) {
    return { dentro: conVotos.map((f) => f.propuesta_id), empate: false, lugarEmpate: null, empatadas: [], cupoEmpate: 0 };
  }
  const lugarCorte = conVotos[topN - 1].posicion;
  const dentro = conVotos.filter((f) => f.posicion <= lugarCorte);
  const empatadas = conVotos.filter((f) => f.posicion === lugarCorte);
  const empate = dentro.length > topN;
  return {
    dentro: dentro.map((f) => f.propuesta_id),
    empate,
    lugarEmpate: empate ? lugarCorte : null,
    empatadas: empate ? empatadas.map((f) => f.propuesta_id) : [],
    cupoEmpate: empate ? topN - (dentro.length - empatadas.length) : 0,
  };
}

/** Empates dentro del Top N (p. ej. 2º y 3º con el mismo promedio). */
export function empatesDentro(filas: FilaRanking[], topN: number): number[] {
  const dentro = [...filas].filter((f) => f.promedio_general !== null).sort((a, b) => a.posicion - b.posicion).slice(0, topN);
  const conteo = new Map<number, number>();
  for (const f of dentro) conteo.set(f.posicion, (conteo.get(f.posicion) ?? 0) + 1);
  return [...conteo].filter(([, n]) => n > 1).map(([p]) => p);
}
