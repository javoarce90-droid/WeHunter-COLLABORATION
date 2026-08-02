import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth/AuthShell";

/** Shell neutral: esta pantalla es previa a saber de qué reino es el usuario, así que no
 *  puede mostrar el subtítulo de ninguno de los dos. */
export default function ElegirCuentaLayout({ children }: { children: ReactNode }) {
  return <AuthShell tagline="Terminá de crear tu cuenta">{children}</AuthShell>;
}
