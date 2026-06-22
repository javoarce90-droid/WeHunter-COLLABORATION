import { redirect } from "next/navigation";

/** Entrada raíz: el middleware decide si hay sesión; si no, /dashboard rebota a /login. */
export default function Home() {
  redirect("/dashboard");
}
