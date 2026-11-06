export const metadata = { title: "Votación · Concurso identidad", robots: { index: false, follow: false } };

/** Marcador: la página de votación de los gerentes se construye en la Fase 6. */
export default function VotarPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16 text-center">
      <div className="max-w-md space-y-3">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Concurso identidad</p>
        <h1 className="text-3xl font-semibold">Votación de gerentes</h1>
        <p className="text-muted-foreground">Esta página se habilitará cuando se abra la votación.</p>
      </div>
    </main>
  );
}
