import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  const loginHref = redirect ? `/c/login?redirect=${encodeURIComponent(redirect)}` : "/c/login";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 text-center">
        <p className="text-sm text-text">
          Te enviamos un email para confirmar tu cuenta. Verificalo y después iniciá sesión.
        </p>
        <Link href={loginHref} className="text-xs font-semibold text-primary">
          Ir a iniciar sesión
        </Link>
      </CardContent>
    </Card>
  );
}
