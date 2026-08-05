/**
 * wa.me solo acepta dígitos (código de país + número, sin "+" ni separadores). El teléfono
 * es texto libre cargado por el recruiter — hacemos un best-effort, no validamos formato.
 */
export function waHref(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}
