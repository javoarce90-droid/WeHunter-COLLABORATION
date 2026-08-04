import type { WorkspaceType } from "@/lib/auth/session";

/**
 * Caso de uso: armar el checklist de setup del workspace (Inicio + widget flotante global).
 * Única fuente de verdad de los items — antes vivían hardcodeados dentro de la página de
 * Inicio. Solo lectura, sin autorización propia (cualquier miembro ve el progreso de su org).
 *
 * El orden y los items por tipo de workspace son el spec exacto que pasó el usuario:
 *   freelance:  Career Site → Cliente        → Búsqueda → Candidatos → Agenda
 *   team:       Career Site → Cliente        → Búsqueda → Candidatos → Agenda → Equipo
 *   enterprise: Career Site → Hiring Manager  → Búsqueda → Candidatos → Agenda → Equipo
 * "Cliente"/"Hiring Manager" son el mismo módulo técnico (`clients`), distinta etiqueta según
 * workspaceType (ver `features/recruiter/clients/copy.ts`) — mismo href y mismo count.
 */

export interface SetupCounts {
  careerSiteConfigured: boolean;
  /** Clientes o Hiring Managers — misma tabla, distinta etiqueta según workspaceType. */
  clientsOrHmCount: number;
  jobsCount: number;
  candidatesCount: number;
  googleCalendarConnected: boolean;
  /** Miembros activos + invitaciones pendientes. Solo se usa en team/enterprise. */
  teamCount: number;
}

export interface ChecklistItem {
  title: string;
  description: string;
  href: string;
  done: boolean;
}

export interface ProgresoSetup {
  items: ChecklistItem[];
  done: number;
  total: number;
  percent: number;
}

export function calcularProgresoSetup(
  counts: SetupCounts,
  workspaceType: WorkspaceType | null,
): ProgresoSetup {
  const isEnterprise = workspaceType === "enterprise";
  const isFreelance = workspaceType === "freelance";

  const items: ChecklistItem[] = [
    {
      title: "Configurá tu career site",
      description: "Así es como te verán quienes se postulen a tus búsquedas.",
      href: "/career-site",
      done: counts.careerSiteConfigured,
    },
    isEnterprise
      ? {
          title: "Invitá a tu primer Hiring Manager",
          description: "Así vinculás tus búsquedas a quien contrata dentro de la empresa.",
          href: "/clients/new",
          done: counts.clientsOrHmCount > 0,
        }
      : {
          title: "Da de alta a tu primer cliente",
          description: "Así vinculás tus búsquedas a la empresa para la que reclutás.",
          href: "/clients/new",
          done: counts.clientsOrHmCount > 0,
        },
    {
      title: "Creá tu primera búsqueda",
      description: "Con IA o manual — es lo primero que necesitás para recibir postulantes.",
      href: "/jobs/new",
      done: counts.jobsCount > 0,
    },
    {
      title: "Cargá tus primeros candidatos",
      description: "Manual, importado o desde tu pool.",
      href: "/candidates",
      done: counts.candidatesCount > 0,
    },
    {
      title: "Conectá tu agenda",
      description: "Sincronizá Google Calendar para agendar entrevistas sin salir de WeHunter.",
      href: "/settings",
      done: counts.googleCalendarConnected,
    },
  ];

  if (!isFreelance) {
    items.push({
      title: "Invitá a tu equipo",
      description: "Sumá recruiters, sourcers o consultores externos a tu workspace.",
      href: "/team",
      done: counts.teamCount > 1,
    });
  }

  const done = items.filter((i) => i.done).length;
  const total = items.length;

  return { items, done, total, percent: Math.round((done / total) * 100) };
}
