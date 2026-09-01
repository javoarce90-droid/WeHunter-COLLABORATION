/**
 * Deriva las variables CSS de marca del Career Site a partir de primaryColor/accentColor
 * (globals.css define --primary/--primary-hover/--primary-light como custom properties en
 * runtime vía @theme inline, así que sobreescribirlas en un contenedor alcanza para que
 * bg-primary/text-primary/etc. reflejen el color del workspace en toda esa subtree).
 */

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const int = parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function mix([r, g, b]: [number, number, number], target: [number, number, number], amount: number) {
  const m = (c: number, i: number) => Math.round(c + (target[i] - c) * amount);
  return `rgb(${m(r, 0)} ${m(g, 1)} ${m(b, 2)})`;
}

/** Luminancia relativa WCAG de un color sRGB (0 = negro, 1 = blanco). */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Tinta legible sobre `hex` (fondo de la CTA de marca del workspace). El workspace elige su
 * color libremente — si es claro (ej. amarillo, lima, blanco roto), texto blanco encima es
 * ilegible. Devolvemos blanco o la tinta oscura del design system según el contraste real.
 */
export function readableInkFor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  // Umbral ~0.42: por debajo el color es oscuro y gana el blanco; por encima gana la tinta.
  return relativeLuminance(rgb) > 0.42 ? "#0F0A1A" : "#ffffff";
}

export function deriveBrandVars(primaryColor?: string): Record<string, string> | undefined {
  const rgb = primaryColor ? hexToRgb(primaryColor) : null;
  if (!rgb) return undefined;
  const [r, g, b] = rgb;
  return {
    "--primary": primaryColor!,
    "--primary-hover": mix(rgb, [0, 0, 0], 0.18),
    "--primary-light": mix(rgb, [255, 255, 255], 0.92),
    "--primary-rgb": `${r}, ${g}, ${b}`,
    // Tinta legible sobre bg-primary en esta subtree (el default del design system asume
    // texto blanco; un workspace con color claro necesita tinta oscura).
    "--primary-contrast": readableInkFor(primaryColor!),
    "--focus-ring": `rgba(${r}, ${g}, ${b}, 0.2)`,
    "--selected-bg": `rgba(${r}, ${g}, ${b}, 0.06)`,
  };
}

/**
 * accentColor es opcional: si no está seteado, la CTA de postular usa el primary derivado.
 * Cuando está, fija también el color de texto legible sobre ese fondo (mismo criterio que
 * `--primary-contrast`) — sin esto, un accent claro deja "Postular" en blanco sobre blanco.
 */
export function accentStyle(
  accentColor?: string,
): { backgroundColor: string; color: string } | undefined {
  return accentColor && hexToRgb(accentColor)
    ? { backgroundColor: accentColor, color: readableInkFor(accentColor) }
    : undefined;
}
