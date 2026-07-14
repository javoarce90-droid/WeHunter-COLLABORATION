import Link from "next/link";
import "../pricing.css";
import { instrumentSerif, manrope, pacifico } from "../fonts";
import { WehunterLogo } from "@/components/ui/wehunter-logo";

const CONTACT_HREF = "/#contact-form-anchor";

const PLANS = [
  {
    name: "Freelancer",
    desc: "Ideal para Recruiters Independientes. Gestioná todo tu proceso desde una única plataforma.",
    users: "Hasta 3 usuarios recruiter",
    features: [
      "Pricing entry level. Podemos empezar gratis",
      "Funcionando en menos de 24 hs",
      "Sin contrato",
      "Soporte por email",
      "Onboarding incluido",
    ],
    ctaLabel: "Empezar gratis",
    ctaVariant: "secondary" as const,
    featured: false,
  },
  {
    name: "Professional",
    desc: "Ideal para Equipos de Talent Acquisition y Consultoras con operaciones de recruiting dinámicas.",
    users: "4–7 usuarios recruiter",
    features: [
      "Integraciones con tools y herramientas de la empresa",
      "Onboarding personalizado",
      "Soporte prioritario 24/7",
      "Sin permanencia mínima",
    ],
    ctaLabel: "Solicitar Demo",
    ctaVariant: "primary" as const,
    featured: true,
  },
  {
    name: "Enterprise",
    desc: "Empresas que tienen una gestión de recruiting fluida y de alta demanda.",
    users: "8+ usuarios recruiter",
    features: [
      "Integraciones con tu ATS actual",
      "Onboarding personalizado",
      "Soporte prioritario 24/7",
      "Personalizaciones",
      "Desarrollos personalizados en features",
    ],
    ctaLabel: "Solicitar Demo",
    ctaVariant: "secondary" as const,
    featured: false,
  },
];

const PLAN_NOTE =
  "** Desarrollos personalizados en features tiene un presupuesto adicional";

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
          <WehunterLogo height={26} />
        </Link>
        <Link href={CONTACT_HREF} className="demo-btn">
          Solicitar Demo
        </Link>
      </nav>

      <div className="page">
        <h1 className="page-title">
          Elegí según
          <br />
          tu equipo
        </h1>

        <div className="plans-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`plan-card${plan.featured ? " featured" : ""}`}
            >
              <div className="plan-name">{plan.name}</div>
              <div className="plan-desc">{plan.desc}</div>
              <div className="plan-users">{plan.users}</div>
              <div className="plan-includes-label">Incluye:</div>
              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <div className="plan-note">{PLAN_NOTE}</div>
              <Link href={CONTACT_HREF} className={`plan-cta ${plan.ctaVariant}`}>
                {plan.ctaLabel}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
