import { Reveal } from "./Reveal";

export function FinalCta() {
  return (
    <section>
      <div className="sec">
        <Reveal className="final-cta">
          <div className="glow" />
          <h2>
            Si querés cerrar más búsquedas,
            <br />
            empezá por acá.
          </h2>
          <p>
            Probá WeHunter gratis y descubrí cómo se siente gestionar todo el proceso de
            contratación desde una única plataforma.
          </p>
          <div className="final-btns">
            <a className="btn-white" href="#contact-form-anchor">
              Contactanos →
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
