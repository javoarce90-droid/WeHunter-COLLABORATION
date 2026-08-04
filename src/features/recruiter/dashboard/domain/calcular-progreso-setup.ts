import type { WorkspaceType } from "@/lib/auth/session";

/**
 * Caso de uso: armar el checklist de setup del workspace (Inicio + widget flotante global).
 * Única fuente de verdad de los 5 items — antes vivían hardcodeados dentro de la página de
 * Inicio. Solo lectura, sin autorización propia (cualquier miembro ve el progreso de su org).
 */

export interface SetupCounts {
  careerSiteConfigured: boolean;
  stageTemplatesCount: number;
  /** Clientes (freelance) o miembros+invitaciones pendientes (team/enterprise) — cuál de los
   *  dos depende de workspaceType. */
  teamOrClientsCount: number;
  jobsCount: number;
  candidatesCount: number;
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
  const isFreelance = workspaceType === "freelance";

  const items: ChecklistItem[] = [
    {
      title: "Configurá tu career site",
      description: "Así es como te verán quienes se postulen a tus búsquedas.",
      href: "/career-site",
      done: counts.careerSiteConfigured,
    },
    {
      title: "Configurá las etapas de tu pipeline",
      description: "Vienen con un default, pero podés ajustarlas antes de tu primera búsqueda.",
      href: "/settings/stages",
      done: counts.stageTemplatesCount > 0,
    },
    isFreelance
      ? {
          title: "Da de alta a tu primer cliente",
          description: "Así vinculás tus búsquedas a la empresa para la que reclutás.",
          href: "/clients/new",
          done: counts.teamOrClientsCount > 0,
        }
      : {
          title: "Invitá a tu equipo",
          description: "Sumá recruiters, sourcers o consultores externos a tu workspace.",
          href: "/team",
          done: counts.teamOrClientsCount > 1,
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
  ];

  const done = items.filter((i) => i.done).length;
  const total = items.length;

  return { items, done, total, percent: Math.round((done / total) * 100) };
}
