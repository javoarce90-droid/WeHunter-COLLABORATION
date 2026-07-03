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

export function deriveBrandVars(primaryColor?: string): Record<string, string> | undefined {
  const rgb = primaryColor ? hexToRgb(primaryColor) : null;
  if (!rgb) return undefined;
  const [r, g, b] = rgb;
  return {
    "--primary": primaryColor!,
    "--primary-hover": mix(rgb, [0, 0, 0], 0.18),
    "--primary-light": mix(rgb, [255, 255, 255], 0.92),
    "--primary-rgb": `${r}, ${g}, ${b}`,
    "--focus-ring": `rgba(${r}, ${g}, ${b}, 0.2)`,
    "--selected-bg": `rgba(${r}, ${g}, ${b}, 0.06)`,
  };
}

/** accentColor es opcional: si no está seteado, la CTA de postular usa el primary derivado. */
export function accentStyle(accentColor?: string): { backgroundColor: string } | undefined {
  return accentColor && hexToRgb(accentColor) ? { backgroundColor: accentColor } : undefined;
}
