import type { WorkspaceType } from "@/lib/auth/session";

/**
 * "Clientes" y "Hiring Manager" son el mismo módulo técnico (CRM + magic link sin cuenta) —
 * en workspaces Enterprise ("Represento a una empresa") se etiqueta como Hiring Manager porque
 * ahí la contraparte es interna a la empresa que contrata, no un cliente externo de consultora.
 * Ver docs/BACKLOG.md §11 ("mismo módulo técnico, distinta etiqueta").
 */
export interface ClientsCopy {
  pageTitle: string;
  pageSubtitle: string;
  bannerText: string;
  addButtonLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  tableHeader: string;
}

const DEFAULT_COPY: ClientsCopy = {
  pageTitle: "Clientes",
  pageSubtitle: "Las empresas para las que reclutás.",
  bannerText:
    "A cada cliente le compartís un link (sin cuenta) para que cargue solicitudes y siga el estado de sus búsquedas.",
  addButtonLabel: "Agregar cliente",
  emptyTitle: "Todavía no tenés clientes",
  emptyDescription: "Cargá tus empresas cliente para vincular búsquedas y organizar tu cartera.",
  tableHeader: "Cliente",
};

const ENTERPRISE_COPY: ClientsCopy = {
  pageTitle: "Hiring Manager",
  pageSubtitle: "Los hiring managers para los que reclutás.",
  bannerText:
    "A cada hiring manager le compartís un link (sin cuenta) para que cargue solicitudes y siga el estado de sus búsquedas.",
  addButtonLabel: "Agregar hiring manager",
  emptyTitle: "Todavía no tenés hiring managers",
  emptyDescription: "Cargá tus hiring managers para vincular búsquedas y organizar tu cartera.",
  tableHeader: "Hiring Manager",
};

export function getClientsCopy(workspaceType: WorkspaceType | null): ClientsCopy {
  return workspaceType === "enterprise" ? ENTERPRISE_COPY : DEFAULT_COPY;
}
