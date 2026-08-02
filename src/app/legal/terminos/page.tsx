import type { Metadata } from "next";
import { LegalPage } from "../../_marketing/components/LegalPage";
import { TerminosContent } from "../../_marketing/components/legal-content";

export const metadata: Metadata = {
  title: "Términos y Condiciones de Uso | WeHunter",
};

export default function TerminosPage() {
  return (
    <LegalPage>
      <TerminosContent />
    </LegalPage>
  );
}
