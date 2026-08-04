"use client";

import { useState, useTransition } from "react";
import { enviarContactoAction } from "../actions";

const MIN_MESSAGE_LENGTH = 50;

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [notRobot, setNotRobot] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    message.trim().length >= MIN_MESSAGE_LENGTH &&
    notRobot;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    start(async () => {
      setError(null);
      const res = await enviarContactoAction({ name, email, message });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSent(true);
    });
  }

  return (
    <form className="contact-form" onSubmit={submit}>
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
            type="email"
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
        <div className="cf-hint">
          {message.trim().length}/{MIN_MESSAGE_LENGTH} caracteres mínimos
        </div>
      </div>
      <label className="cf-captcha">
        <input
          type="checkbox"
          className="cf-captcha-box"
          checked={notRobot}
          onChange={(e) => setNotRobot(e.target.checked)}
        />
        <span>No soy un robot</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#bbb" }}>reCAPTCHA</span>
      </label>
      {error && <div className="cf-error">{error}</div>}
      <button
        type="submit"
        disabled={!canSubmit || pending || sent}
        className="btn-pill"
        style={{ width: "100%", justifyContent: "center", fontSize: 13, padding: 11 }}
      >
        {sent ? "¡Gracias, te contactaremos pronto!" : pending ? "Enviando..." : "Enviar mensaje"}
      </button>
    </form>
  );
}
