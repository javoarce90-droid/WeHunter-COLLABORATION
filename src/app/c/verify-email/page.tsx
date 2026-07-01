"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MOCK_SESSION_COOKIE } from "@/features/candidate/profile/schema";
import Link from "next/link";

// Server action para activar la sesión mock al verificar el email
async function verifyAndLoginAction() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.set(MOCK_SESSION_COOKIE, "mock-user-id", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/portal");
}

export default async function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Decorative Blur Circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-ai/10 rounded-full blur-3xl" />

      <div className="relative max-w-md w-full bg-surface border border-border/50 rounded-2xl p-8 shadow-2xl backdrop-blur-md flex flex-col items-center text-center">
        {/* Animated Verification Container */}
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <svg
            className="w-10 h-10 text-primary animate-bounce"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 19v-8.93a2 2 0 01.89-1.664l8-4.8a2 2 0 012.22 0l8 4.8A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.5 0l-2.25 1.5"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold font-display text-text mb-2">
          Verificá tu correo electrónico
        </h1>
        <p className="text-sm text-muted mb-6 max-w-xs">
          Hemos enviado un código ficticio a tu casilla. Presioná el botón de abajo para verificar tu cuenta al instante y acceder al portal.
        </p>

        {/* Formulario que dispara la Server Action mock */}
        <form action={verifyAndLoginAction} className="w-full flex flex-col gap-3">
          <button
            type="submit"
            className="w-full h-11 bg-primary hover:bg-primary-hover active:scale-[0.98] text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center hover:cursor-pointer"
          >
            Verificar y Acceder
          </button>
          
          <Link
            href="/c/login"
            className="text-xs text-muted hover:text-text transition-colors mt-2"
          >
            Volver al Inicio de Sesión
          </Link>
        </form>
      </div>
    </div>
  );
}
