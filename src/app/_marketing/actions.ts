"use server";

import { z } from "zod";

const CONTACT_TO_EMAIL = "hola@we-hunter.com";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Ingresá tu nombre."),
  email: z.string().trim().email("Email inválido."),
  message: z.string().trim().min(50, "El mensaje debe tener al menos 50 caracteres."),
});

function contactEmailHtml(args: { name: string; email: string; message: string }): string {
  const escaped = args.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F1F3F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
      <div style="padding:22px 26px;border-bottom:1px solid #E5E7EB;">
        <div style="font-size:17px;font-weight:600;color:#0F0A1A;">Nuevo mensaje de contacto (landing)</div>
      </div>
      <div style="padding:26px;font-size:14px;line-height:1.65;color:#141413;">
        <p style="margin:0 0 8px;"><strong>Nombre:</strong> ${args.name}</p>
        <p style="margin:0 0 16px;"><strong>Email:</strong> ${args.email}</p>
        <p style="margin:0 0 6px;"><strong>Mensaje:</strong></p>
        <p style="margin:0;white-space:pre-wrap;">${escaped}</p>
      </div>
    </div>
  </div>
</body></html>`;
}

/**
 * Envía el mensaje del formulario de contacto por SendGrid (API REST directa, mismo patrón
 * que `sendInvitationEmail` en team/data/email-client.ts — un solo POST no justifica agregar
 * `@sendgrid/mail`). El remitente responde a la dirección que dejó la persona (`reply_to`).
 */
async function sendContactEmail(args: {
  name: string;
  email: string;
  message: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return { ok: false, error: "SendGrid no está configurado." };

  const from = process.env.SENDGRID_FROM_EMAIL ?? "dev@we-hunter.com";

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: CONTACT_TO_EMAIL }] }],
      from: { email: from, name: "WeHunter — Landing" },
      reply_to: { email: args.email, name: args.name },
      subject: `Nuevo mensaje de contacto de ${args.name}`,
      content: [{ type: "text/html", value: contactEmailHtml(args) }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, error: `SendGrid respondió ${res.status}: ${detail.slice(0, 300)}` };
  }
  return { ok: true };
}

export async function enviarContactoAction(input: {
  name: string;
  email: string;
  message: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  return sendContactEmail(parsed.data);
}
