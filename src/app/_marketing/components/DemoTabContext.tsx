"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type DemoTabId =
  | "dashboard"
  | "busqueda"
  | "talento"
  | "clientes"
  | "equipo"
  | "candidato"
  | "entrevistas"
  | "solicitudes"
  | "notificaciones"
  | "asistente";

interface DemoTabContextValue {
  activeTab: DemoTabId;
  setActiveTab: (tab: DemoTabId) => void;
}

const DemoTabContext = createContext<DemoTabContextValue | null>(null);

export function DemoTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<DemoTabId>("dashboard");
  const value = useMemo(() => ({ activeTab, setActiveTab }), [activeTab]);

  return (
    <DemoTabContext.Provider value={value}>{children}</DemoTabContext.Provider>
  );
}

export function useDemoTab() {
  const ctx = useContext(DemoTabContext);
  if (!ctx) {
    throw new Error("useDemoTab debe usarse dentro de <DemoTabProvider>");
  }
  return ctx;
}
