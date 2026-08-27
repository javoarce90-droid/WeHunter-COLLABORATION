import Link from "next/link";
import { Clock, TriangleAlert } from "lucide-react";

/**
 * Banda fina sobre el contenido del reclutador mientras el workspace está en período de
 * prueba. Informativa + un acceso al plan; el llamado fuerte a conectar dLocal Go vive en
 * la card de Inicio (`ConnectPlanCard`) y en `/settings/plan`.
 */
export function TrialBanner({
  daysLeft,
  hasPaymentMethod,
}: {
  daysLeft: number;
  hasPaymentMethod: boolean;
}) {
  const urgent = !hasPaymentMethod && daysLeft <= 3;
  const dias = daysLeft === 1 ? "1 día" : `${daysLeft} días`;

  const message = hasPaymentMethod
    ? `Prueba activa — el primer cobro corre en ${dias}.`
    : urgent
      ? `Te ${daysLeft === 1 ? "queda" : "quedan"} ${dias} de prueba. Sin un plan activo perdés el acceso.`
      : `Prueba de WeHunter — te ${daysLeft === 1 ? "queda" : "quedan"} ${dias} para activar tu plan.`;

  const cta = hasPaymentMethod ? "Ver plan" : urgent ? "Activar ahora" : "Activar plan";

  return (
    <div
      className={[
        "flex items-center justify-between gap-4 border-b px-6 py-3 text-sm",
        urgent
          ? "border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]"
          : "border-border bg-primary-light text-primary-hover",
      ].join(" ")}
    >
      <p className="flex min-w-0 items-center gap-2">
        {urgent ? (
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <Clock className="h-4 w-4 shrink-0" aria-hidden />
        )}
        <span className="truncate">{message}</span>
      </p>
      <Link
        href="/settings/plan"
        className="shrink-0 rounded font-semibold underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        {cta} &rarr;
      </Link>
    </div>
  );
}
