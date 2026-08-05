import Image from "next/image";

const ASPECT_RATIO = 1443 / 242;

interface WehunterLogoProps {
  variant?: "purple" | "white";
  height?: number;
  className?: string;
  /** El logo es casi siempre el elemento LCP de la pantalla donde vive en el header/sidebar
   *  fijo. Sin esto, Next lo carga `lazy` y en la primera carga puede pintarse en blanco un
   *  instante (deja el hueco reservado por width/height, pero sin la imagen todavía) hasta que
   *  el navegador decide buscarlo — un refresh lo sirve desde cache y ya no se nota. */
  priority?: boolean;
}

/** Isotipo "WeHunter." provisto por el cliente (public/logo), recortado sin el margen del
 * archivo original para que "height" corresponda al alto visual real del isotipo. */
export function WehunterLogo({
  variant = "purple",
  height = 28,
  className,
  priority = false,
}: WehunterLogoProps) {
  const width = Math.round(height * ASPECT_RATIO);
  return (
    <Image
      src={variant === "white" ? "/logo/wehunter-mark-white.png" : "/logo/wehunter-mark.png"}
      alt="WeHunter"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}
