import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAccountType, getCurrentUser } from "@/lib/auth/session";
import { PICK_ACCOUNT_COOKIE } from "@/lib/auth/pick-account";
import { PickAccountForm } from "./PickAccountForm";

/**
 * Paso posterior a un alta social: el usuario elige si viene a buscar trabajo o a contratar.
 * Solo es accesible con la cookie que deja el callback de OAuth para una cuenta recién creada
 * — quien ya eligió (o se registró por email) queda fuera y va a su home.
 */
export default async function ElegirCuentaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const puedeElegir = (await cookies()).get(PICK_ACCOUNT_COOKIE) != null;
  if (!puedeElegir) {
    const accountType = await getAccountType();
    redirect(accountType === "recruiter" ? "/dashboard" : "/portal");
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="font-display text-xl font-bold text-white">
          ¿Cómo vas a usar WeHunter?
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Entraste con {user.email}. Elegí una opción para terminar de crear tu cuenta.
        </p>
      </div>
      <PickAccountForm />
    </>
  );
}
