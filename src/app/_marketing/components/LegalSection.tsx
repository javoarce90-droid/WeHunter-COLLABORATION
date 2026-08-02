"use client";

import { useEffect, useState } from "react";
import { NoopLink } from "./NoopLink";
import { TerminosContent, PrivacidadContent } from "./legal-content";

type LegalId = "tyc" | "privacidad" | null;

export function LegalSection() {
  const [open, setOpen] = useState<LegalId>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setOpen("tyc");
        }}
      >
        Términos y Condiciones
      </a>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setOpen("privacidad");
        }}
      >
        Política de Privacidad
      </a>
      <NoopLink>Cookies</NoopLink>

      <div
        className={`legal-overlay${open === "tyc" ? " open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(null);
        }}
      >
        <div className="legal-modal">
          <button className="legal-close" onClick={() => setOpen(null)}>
            ✕
          </button>
          <TerminosContent />
        </div>
      </div>

      <div
        className={`legal-overlay${open === "privacidad" ? " open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(null);
        }}
      >
        <div className="legal-modal">
          <button className="legal-close" onClick={() => setOpen(null)}>
            ✕
          </button>
          <PrivacidadContent />
        </div>
      </div>
    </>
  );
}
