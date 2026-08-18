// Dimensiones mínimas de la portada: se muestra como banner ancho (ver CareerSiteHeader,
// `h-40`/`h-56` a lo largo de todo el sitio) y también se usa como og:image al compartir el
// link en WhatsApp/LinkedIn. Una imagen más chica se ve borrosa/pixelada al estirarla — mejor
// rechazarla acá con un mensaje explícito que dejarla subir y que se vea rota sin explicación.
export const COVER_MIN_WIDTH = 600;
export const COVER_MIN_HEIGHT = 200;

export function validarDimensionesPortada(
  width: number,
  height: number,
): { ok: true } | { ok: false; error: string } {
  if (width < COVER_MIN_WIDTH || height < COVER_MIN_HEIGHT) {
    return {
      ok: false,
      error:
        `La portada necesita al menos ${COVER_MIN_WIDTH}×${COVER_MIN_HEIGHT}px ` +
        `(esta imagen es de ${width}×${height}px).`,
    };
  }
  return { ok: true };
}
