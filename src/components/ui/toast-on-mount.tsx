"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/lib/toast";

/**
 * Dispara un toast al montar si la URL trae `param`, y lo saca de la URL con `router.replace`
 * para que no vuelva a dispararse en un refresh. Para redirects de server actions (crear/editar
 * búsqueda) que no tienen vuelta de estado al cliente para togglear un toast directo.
 */
export function ToastOnMount({
  param,
  message,
  variant = "success",
}: {
  param: string;
  message: string;
  variant?: "default" | "success" | "danger";
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!searchParams.has(param)) return;
    toast({ message, variant });
    const next = new URLSearchParams(searchParams);
    next.delete(param);
    router.replace(next.size > 0 ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [searchParams, param, message, variant, toast, router, pathname]);

  return null;
}
