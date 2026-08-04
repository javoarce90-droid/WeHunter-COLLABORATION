import type { OrgRole } from "../domain/gestionar-equipo";

/**
 * Copy corto por rol para el email de invitación — mismo criterio que el mock del prototipo
 * (`INV_MAIL`): describe en una frase qué va a poder hacer la persona invitada.
 */
const ROLE_INVITE_COPY: Record<OrgRole, { subject: string; body: string }> = {
  owner: { subject: "Te dieron acceso de Propietario", body: "administrar todo el workspace" },
  admin: {
    subject: "Te dieron acceso de Administrador",
    body: "gestionar el espacio de trabajo, administrar usuarios y supervisar los procesos del equipo",
  },
  recruiter: {
    subject: "Te sumaron al equipo de Recruiting",
    body: "gestionar búsquedas, candidatos y procesos de selección junto al equipo",
  },
  sourcer: {
    subject: "Te sumaron como Sourcer",
    body: "cargar y proponer candidatos al equipo",
  },
  consultant: {
    subject: "Te invitaron a colaborar en una búsqueda",
    body: "gestionar los candidatos de las búsquedas que te asignen",
  },
  hiring_manager: {
    subject: "Te invitaron como Hiring Manager",
    body: "ver y decidir sobre los candidatos que te compartan",
  },
  viewer: {
    subject: "Te dieron acceso de solo lectura",
    body: "consultar procesos y reportes del equipo",
  },
};

function invitationEmailHtml(args: {
  inviterName: string;
  organizationName: string;
  role: OrgRole;
  acceptUrl: string;
  from: string;
}): string {
  const { subject, body } = ROLE_INVITE_COPY[args.role];
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F1F3F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
      <div style="padding:22px 26px;border-bottom:1px solid #E5E7EB;">
        <div style="font-size:17px;font-weight:600;color:#0F0A1A;">${subject}</div>
        <div style="font-size:12.5px;color:#6B6578;margin-top:6px;">WeHunter &lt;${args.from}&gt;</div>
      </div>
      <div style="padding:26px;font-size:14px;line-height:1.65;color:#141413;">
        <div style="text-align:center;margin-bottom:18px;">
          <div style="display:inline-block;width:42px;height:42px;border-radius:11px;background:#7B2FDB;color:#fff;font-weight:800;font-size:20px;line-height:42px;">W</div>
        </div>
        <p style="margin:0 0 12px;">Hola,</p>
        <p style="margin:0 0 12px;"><strong>${args.inviterName}</strong> te invitó a <strong>${args.organizationName}</strong> en WeHunter. Vas a poder ${body}.</p>
        <p style="margin:0 0 20px;">Activá tu acceso para empezar:</p>
        <div style="text-align:center;">
          <a href="${args.acceptUrl}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;background:#7B2FDB;color:#fff;border-radius:9px;text-decoration:none;">Activar acceso</a>
        </div>
        <p style="margin:22px 0 0;font-size:12px;color:#6B6578;">Si no esperabas esta invitación, ignorá este mensaje. El link vence en 7 días.</p>
      </div>
    </div>
  </div>
</body></html>`;
}

/**
 * Envía el email de invitación por SendGrid (API REST directa — un solo POST no justifica
 * agregar `@sendgrid/mail`). Best-effort: si falla, la invitación en la app queda igual creada
 * (se puede "Reenviar" desde `/team`), mismo criterio que el sync de Google Calendar.
 */
export async function sendInvitationEmail(args: {
  to: string;
  inviterName: string;
  organizationName: string;
  role: OrgRole;
  acceptUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return { ok: false, error: "SendGrid no está configurado." };

  const from = process.env.SENDGRID_FROM_EMAIL ?? "dev@we-hunter.com";
  const { subject } = ROLE_INVITE_COPY[args.role];

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: args.to }] }],
      from: { email: from, name: "WeHunter" },
      subject,
      content: [
        {
          type: "text/html",
          value: invitationEmailHtml({ ...args, from }),
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, error: `SendGrid respondió ${res.status}: ${detail.slice(0, 300)}` };
  }
  return { ok: true };
}
