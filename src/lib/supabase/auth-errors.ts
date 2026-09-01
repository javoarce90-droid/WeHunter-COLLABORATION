import type { AuthError } from "@supabase/supabase-js";

export interface MappedAuthError {
  message: string;
  field?: "email" | "password";
}

/**
 * Traduce un error de `supabase.auth.signUp` a un mensaje en español apto para mostrar al
 * usuario. Nunca reenviamos `error.message` crudo a la UI: puede venir vacío o no-humano —
 * por ejemplo un 5xx sin body legible llega como el literal `"{}"` (`@supabase/auth-js`
 * serializa el `Response` de error cuando no encuentra `msg`/`error`/`error_description`).
 * Visto en el incidente de SMTP de sep 2026, ver memoria `signup-500-smtp-incident-2026-09`.
 */
export function mapSignUpError(error: AuthError): MappedAuthError {
  if ((error.status ?? 0) >= 500) {
    return {
      message: "No pudimos crear tu cuenta en este momento. Probá de nuevo en unos minutos.",
    };
  }

  switch (error.code) {
    case "user_already_exists":
      return {
        message: "Ese email ya tiene una cuenta. Iniciá sesión, o registrate con un email distinto.",
        field: "email",
      };
    case "weak_password":
      return {
        message: "La contraseña es muy débil. Probá con una combinación más larga.",
        field: "password",
      };
    case "email_address_invalid":
    case "validation_failed":
      return { message: "Revisá el email ingresado.", field: "email" };
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return { message: "Hiciste muchos intentos seguidos. Esperá unos minutos y volvé a intentar." };
    case "signup_disabled":
    case "email_provider_disabled":
      return { message: "El registro no está disponible en este momento." };
    default:
      // Mensajes de Supabase que ya son legibles para un usuario final los dejamos pasar;
      // cualquier otra cosa (incluido un `"{}"`) cae al genérico.
      return {
        message: /^[A-ZÁÉÍÓÚÑ][^{}]{5,120}$/.test(error.message)
          ? error.message
          : "No pudimos crear tu cuenta. Probá de nuevo.",
      };
  }
}
