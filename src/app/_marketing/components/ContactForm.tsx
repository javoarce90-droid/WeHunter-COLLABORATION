"use client";

import { useState } from "react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <form
      className="contact-form"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <div className="cf-title">¿Querés saber más? Escribinos.</div>
      <div className="cf-row">
        <div>
          <label className="cf-label">Nombre</label>
          <input
            className="cf-input"
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="cf-label">Email</label>
          <input
            className="cf-input"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      <div className="cf-field">
        <label className="cf-label">Mensaje</label>
        <textarea
          className="cf-textarea"
          rows={3}
          placeholder="Contanos cómo podemos ayudarte..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <div className="cf-captcha">
        <div className="cf-captcha-box" />
        <span>No soy un robot</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#bbb" }}>reCAPTCHA</span>
      </div>
      <button className="btn-pill" style={{ width: "100%", justifyContent: "center", fontSize: 13, padding: 11 }}>
        {sent ? "¡Gracias, te contactaremos pronto!" : "Enviar mensaje"}
      </button>
    </form>
  );
}
