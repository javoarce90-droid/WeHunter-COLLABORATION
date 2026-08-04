import Link from "next/link";
import type { ChecklistItem } from "../domain/calcular-progreso-setup";

/** Fila de un item del checklist de setup. Compartida entre Inicio y el widget flotante. */
export function ChecklistItemRow({ item }: { item: ChecklistItem }) {
  return (
    <Link
      href={item.href}
      className="flex items-start gap-3 rounded-[var(--radius)] px-2 py-2.5 transition-colors hover:bg-bg"
    >
      <span
        className={[
          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] font-bold",
          item.done ? "border-primary bg-primary text-white" : "border-border text-transparent",
        ].join(" ")}
        aria-hidden
      >
        ✓
      </span>
      <span>
        <span
          className={[
            "block text-sm font-semibold",
            item.done ? "text-muted line-through" : "text-text",
          ].join(" ")}
        >
          {item.title}
        </span>
        <span className="mt-0.5 block text-xs text-muted">{item.description}</span>
      </span>
    </Link>
  );
}
