"use client";

import { useEffect, useState } from "react";
import { NoopLink } from "./NoopLink";

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
          <div className="legal-title">Términos y Condiciones de Uso</div>
          <div className="legal-date">Última actualización: 1/10/2025</div>
          <div className="legal-body">
            <h2>1. Alcance y Objeto</h2>
            <p>
              WeHunter es una plataforma tecnológica, operada por Verónica Mabel Tettenborn,
              CUIT 27337230151, cuyo objeto exclusivo es facilitar la conexión digital entre
              Empresas, Reclutadores freelance y Postulantes en el marco de servicios de
              selección de personal.
            </p>
            <p>
              <strong>Exclusión de Relación Contractual.</strong> La Plataforma NO participa
              ni se involucra en las relaciones comerciales, contractuales, laborales o
              económicas que se establezcan entre sus Usuarios. WeHunter no es agente,
              mandatario, fiduciario, representante, intermediario de pago, ni parte
              contractual en los acuerdos celebrados entre Usuarios.
            </p>
            <p>
              <strong>Aceptación.</strong> Al registrarse o utilizar la Plataforma, el
              Usuario declara expresamente haber leído, comprendido y aceptado en su
              totalidad estos Términos y Condiciones de Uso, los cuales revisten carácter
              vinculante.
            </p>
            <h2>2. Definiciones</h2>
            <ul>
              <li>
                <strong>Plataforma:</strong> El sitio web www.we-hunter.com y todos los
                servicios y funcionalidades digitales asociados.
              </li>
              <li>
                <strong>Empresa (Usuario Empresa):</strong> Persona jurídica o humana que
                publica Vacantes y contrata servicios de reclutamiento.
              </li>
              <li>
                <strong>Reclutador (Usuario Reclutador):</strong> Profesional independiente
                que ofrece y ejecuta servicios de reclutamiento o sourcing.
              </li>
              <li>
                <strong>Postulante (Usuario Postulante):</strong> Candidato cuyo perfil es
                cargado en la Plataforma para ser presentado a una Empresa.
              </li>
              <li>
                <strong>Orden de Servicio (O.D.S.):</strong> Documento digital que formaliza
                los términos acordados directamente entre Empresa y Reclutador.
              </li>
            </ul>
            <h2>3. Roles y Responsabilidades</h2>
            <p>
              <strong>Empresa:</strong> Es el único responsable de verificar la identidad,
              experiencia y referencias del Reclutador contratado, exigirle la factura
              correspondiente y garantizar el cumplimiento satisfactorio del servicio.
            </p>
            <p>
              <strong>Reclutador:</strong> Es el único y exclusivo responsable de cumplir con
              los servicios comprometidos, emitir la factura legal y cumplir con TODAS las
              obligaciones fiscales, tributarias y previsionales derivadas de su actividad.
              WeHunter se deslinda de toda responsabilidad laboral o fiscal entre Reclutador
              y Empresa.
            </p>
            <p>
              <strong>Postulante:</strong> Es el único responsable de la veracidad, exactitud
              y actualización de la información de su perfil. Entiende que WeHunter no es su
              empleador ni agencia de colocación.
            </p>
            <h2>4. Pagos y Desvinculación Fiscal</h2>
            <p>
              Los pagos por servicios de reclutamiento se realizan directamente entre Empresa
              y Reclutador. WeHunter <strong>NO</strong> actúa como agente de pago, ni
              percibe, retiene, distribuye ni gestiona fondos en representación de las
              partes. WeHunter cobra exclusivamente por sus propios servicios (suscripciones,
              publicación de vacantes) a través de MercadoPago u otros medios habilitados.
            </p>
            <h2>5. Conductas Prohibidas</h2>
            <ul>
              <li>Desviar o eludir acuerdos o pagos fuera de la Plataforma.</li>
              <li>
                Utilizar datos de contacto de otros Usuarios con fines distintos a los
                previstos.
              </li>
              <li>Publicar información falsa, difamatoria, engañosa o inexacta.</li>
              <li>Intentar acceder o interferir con la cuenta de otro Usuario.</li>
            </ul>
            <p>
              El incumplimiento puede derivar en suspensión o eliminación de la cuenta, sin
              derecho a reembolso.
            </p>
            <h2>6. Propiedad Intelectual</h2>
            <p>
              Todos los contenidos, marcas, logotipos, diseños, software y herramientas
              tecnológicas de la Plataforma son propiedad exclusiva de WeHunter o de sus
              licenciantes. Su reproducción o uso no autorizado está estrictamente prohibido.
            </p>
            <h2>7. Jurisdicción y Ley Aplicable</h2>
            <p>
              Estos Términos se rigen por las leyes de la República Argentina. Toda
              controversia será resuelta por los Tribunales Nacionales con asiento en la
              Ciudad Autónoma de Buenos Aires (CABA).
            </p>
            <p>
              <strong>Contacto:</strong> soporte@wehunter.com
            </p>
            <h2>8. Protección de Datos Personales</h2>
            <p>
              El tratamiento de datos personales se rige por la Política de Privacidad de
              WeHunter, en cumplimiento de la Ley Nacional N° 25.326. Al aceptar estos
              Términos, el Usuario también acepta expresamente dicha Política.
            </p>
          </div>
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
          <div className="legal-title">Política de Privacidad</div>
          <div className="legal-date">Última actualización: 1/10/2025</div>
          <div className="legal-body">
            <h2>1. Responsable del Tratamiento</h2>
            <p>
              <strong>Nombre:</strong> Verónica Mabel Tettenborn (Operadora de la Plataforma
              WeHunter)
              <br />
              <strong>CUIT/CUIL:</strong> 27337230151
              <br />
              <strong>Domicilio Legal:</strong> Paysandu 1625, Buenos Aires, CABA.
              <br />
              <strong>Contacto:</strong> veronica@wehunter.com
            </p>
            <h2>2. Datos Recolectados</h2>
            <ul>
              <li>
                <strong>Reclutadores:</strong> Datos de identificación, contacto,
                profesionales, de facturación y de reputación.
              </li>
              <li>
                <strong>Empresas:</strong> Razón Social, CUIT, datos de contacto y de
                facturación.
              </li>
              <li>
                <strong>Postulantes:</strong> Datos de identificación, contacto, perfil
                profesional y académico (CV completo).
              </li>
              <li>
                <strong>Datos de uso:</strong> IP, navegador, historial de Chat (solo con
                fines de verificación ante disputas).
              </li>
            </ul>
            <h2>3. Finalidad del Tratamiento</h2>
            <ul>
              <li>
                <strong>Ejecución contractual:</strong> Crear cuentas, validar perfiles y
                posibilitar la O.D.S.
              </li>
              <li>
                <strong>Prestación del servicio:</strong> Transferir perfiles de Candidatos a
                Empresas y Reclutadores.
              </li>
              <li>
                <strong>Seguridad y prevención de fraude:</strong> Revisión del Chat
                exclusivamente para resolución de disputas.
              </li>
              <li>
                <strong>Mejora y comunicación:</strong> Análisis de uso y comunicaciones
                relacionadas con el servicio.
              </li>
            </ul>
            <h2>4. Derechos del Titular (ARSPO)</h2>
            <p>
              Podés ejercer tus derechos de acceso, rectificación y supresión de datos
              enviando solicitud escrita con copia de DNI a{" "}
              <strong>veronica@wehunter.com</strong>.
            </p>
            <p>
              En caso de reclamo no atendido, podés recurrir a la{" "}
              <strong>Agencia de Acceso a la Información Pública (AAIP)</strong>, órgano de
              control de la Ley N° 25.326.
            </p>
            <h2>5. Transferencia de Datos</h2>
            <p>
              Los datos del Postulante son transferidos al Reclutador y, por autorización de
              ambos, a la Empresa para los procesos de selección. Esta transferencia es el
              objeto exclusivo de la Plataforma.
            </p>
            <p>
              En caso de alojamiento en servidores fuera de Argentina, se garantizará un
              nivel adecuado de protección conforme a la Ley de Protección de Datos.
            </p>
            <h2>6. Conservación de Datos</h2>
            <p>
              Los datos se conservarán mientras la cuenta del Usuario esté activa y durante
              el tiempo necesario para cumplir obligaciones legales y contractuales.
            </p>
            <h2>7. Cookies</h2>
            <p>
              WeHunter utiliza cookies y tecnologías similares para funcionalidad y análisis.
              Para información detallada, consultá nuestra Política de Cookies.
            </p>
            <h2>8. Contacto</h2>
            <p>
              <strong>Email:</strong> veronica@wehunter.com
              <br />
              <strong>Domicilio:</strong> Paysandu 1625, Buenos Aires, CABA.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
