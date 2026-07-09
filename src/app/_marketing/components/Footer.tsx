import Link from "next/link";
import { ContactForm } from "./ContactForm";
import { LegalSection } from "./LegalSection";
import { NoopLink } from "./NoopLink";
import { WehunterLogo } from "@/components/ui/wehunter-logo";

export function Footer() {
  return (
    <footer>
      <div className="footer-grid">
        <div className="footer-left">
          <WehunterLogo height={28} />
          <div className="footer-mission" style={{ marginTop: 14 }}>
            <strong style={{ display: "block", fontSize: 14, color: "var(--ink)", marginBottom: 8 }}>
              El sistema operativo para recruiters.
            </strong>
            Dejá que WeHunter se ocupe de la operación para que vos puedas enfocarte en lo
            que realmente importa: las personas.
            <br />
            <br />
            Menos herramientas. Más control. Mejores contrataciones.
          </div>
        </div>
        <div id="contact-form-anchor">
          <ContactForm />
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "36px 24px 0" }}>
          <div className="footer-nav-cols">
            <div className="footer-col">
              <div className="footer-col-t">Producto</div>
              <a href="#soluciones">Soluciones</a>
              <a href="#demo">Demo</a>
            </div>
            <div className="footer-col">
              <div className="footer-col-t">Comunidad</div>
              <NoopLink>Explorar Recruiters</NoopLink>
            </div>
            <div className="footer-col">
              <div className="footer-col-t">Empleos</div>
              <NoopLink>Buscar Empleos</NoopLink>
              <Link href="/c/register">Crear Cuenta Candidato</Link>
            </div>
            <div className="footer-col">
              <div className="footer-col-t">Empresa</div>
              <a href="#contact-form-anchor">Sobre WeHunter</a>
              <a href="#contact-form-anchor">Contacto</a>
            </div>
            <div className="footer-col">
              <div className="footer-col-t">Legal</div>
              <LegalSection />
            </div>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <div className="footer-copy">© WeHunter 2026</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a
              href="https://linkedin.com/company/wehunter"
              target="_blank"
              rel="noopener"
              title="LinkedIn"
              className="footer-social-icon"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a
              href="https://instagram.com/wehunter"
              target="_blank"
              rel="noopener"
              title="Instagram"
              className="footer-social-icon"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
          </div>
          <div className="footer-tag">Diseñado por recruiters para recruiters.</div>
        </div>
      </div>
    </footer>
  );
}
