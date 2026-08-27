"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/features/recruiter/settings/ui/SettingsSection";
import { useToast } from "@/lib/toast";
import { cambiarPlanAction } from "../actions";

/**
 * Ofrecer el upgrade a Teams desde `/settings/plan`. Solo se monta cuando el workspace está
 * en Freelancer y Teams está disponible. El cambio de tipo de workspace + plan lo hace la
 * server action; refrescamos para que el resto de la UI (límite de miembros, etc.) tome el
 * nuevo tipo.
 */
export function UpgradePlanPanel({
  targetCode,
  targetName,
  targetPriceLabel,
  perks,
}: {
  targetCode: string;
  targetName: string;
  targetPriceLabel: string;
  perks: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  function upgrade() {
    start(async () => {
      const res = await cambiarPlanAction(targetCode);
      if (res?.error) {
        toast({ message: res.error, variant: "danger" });
        return;
      }
      router.refresh();
      toast({ message: `Pasaste al plan ${targetName}.`, variant: "success" });
    });
  }

  return (
    <SettingsSection
      title={`Pasar a ${targetName}`}
      description={`${targetPriceLabel}/mes · seguís con los mismos días de prueba.`}
    >
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2 text-sm text-text">
              <Check className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden />
              {perk}
            </li>
          ))}
        </ul>
        <div>
          <Button variant="primary" size="sm" loading={pending} onClick={upgrade}>
            Pasar a {targetName}
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
}
