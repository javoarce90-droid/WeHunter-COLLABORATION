"use client";

import { useState } from "react";
import Link from "next/link";
import { NoopLink } from "./NoopLink";
import { WehunterLogo } from "@/components/ui/wehunter-logo";

export function Nav() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="nav">
      <div className="nav-inner">
        <WehunterLogo height={30} priority />

        {/* Botón Hamburguesa (Móvil) */}
        <button
          className={`hamburger-btn ${isOpen ? "open" : ""}`}
          onClick={toggleMenu}
          aria-label="Abrir o cerrar menú de navegación"
        >
          <span />
          <span />
          <span />
        </button>

        {/* Menú de enlaces + Botón */}
        <div className={`nav-menu ${isOpen ? "active" : ""}`}>
          <div className="nav-links">
            <div onClick={closeMenu}>
              <NoopLink message="Comunidad próximamente!">Comunidad</NoopLink>
            </div>
            <div onClick={closeMenu}>
              <NoopLink message="Portal de empleos próximamente!">
                Empleos
              </NoopLink>
            </div>
            <Link href="/precios" onClick={closeMenu}>
              Precios
            </Link>
            {/* Oculto a propósito (temporal, hasta que la app esté productiva): que nadie
                se cree una cuenta fácil desde la landing pública. La ruta /login sigue viva. */}
          </div>

          <a
            className="btn-pill"
            href="#contact-form-anchor"
            onClick={closeMenu}
          >
            Solicitar Demo
            <span className="arrow">→</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
