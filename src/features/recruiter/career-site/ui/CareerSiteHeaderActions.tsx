"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useToast } from "@/lib/toast";

export function CareerSiteHeaderActions({ slug }: { slug: string }) {
  const toast = useToast();

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/careers/${slug}`);
    toast({ message: "Link del Career Site copiado al portapapeles", variant: "success" });
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={copyLink} className={buttonVariants({ variant: "secondary" })}>
        🔗 Copiar link
      </button>
      <Link
        href={`/careers/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "primary" })}
      >
        Abrir Career Site ↗
      </Link>
    </div>
  );
}
