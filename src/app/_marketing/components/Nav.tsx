import Link from "next/link";
import { NoopLink } from "./NoopLink";
import { WehunterLogo } from "@/components/ui/wehunter-logo";

export function Nav() {
  return (
    <nav
      className="nav"
      style={{
        position: "static",
        background: "#fff",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="nav-inner">
        <WehunterLogo height={30} />
        <div className="nav-links">
          <a href="#soluciones">Soluciones</a>
          <NoopLink message="Comunidad próximamente!">Comunidad</NoopLink>
          <NoopLink message="Portal de empleos próximamente!">
            Empleos
          </NoopLink>
          <a href="#contact-form-anchor">Precios</a>
          <Link href="/login">Iniciar Sesión</Link>
        </div>
        <a className="btn-pill" href="#contact-form-anchor">
          Solicitar Demo
        </a>
      </div>
    </nav>
  );
}
