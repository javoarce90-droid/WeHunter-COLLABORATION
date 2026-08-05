import { JobMarkdown } from "./markdown";

export type JobPostingBenefit = { name: string; description: string };

/**
 * Contenido de un aviso de búsqueda (título + chips + secciones + beneficios) — la misma vista
 * que ve un candidato en el career site. Presentacional puro, sin dependencias de servidor:
 * lo usan tanto la lectura pública (`PublicJobDetail`) como la vista previa en vivo del editor
 * de la tab Aviso (`AvisoEditor`, cliente), para no mantener el mismo markup en dos lugares.
 */
export function JobPostingContent({
  title,
  position,
  chips = [],
  objectives,
  responsibilities,
  requirements,
  benefits,
  emptyMessage = "Esta búsqueda todavía no tiene una descripción detallada.",
}: {
  title: string;
  position?: string | null;
  chips?: string[];
  objectives: string | null;
  responsibilities: string | null;
  requirements: string | null;
  benefits: JobPostingBenefit[] | null;
  emptyMessage?: string;
}) {
  const sections = [
    { title: "Objetivos del puesto", body: objectives },
    { title: "Responsabilidades", body: responsibilities },
    { title: "Requisitos", body: requirements },
  ].filter((s): s is { title: string; body: string } => !!s.body?.trim());
  const hasBenefits = (benefits?.length ?? 0) > 0;

  return (
    <>
      <header className="mb-6 border-b border-border pb-5">
        <h1 className="font-display text-2xl font-bold text-text">{title}</h1>
        {position && <p className="mt-1 text-sm font-medium text-muted">{position}</p>}
        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span
                key={c}
                className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary-hover"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </header>

      {sections.length > 0 || hasBenefits ? (
        <div className="flex flex-col gap-6">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="mb-1.5 text-sm font-bold text-text">{s.title}</h2>
              <div className="max-w-[70ch] text-sm leading-relaxed text-text/80">
                <JobMarkdown text={s.body} />
              </div>
            </section>
          ))}
          {hasBenefits && (
            <section>
              <h2 className="mb-2 text-sm font-bold text-text">Beneficios</h2>
              <ul className="flex flex-col gap-1.5">
                {benefits!.map((b, i) => (
                  <li key={i} className="text-sm text-text/80">
                    <span className="font-semibold text-text">{b.name}</span>
                    {b.description ? ` — ${b.description}` : null}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">{emptyMessage}</p>
      )}
    </>
  );
}
