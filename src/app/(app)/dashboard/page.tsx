import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import type { WorkspaceType } from "@/lib/auth/session";
import { getOwnProfile } from "@/features/recruiter/settings/data/settings.queries";
import { obtenerKpis, type DashboardKpis } from "@/features/recruiter/dashboard/domain/obtener-kpis";
import { getDashboardCounts } from "@/features/recruiter/dashboard/data/dashboard.queries";
import { calcularProgresoSetup } from "@/features/recruiter/dashboard/domain/calcular-progreso-setup";
import { getSetupChecklistCounts } from "@/features/recruiter/dashboard/data/setup-checklist.queries";
import { ChecklistItemRow } from "@/features/recruiter/dashboard/ui/ChecklistItemRow";
import { KpiGrid, KpiGridSkeleton } from "@/features/recruiter/dashboard/ui/KpiGrid";
import { listRecentOpenJobs } from "@/features/recruiter/jobs/data/jobs.queries";
import { getDashboardAgendaSummary } from "@/features/recruiter/interviews/data/interviews.queries";
import { JOB_STATUS_META } from "@/features/recruiter/jobs/ui/status-meta";
import { TYPE_LABELS, TYPE_BADGE, MODE_LABELS } from "@/features/recruiter/interviews/schema";

/**
 * Dashboard del reclutador ("Inicio"). Dos versiones, igual que el prototipo validado:
 * el workspace recién creado (sin búsquedas todavía) muestra un checklist de setup en vez
 * de KPIs vacíos; con la primera búsqueda creada pasa a mostrar la actividad real. El shell
 * queda detrás de un único Suspense: tanto el saludo (nombre) como qué versión mostrar
 * dependen de datos, así que no hay nada instantáneo que pintar antes de esa lectura.
 */

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
}

const dayFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit" });
const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "short" });
const timeFormatter = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const membership = await getActiveMembership();
  if (!membership) notFound();
  const user = await getCurrentUser();
  if (!user) notFound();

  const [profile, kpisResult] = await Promise.all([
    getOwnProfile(),
    obtenerKpis(
      { organizationId: membership.organizationId },
      { getCounts: getDashboardCounts },
    ),
  ]);
  const firstName = profile?.fullName?.trim().split(/\s+/)[0] ?? "";

  if (!kpisResult.ok) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-danger">{kpisResult.error}</p>
        </CardContent>
      </Card>
    );
  }

  const kpis = kpisResult.data;
  const isDay1 = kpis.busquedasTotales === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text">
          {greeting()}
          {firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="text-sm text-muted">
          {isDay1
            ? "Tu workspace está recién creado — armemos lo básico antes de arrancar a reclutar."
            : "Esto es lo que pasa hoy en tu workspace."}
        </p>
      </div>

      {isDay1 ? (
        <DashboardDay1
          organizationId={membership.organizationId}
          userId={user.id}
          workspaceType={membership.workspaceType}
        />
      ) : (
        <DashboardDaily organizationId={membership.organizationId} kpis={kpis} />
      )}
    </div>
  );
}

/** Con movimiento: KPIs, accesos rápidos, últimas búsquedas activas y próximas entrevistas. */
async function DashboardDaily({
  organizationId,
  kpis,
}: {
  organizationId: string;
  kpis: DashboardKpis;
}) {
  const [recentJobs, agenda] = await Promise.all([
    listRecentOpenJobs(organizationId, 3),
    getDashboardAgendaSummary(organizationId),
  ]);

  return (
    <>
      <KpiGrid kpis={kpis} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ActionCard
          href="/jobs/new"
          title="Crear búsqueda"
          description="Nuevo aviso, con IA o manual."
          icon={<PlusIcon />}
        />
        <ActionCard
          href="/jobs"
          title="Revisar postulados"
          description={`${kpis.pendienteRevision} esperando decisión.`}
          icon={<InboxIcon />}
        />
        <ActionCard
          href="/agenda"
          title="Agenda de hoy"
          description={`${agenda.todayCount} entrevista${agenda.todayCount !== 1 ? "s" : ""} programada${agenda.todayCount !== 1 ? "s" : ""}.`}
          icon={<CalendarIcon />}
        />
      </div>

      <SectionCard
        title="Tus búsquedas activas"
        action={
          <Link href="/jobs" className="text-xs font-semibold text-primary hover:text-primary-hover">
            Ver todas →
          </Link>
        }
        flush
      >
        {recentJobs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">No tenés búsquedas abiertas.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentJobs.map((job) => {
              const meta = JOB_STATUS_META[job.status];
              return (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.id}/pipeline`}
                    className="group flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-bg"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text transition-colors group-hover:text-primary">
                        {job.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        <span className="font-medium text-text/70 tabular-nums">{job.viewCount}</span>{" "}
                        {job.viewCount === 1 ? "visita" : "visitas"} ·{" "}
                        <span className="font-medium text-text/70 tabular-nums">{job.receivedCount}</span>{" "}
                        {job.receivedCount === 1 ? "postulación" : "postulaciones"}
                        {job.pendingCount > 0 && (
                          <>
                            {" · "}
                            <span className="font-semibold text-primary">
                              {job.pendingCount} sin revisar
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Próximas entrevistas"
        action={
          <Link href="/agenda" className="text-xs font-semibold text-primary hover:text-primary-hover">
            Ver agenda →
          </Link>
        }
        flush
      >
        {agenda.next.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">No tenés entrevistas agendadas.</p>
        ) : (
          <ul className="divide-y divide-border">
            {agenda.next.map((iv) => (
              <li key={iv.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex w-12 shrink-0 flex-col items-center rounded-[var(--radius)] border border-border bg-bg py-1.5">
                  <span className="text-[10px] font-semibold uppercase text-muted">
                    {monthFormatter.format(iv.scheduledAt)}
                  </span>
                  <span className="font-display text-base font-bold text-text tabular-nums">
                    {dayFormatter.format(iv.scheduledAt)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text">{iv.candidateName}</p>
                  <p className="truncate text-xs text-muted">{iv.jobTitle}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant={TYPE_BADGE[iv.type]}>{TYPE_LABELS[iv.type]}</Badge>
                  <span className="text-xs text-muted">
                    {timeFormatter.format(iv.scheduledAt)} · {MODE_LABELS[iv.mode]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}

/**
 * Día 1: sin búsquedas todavía. Checklist de setup en vez de KPIs vacíos. Misma
 * `getSetupChecklistCounts` + `calcularProgresoSetup` que usa el widget flotante global —
 * única fuente de verdad de los items/umbrales.
 */
async function DashboardDay1({
  organizationId,
  userId,
  workspaceType,
}: {
  organizationId: string;
  userId: string;
  workspaceType: WorkspaceType | null;
}) {
  const counts = await getSetupChecklistCounts(organizationId, userId);
  const progreso = calcularProgresoSetup(counts, workspaceType);

  return (
    <>
      <SectionCard
        title="Configurá tu cuenta"
        action={
          <span className="text-xs font-semibold text-muted">
            {progreso.done}/{progreso.total} listo
          </span>
        }
        bodyClassName="flex flex-col gap-1"
      >
        {progreso.items.map((item) => (
          <ChecklistItemRow key={item.title} item={item} />
        ))}
      </SectionCard>

      <SectionCard title="Tus búsquedas activas">
        <p className="py-6 text-center text-sm text-muted">
          Todavía no creaste ninguna búsqueda.
        </p>
      </SectionCard>
    </>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactElement;
}) {
  return (
    <Link href={href} className="group outline-none">
      <Card
        variant="kpi"
        className="h-full p-4 group-focus-visible:ring-2 group-focus-visible:ring-[var(--focus-ring)]"
      >
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-light text-primary-hover">
          {icon}
        </span>
        <p className="mt-2.5 text-sm font-semibold text-text">{title}</p>
        <p className="mt-0.5 text-xs text-muted">{description}</p>
      </Card>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div>
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <KpiGridSkeleton />
    </div>
  );
}

/* — Íconos (SVG inline, sin dependencias) — */

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
