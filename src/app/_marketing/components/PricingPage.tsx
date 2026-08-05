import Link from "next/link";
import "../pricing.css";
import { instrumentSerif, manrope, pacifico } from "../fonts";
import { WehunterLogo } from "@/components/ui/wehunter-logo";
import { ComparativeTable } from "./ComparativeTable";

const CONTACT_HREF = "/#contact-form-anchor";

const PLANS = [
  {
    name: "💜 Freelancer",
    desc: "Para Recruiters Independientes.",
    users: "Empezá gratis. Descubrí una nueva forma de reclutar. 🚀.",
    users2:
      "Probá WeHunter durante 15 días sin costo y descubrí cómo la IA puede ayudarte a encontrar talento más rápido.",
    features: [
      "1 usuario.",
      "ATS completo + Pipeline.",
      "Gestión de búsquedas.",
      "Talen Pool.",
      "Importación masiva de candidatos.",
      "CRM.",
      "Career Site.",
      "Comunidad WeHunter.",
      "IA incluida (con cupo mensual).",
      "Dashboard y métricas.",
      "Entrevistas, agenda y feedbacks.",
    ],
    notes: "🎁 15 días gratis. Sin tarjeta de crédito. Luego: USD 29,99 / mes.",
    ctaLabel: "Comenzar prueba gratuita",
    ctaVariant: "secondary" as const,
    featured: false,
  },
  {
    name: "👥 Teams",
    desc: "Para consultoras y equipos de Talent Acquisition.",
    users: "Potenciá el trabajo de tu equipo. 🤝.",
    users2: "Gestioná múltiples recruiters y centralizá todos los procesos.",
    features: [
      "Hasta 5 usuarios.",
      "Roles y permisos.",
      "Trabajo colaborativo.",
      "Asignación de búsquedas entre recruiters.",
      "IA con cupo ampliado.",
      "Soporte prioritario.",
      "Onboarding personalizado.",
    ],
    notes: "Precio según la cantidad de usuarios.",
    ctaLabel: "Contactar a ventas",
    ctaVariant: "primary" as const,
    featured: true,
  },
  {
    name: "🏢 Enterprise",
    desc: "Para empresas y organizaciones.",
    users:
      "Una solucion adaptada a la forma en que tu empresa contrata talento.",
    users2: "Diseñado para organizaciones que necesitan mayor escalabilidad.",
    features: [
      "Usuarios ilimitados.",
      "Branding corporativo.",
      "Integraciones específicas.",
      "API.",
      "Login corporativo (SSO).",
      "Automatizaciones avanzadas.",
      "SLA.",
      "Soporte dedicado.",
      "Desarrollo de funcionalidades a medida.",
    ],
    notes: "Propuesta personalizada.",
    ctaLabel: "Contactar a ventas",
    ctaVariant: "secondary" as const,
    featured: false,
  },
];

export function PricingPage() {
  return (
    <div
      className={`wh-pricing ${instrumentSerif.variable} ${manrope.variable} ${pacifico.variable}`}
    >
      <nav>
        <Link href="/" className="back-btn">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Volver</span>
        </Link>
        <Link href="/">
          <WehunterLogo height={26} priority />
        </Link>
        <Link href={CONTACT_HREF} className="demo-btn">
          Solicitar Demo
        </Link>
      </nav>

      <div className="page">
        <h1 className="page-title">Elegí el plan ideal para vos</h1>

        <div className="plans-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`plan-card${plan.featured ? " featured" : ""}`}
            >
              <div className="plan-name">{plan.name}</div>
              <div className="plan-desc">{plan.desc}</div>
              <div className="plan-users-first">
                <div className="plan-users">{plan.users}</div>
                <div className="plan-users">{plan.users2}</div>
              </div>
              <div className="plan-users-second">
                <div className="plan-includes-label">Incluye:</div>
                <ul className="plan-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
              <div className="plan-note">{plan.notes}</div>
              <Link
                href={CONTACT_HREF}
                className={`plan-cta ${plan.ctaVariant}`}
              >
                {plan.ctaLabel}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <ComparativeTable />
    </div>
  );
}
