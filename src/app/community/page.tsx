import type { Metadata } from "next";
import { listarComunidad } from "@/features/company/community/domain/listar-comunidad";
import { CommunityHeader } from "@/features/company/community/ui/CommunityHeader";
import { CommunityIntro } from "@/features/company/community/ui/CommunityIntro";
import { CommunityGrid } from "@/features/company/community/ui/CommunityGrid";

// Visitante sin sesión: nada de cache, cada visita valida contra la base (igual que /careers/[slug]).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comunidad · WeHunter",
  description:
    "Conectá con recruiters y consultoras de RRHH que ya confían en WeHunter para gestionar sus búsquedas.",
};

export default async function CommunityPage() {
  const cards = await listarComunidad();

  return (
    <div className="min-h-dvh bg-bg">
      <CommunityHeader />
      <CommunityIntro />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <CommunityGrid cards={cards} />
      </main>
    </div>
  );
}
