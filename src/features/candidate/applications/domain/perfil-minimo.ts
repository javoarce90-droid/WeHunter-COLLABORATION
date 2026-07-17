export interface PerfilMinimo {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  cvUrl: string | null;
}

const CAMPOS: { key: keyof PerfilMinimo; label: string }[] = [
  { key: "fullName", label: "nombre" },
  { key: "email", label: "email" },
  { key: "phone", label: "teléfono" },
  { key: "location", label: "ubicación" },
  { key: "cvUrl", label: "CV" },
];

export function perfilListoParaPostular(p: PerfilMinimo): { ok: boolean; faltantes: string[] } {
  const faltantes = CAMPOS.filter(({ key }) => {
    const value = p[key];
    return typeof value !== "string" || value.trim().length === 0;
  }).map(({ label }) => label);

  return { ok: faltantes.length === 0, faltantes };
}
