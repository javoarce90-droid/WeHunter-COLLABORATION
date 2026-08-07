import { EmptyState } from "@/components/ui/empty-state";
import { CommunityCard } from "./CommunityCard";
import type { CommunityCard as CommunityCardData } from "../domain/listar-comunidad";

export function CommunityGrid({ cards }: { cards: CommunityCardData[] }) {
  if (cards.length === 0) {
    return (
      <EmptyState
        variant="subtle"
        title="Todavía no hay nadie en la Comunidad"
        description="Los recruiters y consultoras que activen 'Aparecer en la Comunidad' desde su perfil van a verse acá."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <CommunityCard key={card.id} card={card} />
      ))}
    </div>
  );
}
