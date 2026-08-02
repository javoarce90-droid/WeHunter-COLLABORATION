/**
 * Vista previa embebida del Career Site. No es una maqueta aparte: es un iframe de la misma
 * ruta pública (`/careers/{slug}`) que ve el candidato — mismo diseño, siempre en sync, sin
 * duplicar el markup del sitio público acá.
 */
export function CareerSitePreview({ slug }: { slug: string }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border shadow-[var(--shadow)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-bg px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <div className="ml-2 flex-1 truncate rounded-md border border-border bg-surface px-2.5 py-1 text-[11px] text-muted">
          /careers/{slug}
        </div>
      </div>
      <iframe
        src={`/careers/${slug}`}
        title="Vista previa del Career Site"
        className="h-[480px] w-full bg-bg"
      />
    </div>
  );
}
