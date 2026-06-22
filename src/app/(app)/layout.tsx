import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { logout } from "@/app/(auth)/actions";

/**
 * Shell de las pantallas del reclutador (rutas protegidas). Resuelve el contexto base:
 *  - sin sesión → /login (el middleware ya lo cubre; esto es defensa en profundidad).
 *  - sesión sin workspace → /onboarding.
 * El layout visual completo (sidebar, etc.) se desarrolla con el Dashboard (Slice 1).
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

  return (
    <div className="min-h-dvh bg-bg">
      <header className="flex h-[var(--topbar-h)] items-center justify-between border-b border-border bg-surface px-6">
        <span className="font-display font-bold text-text">
          <span className="text-primary">We</span>Hunter
        </span>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>{user.email}</span>
          <form action={logout}>
            <button type="submit" className="font-semibold text-primary">
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
