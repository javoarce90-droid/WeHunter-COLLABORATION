/** Banda persuasiva de apertura: en modo Persuade el primer viewport tiene que vender la
 *  propuesta, no ser un título genérico de sección. */
export function CommunityIntro() {
  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-12 text-center">
        <h1 className="font-display text-2xl font-bold text-text sm:text-3xl">
          Conectá con recruiters y consultoras que ya confían en WeHunter
        </h1>
        <p className="max-w-2xl text-sm text-muted sm:text-base">
          Encontrá al profesional de selección que tu búsqueda necesita y contactalo directo,
          sin intermediarios.
        </p>
      </div>
    </div>
  );
}
