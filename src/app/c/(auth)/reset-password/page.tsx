import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function CandidateResetPasswordPage() {
  // El callback deja la sesión antes de mandar acá. Sin sesión, el link no se canjeó (vencido
  // o abierto directo) → de vuelta a pedir uno.
  const user = await getCurrentUser();
  if (!user) redirect("/c/forgot-password?error=expired");

  return <ResetPasswordForm realm="candidate" />;
}
