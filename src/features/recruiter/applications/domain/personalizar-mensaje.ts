/** Reemplaza las variables de plantilla `{{candidato}}` y `{{puesto}}` por sus valores
 *  reales. Soporta reemplazo parcial: si `candidato` no viene (ej. un mensaje en lote a
 *  varios candidatos, donde cada uno recibe su propio nombre recién al enviar), esa variable
 *  queda intacta en el resultado — solo se resuelve lo que se puede resolver ahora. */
export function personalizarMensaje(
  template: string,
  valores: { candidato?: string; puesto?: string },
): string {
  let result = template;
  if (valores.candidato !== undefined) {
    result = result.replaceAll("{{candidato}}", valores.candidato);
  }
  if (valores.puesto !== undefined) {
    result = result.replaceAll("{{puesto}}", valores.puesto);
  }
  return result;
}
