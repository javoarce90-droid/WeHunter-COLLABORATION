import type { OrgReport } from "../domain/org-report";

const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

/** Tendencia de postulaciones por semana. Área + línea en SVG, sin librerías. */
export function TrendChart({ trends }: { trends: OrgReport["trends"] }) {
  const total = trends.reduce((s, t) => s + t.count, 0);

  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-text">Postulaciones por semana</h2>
        <span className="text-xs text-muted">
          <span className="font-semibold text-text tabular-nums">{total}</span> en el período
        </span>
      </div>

      {trends.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No hay postulaciones en el período seleccionado.
        </p>
      ) : (
        <Chart trends={trends} />
      )}
    </section>
  );
}

function Chart({ trends }: { trends: OrgReport["trends"] }) {
  const W = 720;
  const H = 160;
  const pad = { top: 10, right: 8, bottom: 22, left: 8 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = Math.max(1, ...trends.map((t) => t.count));
  const n = trends.length;

  // x equiespaciado; si hay un solo punto, lo centramos.
  const x = (i: number) => (n === 1 ? W / 2 : pad.left + (i / (n - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  const linePts = trends.map((t, i) => `${x(i)},${y(t.count)}`).join(" ");
  const areaPath =
    `M ${x(0)},${pad.top + innerH} ` +
    trends.map((t, i) => `L ${x(i)},${y(t.count)}`).join(" ") +
    ` L ${x(n - 1)},${pad.top + innerH} Z`;

  // Etiquetas de eje: primera, última y la del medio (evita amontonar).
  const labelIdx = new Set([0, Math.floor((n - 1) / 2), n - 1]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-44 w-full"
      role="img"
      aria-label={`Tendencia de postulaciones por semana, máximo ${max}`}
      preserveAspectRatio="none"
    >
      <path d={areaPath} fill="var(--primary)" fillOpacity="0.1" />
      <polyline
        points={linePts}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* Sin markers de punto: con preserveAspectRatio="none" se deformarían a elipses.
          El área + línea + labels comunican la tendencia sin distorsión. */}
      {trends.map((t, i) =>
        labelIdx.has(i) ? (
          <text
            key={`l-${i}`}
            x={x(i)}
            y={H - 6}
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            className="fill-[var(--muted)] text-[10px]"
          >
            {dateFmt.format(new Date(t.week + "T00:00:00"))}
          </text>
        ) : null,
      )}
    </svg>
  );
}
