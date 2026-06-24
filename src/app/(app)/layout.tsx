import { type ReactNode, Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { logout } from "@/app/(auth)/actions";
import { Sidebar } from "./_components/Sidebar";
import { AppChrome } from "./_components/AppChrome";
import { CommandTrigger } from "./_components/CommandTrigger";
import {
  NotificationBellLoader,
  NotificationBellFallback,
} from "@/features/recruiter/notifications/ui/NotificationBellLoader";

/**
 * Shell de las pantallas del reclutador (rutas protegidas). Resuelve el contexto base:
 *  - sin sesión → /login (el middleware ya lo cubre; esto es defensa en profundidad).
 *  - sesión sin workspace → /onboarding.
 * La navegación vive en la barra lateral (Sidebar); el header queda como topbar de cuenta.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const membership = await getActiveMembership();
  if (!membership) {
    redirect("/onboarding");
  }

  const sidebarCollapsed =
    (await cookies()).get("wh.sidebar.collapsed")?.value === "1";

  return (
    <div className="flex h-dvh bg-bg">
      <Sidebar email={user.email ?? ""} defaultCollapsed={sidebarCollapsed} />
      <AppChrome>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[var(--topbar-h)] shrink-0 items-center gap-3 border-b border-border bg-surface px-6 text-sm text-muted">
            <CommandTrigger />
            <div className="ml-auto flex items-center gap-3">
              <Suspense fallback={<NotificationBellFallback />}>
                <NotificationBellLoader organizationId={membership.organizationId} />
              </Suspense>
              <span className="truncate">{user.email}</span>
              <form action={logout}>
                <button
                  type="submit"
                  className="font-semibold text-primary transition-colors hover:text-primary-hover"
                >
                  Salir
                </button>
              </form>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </AppChrome>
    </div>
  );
}
