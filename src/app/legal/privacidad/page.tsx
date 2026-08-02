import type { Metadata } from "next";
import { LegalPage } from "../../_marketing/components/LegalPage";
import { PrivacidadContent } from "../../_marketing/components/legal-content";

export const metadata: Metadata = {
  title: "Política de Privacidad | WeHunter",
};

export default function PrivacidadPage() {
  return (
    <LegalPage>
      <PrivacidadContent />
    </LegalPage>
  );
}
