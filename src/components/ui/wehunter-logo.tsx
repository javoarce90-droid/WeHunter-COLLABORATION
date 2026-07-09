import Image from "next/image";

const ASPECT_RATIO = 1443 / 242;

interface WehunterLogoProps {
  variant?: "purple" | "white";
  height?: number;
  className?: string;
}

/** Isotipo "WeHunter." provisto por el cliente (public/logo), recortado sin el margen del
 * archivo original para que "height" corresponda al alto visual real del isotipo. */
export function WehunterLogo({ variant = "purple", height = 28, className }: WehunterLogoProps) {
  const width = Math.round(height * ASPECT_RATIO);
  return (
    <Image
      src={variant === "white" ? "/logo/wehunter-mark-white.png" : "/logo/wehunter-mark.png"}
      alt="WeHunter"
      width={width}
      height={height}
      className={className}
    />
  );
}
