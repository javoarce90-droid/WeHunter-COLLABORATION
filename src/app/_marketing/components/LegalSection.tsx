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
          <div className="legal-date">Última actualización: Junio de 2026</div>
          <div className="legal-body">
            <p>
              Los presentes Términos y Condiciones de Uso regulan el acceso,
              navegación y utilización de la plataforma tecnológica WeHunter,
              así como todos los servicios, funcionalidades, herramientas,
              aplicaciones, automatizaciones, integraciones y soluciones
              disponibles a través de ella. Al acceder, registrarse o utilizar
              la Plataforma, el Usuario declara haber leído, comprendido y
              aceptado íntegramente estos Términos y la Política de Privacidad
              vigente.
            </p>
            <h2>1. Identificación del Operador</h2>
            <p>
              WeHunter es una plataforma tecnológica operada por su titular y/o
              por la persona humana o jurídica responsable de su explotación
              comercial. Contacto: <strong>hola@we-hunter.com</strong>
            </p>
            <h2>2. Objeto de la Plataforma</h2>
            <p>
              WeHunter pone a disposición una plataforma SaaS destinada a
              facilitar la gestión integral de procesos de selección de
              personal, incluyendo: administración de candidatos, publicación de
              vacantes, seguimiento de procesos, organización de entrevistas,
              colaboración entre equipos, generación de informes, automatización
              de tareas, inteligencia artificial, integración con servicios
              externos, administración de bases de talento y gestión de
              clientes.
            </p>
            <p>
              WeHunter constituye exclusivamente una herramienta tecnológica. En
              ningún caso actúa como empleador, consultora de RRHH, agencia de
              colocación ni intermediario laboral. Toda decisión de contratación
              corresponde exclusivamente al Usuario.
            </p>
            <h2>3. Registro y Cuentas</h2>
            <p>
              Para acceder a determinadas funcionalidades es necesario crear una
              cuenta. El Usuario declara que toda la información suministrada
              será verdadera, exacta, completa y actualizada. Cada cuenta es
              personal e intransferible. El Usuario es responsable de mantener
              la confidencialidad de sus credenciales y de todas las actividades
              realizadas desde su cuenta. Ante cualquier acceso no autorizado,
              deberá comunicarlo de inmediato a WeHunter.
            </p>
            <h2>4. Planes, Suscripciones y Facturación</h2>
            <p>
              WeHunter puede ofrecer distintos planes, gratuitos o pagos, con
              diferentes funcionalidades y condiciones. Las características y
              precios serán los publicados al momento de la contratación. Las
              suscripciones pueden renovarse automáticamente cuando así se
              informe. La falta de pago puede dar lugar a la suspensión del
              acceso. Los importes abonados no serán reembolsables, salvo
              disposición legal aplicable.
            </p>
            <h2>5. Uso Permitido y Conductas Prohibidas</h2>
            <p>
              El Usuario se compromete a utilizar la Plataforma de forma
              responsable, conforme a la legislación aplicable y a estos
              Términos.
            </p>
            <p>
              <strong>Está prohibido:</strong> utilizar la Plataforma con fines
              ilícitos; cargar información falsa o fraudulenta; vulnerar
              derechos de terceros; infringir normativa de protección de datos;
              enviar spam; distribuir malware; intentar vulnerar la seguridad de
              la Plataforma; acceder sin autorización a cuentas ajenas; realizar
              ingeniería inversa; utilizar scrapers o robots automatizados;
              interferir con el funcionamiento del servicio; utilizar la
              Plataforma para desarrollar productos competidores.
            </p>
            <h2>6. Inteligencia Artificial</h2>
            <p>
              La Plataforma incorpora funcionalidades de IA que pueden incluir:
              generación de descripciones de puestos, análisis de CVs,
              elaboración de informes, clasificación de candidatos,
              recomendaciones, redacción de comunicaciones, automatización de
              procesos y análisis estadísticos.
            </p>
            <p>
              Los resultados generados por IA son herramientas de apoyo y no
              sustituyen el criterio profesional del Usuario. WeHunter no
              garantiza que dichos resultados sean completos, exactos o libres
              de errores. Toda decisión de selección corresponde exclusivamente
              al Usuario.{" "}
              <strong>
                WeHunter no adopta decisiones laborales de manera completamente
                automatizada.
              </strong>
            </p>
            <h2>7. Automatizaciones e Integraciones</h2>
            <p>
              La Plataforma puede ejecutar procesos automáticos (envío de
              correos, recordatorios, notificaciones, cambios de estado,
              sincronización con calendarios, flujos de trabajo) y puede
              integrarse con servicios de terceros como Google Workspace,
              Microsoft 365, servicios de videoconferencia, bolsas de empleo y
              proveedores de IA.
            </p>
            <p>
              WeHunter no controla ni garantiza la disponibilidad de servicios
              externos. Las interrupciones de dichos proveedores no generarán
              responsabilidad para WeHunter.
            </p>
            <h2>8. Contenido e Información de los Usuarios</h2>
            <p>
              El Usuario conserva la titularidad sobre toda la información
              incorporada a la Plataforma y otorga a WeHunter una licencia
              limitada para almacenarla y procesarla exclusivamente para prestar
              los servicios contratados. El Usuario es responsable de verificar
              la exactitud de la información, mantenerla actualizada y obtener
              las autorizaciones necesarias para tratar datos personales de
              terceros.
            </p>
            <h2>9. Propiedad Intelectual</h2>
            <p>
              Todos los derechos de propiedad intelectual relacionados con la
              Plataforma (software, código, algoritmos, modelos de IA, diseños,
              interfaces, marcas, logotipos, documentación y funcionalidades)
              pertenecen exclusivamente a WeHunter o a sus licenciantes. Nada en
              estos Términos implica cesión de dichos derechos al Usuario.
            </p>
            <h2>10. Disponibilidad del Servicio</h2>
            <p>
              WeHunter realizará esfuerzos razonables para mantener la
              Plataforma disponible de forma continua, pero no garantiza
              disponibilidad ininterrumpida. Las interrupciones por
              mantenimiento, actualizaciones, fallas técnicas o causas de fuerza
              mayor no generarán derecho a indemnización o reembolso, salvo
              disposición legal aplicable.
            </p>
            <h2>11. Suspensión y Cancelación de Cuentas</h2>
            <p>
              WeHunter puede suspender o cancelar una cuenta por incumplimiento
              de estos Términos, uso ilícito, actividades fraudulentas, falta de
              pago, vulneración de seguridad o requerimiento de autoridad
              competente. El Usuario puede solicitar la cancelación de su cuenta
              en cualquier momento, sin que ello extinga obligaciones
              pendientes.
            </p>
            <h2>12. Limitación de Responsabilidad</h2>
            <p>
              WeHunter no garantiza la contratación de candidatos, el éxito de
              procesos de selección, resultados comerciales, disponibilidad
              ininterrumpida ni la precisión absoluta de los resultados de IA.
              En la máxima medida permitida por la ley, WeHunter no será
              responsable por pérdidas económicas, lucro cesante, daños
              indirectos, pérdida de información, decisiones de contratación del
              Usuario ni actuaciones de terceros. La responsabilidad total de
              WeHunter no podrá exceder el importe abonado durante los doce (12)
              meses anteriores al hecho generador del reclamo.
            </p>
            <h2>13. Indemnidad</h2>
            <p>
              El Usuario se obliga a mantener indemne a WeHunter frente a
              cualquier reclamo, daño o gasto que se origine por: incumplimiento
              de estos Términos, uso indebido de la Plataforma, violación de
              derechos de terceros, tratamiento indebido de datos personales,
              información cargada en la Plataforma o decisiones adoptadas en
              procesos de selección.
            </p>
            <h2>14. Modificación de los Términos</h2>
            <p>
              WeHunter puede modificar estos Términos cuando resulte necesario.
              Cuando las modificaciones sean sustanciales, procurará informarlo
              previamente. La utilización de la Plataforma con posterioridad a
              las modificaciones implica la aceptación de los nuevos Términos.
            </p>
            <h2>15. Ley Aplicable y Jurisdicción</h2>
            <p>
              Estos Términos se rigen por las leyes de la República Argentina.
              Toda controversia será sometida a los Tribunales Ordinarios de la
              Ciudad Autónoma de Buenos Aires.
            </p>
            <h2>16. Contacto</h2>
            <p>
              Para consultas sobre estos Términos:
              <br />
              <strong>Email:</strong> hola@we-hunter.com
              <br />
              <strong>Sitio web:</strong> www.we-hunter.com
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
          <div className="legal-date">Última actualización: Junio de 2026</div>
          <div className="legal-body">
            <p>
              En WeHunter entendemos que la privacidad y la protección de los
              datos personales son fundamentales para generar relaciones de
              confianza con nuestros usuarios, clientes y candidatos. La
              presente Política explica de manera clara y transparente cómo
              recopilamos, utilizamos, almacenamos, protegemos y compartimos la
              información personal tratada a través de nuestra plataforma.
            </p>
            <h2>1. Responsable del Tratamiento</h2>
            <p>
              WeHunter es responsable del tratamiento de los datos personales
              que recopila directamente a través de su sitio web y de la
              plataforma.
            </p>
            <p>
              Para consultas relacionadas con privacidad o ejercicio de
              derechos: <strong>hola@we-hunter.com</strong>
            </p>
            <p>
              Cuando WeHunter procese información en nombre de sus clientes,
              actuará como Encargado del Tratamiento conforme a las
              instrucciones impartidas por el cliente responsable.
            </p>
            <h2>2. Principios de Privacidad</h2>
            <p>
              Nuestro tratamiento de datos personales se basa en los siguientes
              principios: <strong>Licitud</strong> (procesamos datos únicamente
              cuando existe una base legal); <strong>Transparencia</strong>{" "}
              (informamos qué recopilamos y por qué);{" "}
              <strong>Minimización</strong> (solicitamos únicamente la
              información necesaria); <strong>Seguridad</strong> (aplicamos
              medidas técnicas y organizativas razonables);{" "}
              <strong>Privacidad desde el diseño</strong> (la protección es
              parte del desarrollo de nuestros productos); y{" "}
              <strong>Mejora continua</strong> (revisamos periódicamente
              nuestras prácticas).
            </p>
            <h2>3. Alcance</h2>
            <p>
              Esta Política aplica a toda persona que interactúe con WeHunter:
              usuarios administradores, recruiters, consultoras, empresas,
              equipos de Talent Acquisition, Hiring Managers, candidatos y
              visitantes del sitio web. El uso de WeHunter implica la aceptación
              de esta Política.
            </p>
            <h2>4. Categorías de Datos que Recopilamos</h2>
            <p>
              <strong>Datos de identificación:</strong> nombre, email, teléfono,
              empresa, cargo, país, idioma y fotografía de perfil.
            </p>
            <p>
              <strong>Información profesional:</strong> CV, historial laboral,
              formación académica, certificaciones, competencias, idiomas,
              expectativas salariales, disponibilidad, portfolio, referencias y
              perfiles públicos.
            </p>
            <p>
              <strong>Datos de procesos de selección:</strong> vacantes,
              postulaciones, estados del pipeline, notas, evaluaciones,
              entrevistas, feedback, historial de comunicaciones y decisiones
              registradas.
            </p>
            <p>
              <strong>Información generada por IA:</strong> informes de
              entrevistas, resúmenes, análisis, rankings, scores, matching,
              recomendaciones y reportes. Estos resultados son herramientas de
              apoyo y no reemplazan el criterio profesional del usuario.
            </p>
            <p>
              <strong>Información técnica:</strong> dirección IP, navegador,
              sistema operativo, fecha y hora de acceso, registros de actividad
              y cookies.
            </p>
            <p>
              <strong>Información de integraciones:</strong> datos de
              calendarios, correos, videollamadas y otros servicios conectados,
              limitados a lo estrictamente necesario.
            </p>
            <h2>5. Finalidades del Tratamiento</h2>
            <p>
              WeHunter utiliza los datos para: crear y administrar cuentas,
              gestionar procesos de selección, organizar entrevistas,
              automatizar tareas, generar reportes, facilitar la comunicación
              entre usuarios, brindar soporte técnico, mejorar el rendimiento de
              la plataforma, cumplir obligaciones legales y prevenir fraudes. No
              utilizaremos datos para finalidades incompatibles sin informar
              previamente al usuario.
            </p>
            <h2>6. Inteligencia Artificial</h2>
            <p>
              WeHunter incorpora funcionalidades de IA para asistir a los
              usuarios en distintas etapas del proceso de selección. La IA podrá
              generar descripciones de puestos, analizar perfiles, elaborar
              resúmenes de entrevistas, detectar coincidencias entre candidatos
              y vacantes, y automatizar tareas repetitivas.
            </p>
            <p>
              Los resultados generados por IA son recomendaciones de apoyo y no
              representan decisiones definitivas. La decisión final respecto de
              la contratación, descarte o evaluación de un candidato corresponde
              exclusivamente al usuario responsable del proceso.{" "}
              <strong>
                WeHunter no adopta decisiones laborales de manera completamente
                automatizada.
              </strong>
            </p>
            <p>
              WeHunter no utiliza la información de sus clientes para entrenar
              modelos públicos de Inteligencia Artificial.
            </p>
            <h2>7. Proveedores Tecnológicos</h2>
            <p>
              Para operar la plataforma, WeHunter puede utilizar proveedores
              como OpenAI, Anthropic, Google, Microsoft, Amazon Web Services,
              Cloudflare, Supabase, Resend y otros equivalentes. Todos los
              proveedores deben mantener medidas razonables de seguridad y
              confidencialidad.
            </p>
            <h2>8. Integraciones con Servicios de Terceros</h2>
            <p>
              WeHunter puede integrarse con Google Calendar, Google Meet, Gmail,
              Microsoft Outlook, Microsoft Teams, Zoom, WhatsApp, LinkedIn,
              plataformas de empleo y otros servicios compatibles, cuando el
              usuario lo autorice. Cada integración accede únicamente a la
              información estrictamente necesaria. El usuario puede revocar
              estas autorizaciones en cualquier momento.
            </p>
            <h2>9. Compartición de Datos</h2>
            <p>
              WeHunter no vende datos personales. La información solo puede
              compartirse para prestar los servicios contratados, ejecutar
              integraciones autorizadas, cumplir obligaciones legales o atender
              requerimientos de autoridades competentes.
            </p>
            <h2>10. Propiedad y Confidencialidad</h2>
            <p>
              Toda la información incorporada por los clientes permanece bajo su
              titularidad. WeHunter no adquiere derechos de propiedad sobre
              dicha información y se compromete a tratarla con carácter
              confidencial, utilizándola únicamente para prestar los servicios
              contratados.
            </p>
            <h2>11. Conservación y Eliminación</h2>
            <p>
              Los datos se conservan únicamente durante el tiempo necesario para
              prestar los servicios, cumplir obligaciones legales o resolver
              controversias. Cuando un cliente solicite la eliminación de su
              información, WeHunter la realizará dentro de un plazo razonable,
              salvo obligación legal de conservación.
            </p>
            <h2>12. Seguridad</h2>
            <p>
              WeHunter implementa comunicación cifrada (HTTPS/TLS), control de
              acceso por roles, autenticación, registro de actividad, copias de
              seguridad y monitoreo de infraestructura. Ningún sistema garantiza
              protección absoluta frente a todos los riesgos de internet.
            </p>
            <h2>13. Derechos de los Titulares</h2>
            <p>
              Los titulares pueden ejercer los derechos de acceso,
              rectificación, actualización, eliminación, oposición, limitación,
              portabilidad y retiro del consentimiento enviando una solicitud a{" "}
              <strong>hola@we-hunter.com</strong>. Procuraremos responder dentro
              de un plazo razonable conforme a la normativa aplicable.
            </p>
            <h2>14. Cookies</h2>
            <p>
              WeHunter utiliza cookies para mantener sesiones, recordar
              preferencias, mejorar la navegación y obtener estadísticas de uso.
              El usuario puede administrar las cookies desde la configuración de
              su navegador.
            </p>
            <h2>15. Transferencias Internacionales</h2>
            <p>
              Debido al uso de proveedores tecnológicos internacionales,
              determinados datos pueden ser tratados en países distintos al de
              residencia del usuario. WeHunter procura que dichas transferencias
              cuenten con mecanismos adecuados de protección.
            </p>
            <h2>16. Modificaciones</h2>
            <p>
              WeHunter puede actualizar esta Política para reflejar cambios
              regulatorios, tecnológicos u operativos. La versión vigente estará
              siempre disponible en el sitio web. La continuidad en el uso de la
              plataforma implica la aceptación de la Política actualizada.
            </p>
            <h2>17. Contacto</h2>
            <p>
              Para consultas sobre privacidad o ejercicio de derechos:
              <br />
              <strong>Email:</strong> hola@we-hunter.com
              <br />
              <strong>Sitio web:</strong> www.we-hunter.com
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
