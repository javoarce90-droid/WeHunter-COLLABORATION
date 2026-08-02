import Link from "next/link";
import {
  getInvitationByToken,
  findProfileByEmail,
} from "@/features/recruiter/team/data/team.mutations";
import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";
import { Card, CardContent } from "@/components/ui/card";

/** Función pura a nivel de datos (no es un componente): acá `Date.now()` es legítimo, mismo
 *  criterio que ya usa `AgendaView.tsx`. */
function isExpired(expiresAt: Date | null): boolean {
  return expiresAt !== null && expiresAt.getTime() < Date.now();
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 text-center">
        <p className="text-sm text-text">{message}</p>
        <Link href="/login" className="text-xs font-semibold text-primary">
          Ir a iniciar sesión
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Ruta pública (sin sesión): quien llega acá viene de un email de invitación. Solo LEE acá
 * (nunca crea membership/cuenta en el render — eso pasa recién al confirmar el form, para no
 * quemar el token con un simple GET de un preview de cliente de mail). Vive dentro de
 * `(auth)` a propósito: mismo `AuthShell` visual que login/register/reset-password.
 */
export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) return <ErrorCard message="Este link de invitación no es válido." />;

  const invitation = await getInvitationByToken(token);
  if (!invitation) return <ErrorCard message="Este link de invitación no es válido." />;
  if (invitation.status === "revoked") {
    return <ErrorCard message="Esta invitación fue revocada por quien te invitó." />;
  }
  if (invitation.status === "accepted") {
    return <ErrorCard message="Esta invitación ya fue usada. Iniciá sesión con tu cuenta." />;
  }
  if (isExpired(invitation.expiresAt)) {
    return (
      <ErrorCard message="El link de invitación venció. Pedile a quien te invitó que te reenvíe uno nuevo." />
    );
  }

  const existingProfile = await findProfileByEmail(invitation.email);
  return <AcceptInviteForm token={token} needsPassword={!existingProfile} />;
}
