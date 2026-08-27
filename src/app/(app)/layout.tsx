import { type ReactNode, Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getAccountType,
  getActiveMembership,
  getCurrentUser,
  getMyMemberships,
} from "@/lib/auth/session";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./_components/Sidebar";
import { AppChrome } from "./_components/AppChrome";
import { CommandTrigger } from "./_components/CommandTrigger";
import {
  NotificationBellLoader,
  NotificationBellFallback,
} from "@/features/recruiter/notifications/ui/NotificationBellLoader";
import { SetupChecklistWidgetLoader } from "@/features/recruiter/dashboard/ui/SetupChecklistWidgetLoader";
import { getWorkspaceAccess } from "@/features/recruiter/billing/data/workspace-access";
import { TrialBanner } from "@/features/recruiter/billing/ui/TrialBanner";
import { PaywallScreen } from "@/features/recruiter/billing/ui/PaywallScreen";

/**
 * Shell de las pantallas del reclutador (rutas protegidas). Resuelve el contexto base:
 *  - sin sesión → /login (el middleware ya lo cubre; esto es defensa en profundidad).
 *  - cuenta de candidato → /portal (nunca debe ver el shell de recruiter, ni su onboarding).
 *  - sesión sin workspace → /onboarding.
 * La navegación vive en la barra lateral (Sidebar); el header queda como topbar de cuenta.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  // Las tres son independientes entre sí (solo dependen de la sesión, no unas de otras) —
  // en paralelo en vez de 3 awaits seguidos (database.md #3).
  const [user, accountType, memberships] = await Promise.all([
    getCurrentUser(),
    getAccountType(),
    getMyMemberships(),
  ]);
  if (!user) {
    redirect("/login");
  }
  if (accountType === "candidate") {
    redirect("/portal");
  }
  if (memberships.length === 0) {
    redirect("/onboarding");
  }
  // Misma query cacheada: getActiveMembership() reusa getMyMemberships() (cache() por
  // request), no dispara una segunda transacción por pedir la lista completa acá arriba.
  const membership = await getActiveMembership();
  if (!membership) {
    redirect("/onboarding");
  }

  // Gate de facturación: la prueba de 15 días y el corte por falta de pago (ver
  // features/recruiter/billing). El shell (sidebar + header) queda; solo cambia el <main>.
  const access = await getWorkspaceAccess();

  const sidebarCollapsed =
    (await cookies()).get("wh.sidebar.collapsed")?.value === "1";

  return (
    <div className="flex h-dvh bg-bg">
      <Sidebar
        email={user.email ?? ""}
        workspaces={memberships}
        activeOrganizationId={membership.organizationId}
        role={membership.role}
        workspaceType={membership.workspaceType}
        defaultCollapsed={sidebarCollapsed}
      />
      <AppChrome role={membership.role} workspaceType={membership.workspaceType}>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[var(--topbar-h)] shrink-0 items-center gap-3 border-b border-border bg-surface px-6 text-sm text-muted">
            <CommandTrigger />
            <div className="ml-auto flex items-center gap-3">
              <Suspense fallback={<NotificationBellFallback />}>
                <NotificationBellLoader
                  organizationId={membership.organizationId}
                  profileId={user.id}
                />
              </Suspense>
              <span className="truncate">{user.email}</span>
              <span className="h-4 w-px bg-border" aria-hidden />
              <form action={logout}>
                <Button type="submit" variant="ghost" size="sm">
                  Salir
                </Button>
              </form>
            </div>
          </header>
          {access?.state === "trial" && (
            <TrialBanner
              daysLeft={access.daysLeft}
              hasPaymentMethod={access.hasPaymentMethod}
            />
          )}
          {/* pb-24 extra: deja lugar al widget flotante de setup (esquina inferior derecha,
              fixed) mientras puede estar visible — evita que tape contenido pegado abajo. */}
          <main
            className={[
              "flex-1 overflow-auto p-6",
              access?.state !== "blocked" &&
                !membership.organizationSetupCompletedAt &&
                (membership.role === "owner" || membership.role === "admin") &&
                "pb-24",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {access?.state === "blocked" ? (
              <PaywallScreen
                reason={access.reason}
                role={membership.role}
                plan={access.plan}
              />
            ) : (
              children
            )}
          </main>
        </div>
      </AppChrome>
      {access?.state !== "blocked" &&
        (membership.role === "owner" || membership.role === "admin") && (
        <Suspense fallback={null}>
          <SetupChecklistWidgetLoader
            organizationId={membership.organizationId}
            workspaceType={membership.workspaceType}
            setupCompletedAt={membership.organizationSetupCompletedAt}
            userId={user.id}
          />
        </Suspense>
      )}
    </div>
  );
}
