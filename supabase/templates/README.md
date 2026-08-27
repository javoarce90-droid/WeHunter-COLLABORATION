# Templates de email de Supabase Auth

Copia de referencia con el branding de WeHunter. **No se aplican solos**: el proyecto es
Supabase hosteado, así que hay que pegar cada archivo a mano en el dashboard →
**Authentication → Emails → Templates**. Este directorio es la fuente de verdad del contenido;
si editás en el dashboard, actualizá también acá.

## Cuáles usa la app

| Template | Archivo | ¿Lo dispara la app? |
|---|---|---|
| Confirm signup | `confirm-signup.html` | **Sí** — `signUp()` (recruiter y candidato). |
| Reset Password | `reset-password.html` | **Sí** — `resetPasswordForEmail()` ("Olvidé mi contraseña"). |
| Magic Link | `magic-link.html` | No — el login es con contraseña. Branded por las dudas. |
| Change Email | `change-email.html` | No — no hay cambio de email en la app. |
| Invite user | `invite.html` | No — las invitaciones al equipo se mandan desde el código con copy por rol (`features/recruiter/team/data/email-client.ts`). Esto solo cubre el botón "Invite" del dashboard. |
| Reauthentication | `reauthentication.html` | No — no hay reautenticación. |

## Subject + preheader de cada uno

| Template | Subject | Preheader (va en el `<span>` oculto del HTML) |
|---|---|---|
| Confirm signup | `✉️ Confirmá tu dirección de email` | Solo falta un paso para activar tu cuenta. |
| Reset Password | `🔐 Restablecé tu contraseña` | Recibimos una solicitud para actualizar tu contraseña. |
| Magic Link | `🔗 Tu enlace de acceso a WeHunter` | Entrá sin contraseña con este enlace. |
| Change Email | `✉️ Confirmá tu nueva dirección de email` | Confirmá el cambio para seguir usando tu cuenta. |
| Invite user | `👋 Te invitaron a WeHunter` | Activá tu acceso para empezar. |
| Reauthentication | `🔐 Confirmá que sos vos` | Tu código de verificación de WeHunter. |

## Variables usadas

- `{{ .ConfirmationURL }}` — el link de acción (confirmar / resetear / etc.). **El botón
  principal siempre apunta acá**, no a `/login` ni a otra ruta, o el mail deja de servir.
- `{{ .SiteURL }}` — la Site URL configurada en Authentication → URL Configuration.
- `{{ .Email }}` / `{{ .NewEmail }}` — email actual / nuevo (change email).
- `{{ .Token }}` — código de 6 dígitos (reauthentication).
- `{{ if .Data.full_name }}…{{ end }}` — nombre del usuario (viene de `raw_user_meta_data`,
  lo setea el `signUp` con `options.data.full_name`). El `if` cubre el caso sin nombre.

## Config relacionada (dashboard, no en estos archivos)

- **Site URL** (`Authentication → URL Configuration`): debería ser `https://www.we-hunter.com`
  (dominio canónico con `www`). Sin barra final — si no, `{{ .SiteURL }}/login` queda `//login`.
- **A dónde cae el usuario después de confirmar el signup**: hoy `signUp()` no pasa
  `emailRedirectTo`, así que `{{ .ConfirmationURL }}` redirige a la Site URL. Para que caiga
  en `/login`, o se agrega `emailRedirectTo` en `src/app/(auth)/actions.ts` /
  `src/app/c/actions.ts`, o se ajusta la config de redirect.
- **SMTP**: Supabase Auth → SMTP Settings apunta a SendGrid (`smtp.sendgrid.net:587`, user
  `apikey`). Remitente verificado: `dev@we-hunter.com` hasta que se verifique el dominio.
- **Rate limit**: con SMTP propio, Authentication → Rate Limits deja subir el tope de emails/hora.

## Emails que NO son de Supabase Auth (los manda la app)

Estos van por SendGrid API o por el Gmail conectado del recruiter, no por estos templates:
invitación al equipo (por rol), carta de oferta, email a cliente, aviso de cambio de etapa,
shortlist compartida, acceso a búsqueda para cliente/HM sin cuenta (tokens propios). Si se
quiere unificar el look, ahí conviene un dynamic template de SendGrid (`template_id`) — es
trabajo de código aparte.
