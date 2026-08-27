"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/lib/toast";
import { procesarUnCvParaPoolAction } from "../actions";

type RowStatus = "queued" | "processing" | "created" | "duplicate" | "failed";

type Row = {
  index: number;
  fileName: string;
  status: RowStatus;
  detail?: string;
  candidateId?: string;
};

const CONCURRENCY = 3;

type Props = {
  files: File[];
  open: boolean;
  /** Cerrar el modal — solo se llama desde los botones explícitos del resumen. */
  onClose: () => void;
  /** Se llama al terminar cada corrida — para refrescar el listado de candidatos. */
  onFinished: () => void;
};

export function CvBatchProgressDialog({ files, open, onClose, onFinished }: Props) {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [quotaHit, setQuotaHit] = useState(false);
  const startedRef = useRef(false);
  const runIdRef = useRef(0);

  // Corre el pool (concurrencia limitada) sobre un subconjunto de índices — toda la tanda al
  // abrir, o solo los que fallaron al reintentar.
  function run(indices: number[]) {
    if (indices.length === 0) return;
    const myRun = ++runIdRef.current;
    setRunning(true);
    setRows((prev) =>
      prev.map((r) => (indices.includes(r.index) ? { ...r, status: "queued", detail: undefined } : r)),
    );

    const queue = [...indices];
    const counts = { created: 0, duplicate: 0, failed: 0 };
    // Si la IA se queda sin cuota, los CVs que faltan van a fallar todos igual — cortamos la
    // tanda y marcamos el resto como "no procesado" en vez de una pared de errores.
    let quotaHit = false;
    setQuotaHit(false);

    const worker = async () => {
      for (;;) {
        const i = queue.length > 0 ? queue.shift()! : -1;
        if (i === -1) return;
        if (quotaHit) {
          setRows((prev) =>
            prev.map((r) =>
              r.index === i ? { ...r, status: "failed", detail: "Sin procesar — cuota de IA agotada." } : r,
            ),
          );
          counts.failed += 1;
          continue;
        }
        setRows((prev) => prev.map((r) => (r.index === i ? { ...r, status: "processing" } : r)));

        let row: Omit<Row, "index" | "fileName">;
        try {
          const fd = new FormData();
          fd.set("cv", files[i]);
          const { outcome } = await procesarUnCvParaPoolAction(fd);
          if (outcome.status === "failed" && outcome.quotaExhausted) {
            quotaHit = true;
            setQuotaHit(true);
          }
          row =
            outcome.status === "created"
              ? { status: "created", detail: outcome.candidateName, candidateId: outcome.candidateId }
              : outcome.status === "skipped_duplicate"
                ? { status: "duplicate", detail: outcome.candidateName, candidateId: outcome.candidateId }
                : { status: "failed", detail: outcome.reason };
        } catch {
          row = { status: "failed", detail: "No se pudo procesar." };
        }
        counts[row.status === "created" ? "created" : row.status === "duplicate" ? "duplicate" : "failed"] += 1;
        setRows((prev) => prev.map((r) => (r.index === i ? { ...r, ...row } : r)));
        setAnnounce(
          `${files[i].name}: ${
            row.status === "created"
              ? "candidato agregado"
              : row.status === "duplicate"
                ? "ya estaba en el pool"
                : "no se pudo leer"
          }`,
        );
      }
    };

    Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker)).finally(() => {
      // Otra corrida ya empezó (ej. reintento, o el doble-invoke de StrictMode) — esta quedó vieja.
      if (runIdRef.current !== myRun) return;
      setRunning(false);
      onFinished();
      const parts = [
        counts.created > 0 &&
          `${counts.created} candidato${counts.created !== 1 ? "s" : ""} nuevo${counts.created !== 1 ? "s" : ""}`,
        counts.duplicate > 0 && `${counts.duplicate} ya en el pool`,
        counts.failed > 0 && `${counts.failed} sin procesar`,
      ].filter(Boolean);
      toast({
        message: parts.join(" · ") || "No se agregó ningún candidato",
        variant: counts.created > 0 ? "success" : "default",
        duration: 12000,
      });
    });
  }

  useEffect(() => {
    if (!open || startedRef.current || files.length === 0) return;
    startedRef.current = true;
    setRows(files.map((f, i) => ({ index: i, fileName: f.name, status: "queued" })));
    run(files.map((_, i) => i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, files]);

  useEffect(() => {
    if (!open) startedRef.current = false;
  }, [open]);

  // El navegador avisa si el recruiter intenta cerrar la pestaña mientras se procesa la tanda.
  useEffect(() => {
    if (!running) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const tally = useMemo(() => {
    const settled = rows.filter((r) => r.status !== "queued" && r.status !== "processing");
    return {
      done: settled.length,
      total: rows.length,
      created: rows.filter((r) => r.status === "created").length,
      duplicate: rows.filter((r) => r.status === "duplicate").length,
      failed: rows.filter((r) => r.status === "failed"),
    };
  }, [rows]);

  const pct = tally.total > 0 ? (tally.done / tally.total) * 100 : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      side="center"
      blurBackdrop
      dismissable={false}
      title="Crear candidatos con IA"
      className="max-w-lg"
    >
      <div className="flex flex-col gap-5">
        <p className="sr-only" role="status" aria-live="polite">
          {announce}
        </p>

        {running ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text">
              <span className="font-semibold tabular-nums">{tally.done}</span> de{" "}
              <span className="tabular-nums">{tally.total}</span> CVs procesados
            </p>
            <div
              className="h-2 overflow-hidden rounded-full border border-border bg-bg"
              role="progressbar"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso de la tanda"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-ai transition-[width] duration-300 ease-out"
                style={{ width: `${Math.max(pct, 3)}%` }}
              />
            </div>
            <p className="text-xs text-muted" aria-hidden>
              La IA lee cada CV — unos segundos por archivo. No cierres esta pestaña.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <span
              className={[
                "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                tally.created > 0 ? "bg-primary-light text-primary" : "bg-bg text-muted",
              ].join(" ")}
              aria-hidden
            >
              {tally.created > 0 ? (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 10 3.5 3.5L15 6" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M10 6v5M10 14h.01" />
                </svg>
              )}
            </span>
            <div className="min-w-0">
              <p className="font-display text-2xl font-bold tracking-[-0.02em] text-text">
                {tally.created > 0
                  ? `${tally.created} candidato${tally.created !== 1 ? "s" : ""} nuevo${tally.created !== 1 ? "s" : ""}`
                  : "No se agregó ningún candidato"}
              </p>
              {(tally.duplicate > 0 || tally.failed.length > 0) && (
                <p className="mt-1 text-sm text-muted">
                  {[
                    tally.duplicate > 0 && `${tally.duplicate} ya estaban en el pool`,
                    tally.failed.length > 0 && `${tally.failed.length} no se pudieron leer`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  {tally.failed.length > 0 && " — revisá los motivos abajo."}
                </p>
              )}
            </div>
          </div>
        )}

        {!running && quotaHit && (
          <p className="rounded-[var(--radius)] border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-[#92400E]">
            Se agotó la cuota de IA por hoy — los CVs que quedaron sin procesar se pueden
            reintentar más tarde.
          </p>
        )}

        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border">
          {rows.map((row) => (
            <li
              key={row.index}
              className="flex flex-col gap-1 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <span className="min-w-0 truncate text-sm text-text sm:flex-1">{row.fileName}</span>
              <RowState row={row} />
            </li>
          ))}
        </ul>

        {!running && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
            {tally.failed.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => run(tally.failed.map((r) => r.index))}
              >
                Reintentar {tally.failed.length}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              Subir más
            </Button>
            <Link href="/candidates" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Ver candidatos
            </Link>
          </div>
        )}
      </div>
    </Dialog>
  );
}

const NOWRAP_BADGE = "shrink-0 whitespace-nowrap";

function RowState({ row }: { row: Row }) {
  if (row.status === "queued") {
    return <span className="shrink-0 text-xs text-muted">En cola</span>;
  }
  if (row.status === "processing") {
    return (
      <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-primary">
        <Spinner className="text-xs" />
        Analizando…
      </span>
    );
  }
  if (row.status === "failed") {
    return (
      <span className="flex min-w-0 items-center gap-2 sm:max-w-[55%]">
        <Badge variant="warning" className={NOWRAP_BADGE}>
          No se pudo
        </Badge>
        {row.detail && <span className="min-w-0 truncate text-xs text-muted">{row.detail}</span>}
      </span>
    );
  }
  const label = row.status === "created" ? "Agregado" : "Ya en el pool";
  return (
    <span className="flex min-w-0 items-center gap-2 sm:max-w-[55%]">
      <Badge
        variant={row.status === "created" ? "success" : "muted"}
        className={NOWRAP_BADGE}
      >
        {label}
      </Badge>
      {row.detail &&
        (row.candidateId ? (
          <Link
            href={`/candidates/${row.candidateId}`}
            className="min-w-0 truncate text-xs font-medium text-primary hover:text-primary-hover"
          >
            {row.detail}
          </Link>
        ) : (
          <span className="min-w-0 truncate text-xs text-muted">{row.detail}</span>
        ))}
    </span>
  );
}
