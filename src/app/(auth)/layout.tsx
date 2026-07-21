import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth/AuthShell";

/** Layout de las pantallas de autenticación del reclutador. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell tagline="ATS para reclutadores">{children}</AuthShell>;
}
