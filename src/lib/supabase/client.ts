"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para el navegador (componentes cliente). Solo para Auth en el
 * cliente cuando haga falta. Las operaciones de datos van por server actions → domain.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
