"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useDemoTab } from "../DemoTabContext";
import type { DemoTabId } from "../DemoTabContext";
import type { AsistenteAutoDemoHandle } from "./AsistentePanel";

const STAY_MS = 2200;
const MOVE_MS = 500;
const CLICK_MS = 150;
const MANUAL_PAUSE_MS = 18000;

type MicroFn = "dashboard" | "busqueda" | "talento" | "asistente";

const SCENES: { id: DemoTabId; label: string; microFn?: MicroFn }[] = [
  { id: "dashboard", label: "Dashboard", microFn: "dashboard" },
  { id: "busqueda", label: "Búsquedas", microFn: "busqueda" },
  { id: "talento", label: "Talento", microFn: "talento" },
  { id: "clientes", label: "Clientes" },
  { id: "equipo", label: "Mi equipo" },
  { id: "entrevistas", label: "Entrevistas" },
  { id: "solicitudes", label: "Solicitudes" },
  { id: "notificaciones", label: "Notificaciones" },
  { id: "asistente", label: "IA ✦", microFn: "asistente" },
];

const DASHBOARD_TARGETS = [12, 87, 6, 3];

/** Recorrido automático del demo (cursor falso + tooltips + micro-interacciones) que arranca
 * cuando el demo entra en viewport. Se pausa 18s si el usuario toca una tab a mano.
 * No arranca si el usuario pidió prefers-reduced-motion. Todos los timers quedan trackeados
 * y se cancelan al desmontar, para que nada siga mutando el DOM después de que el componente
 * se fue (ej. el usuario navegó a /precios a mitad de una animación). */
export function AutoTour({
  wrapperRef,
  manualInteractionRef,
  asistenteRef,
}: {
  wrapperRef: RefObject<HTMLDivElement | null>;
  manualInteractionRef: RefObject<number>;
  asistenteRef: RefObject<AsistenteAutoDemoHandle | null>;
}) {
  const { setActiveTab } = useDemoTab();
  const cursorRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapperRef.current;
    const cursor = cursorRef.current;
    const tooltip = tooltipRef.current;
    const badge = badgeRef.current;
    if (!wrap || !cursor || !tooltip || !badge) return;

    // Una sola lectura del media query, actualizada solo por su propio evento "change" — no
    // por re-invocar matchMedia() en cada entrada/salida del viewport. Releer .matches en cada
    // intersección hacía que un valor inestable (visto en algunos Linux/Chromium: la primera
    // lectura no siempre coincide con la real) pudiera prender y apagar el tour en el mismo load.
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = reducedMotionQuery.matches;
    badge.style.display = reducedMotion ? "none" : "";

    function handleReducedMotionChange(e: MediaQueryListEvent) {
      reducedMotion = e.matches;
      badge!.style.display = reducedMotion ? "none" : "";
      if (reducedMotion) pause();
    }
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);

    // Todo setTimeout/setInterval que dispare esta feature pasa por acá, para poder
    // cancelarlos todos de una sola vez al desmontar (clearTimeout cancela también ids de
    // setInterval, son el mismo espacio de ids en el browser).
    const pendingTimers = new Set<ReturnType<typeof setTimeout>>();
    function schedule(fn: () => void, ms: number) {
      const id = setTimeout(() => {
        pendingTimers.delete(id);
        fn();
      }, ms);
      pendingTimers.add(id);
      return id;
    }
    function scheduleInterval(fn: () => void, ms: number) {
      const id = setInterval(fn, ms);
      pendingTimers.add(id);
      return id;
    }
    function clearManaged(id: ReturnType<typeof setTimeout>) {
      clearTimeout(id);
      pendingTimers.delete(id);
    }
    function clearAllManaged() {
      pendingTimers.forEach((id) => clearTimeout(id));
      pendingTimers.clear();
    }

    let running = false;
    let step = 0;
    let mainTimer: ReturnType<typeof setTimeout> | null = null;

    function moveCursorTo(el: Element, label: string, cb: () => void) {
      const wRect = wrap!.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      if (eRect.width === 0) {
        cb();
        return;
      }
      cursor!.style.display = "block";
      cursor!.classList.remove("clicking");
      const x = Math.max(20, Math.min(eRect.left - wRect.left + eRect.width / 2, wRect.width - 20));
      const y = Math.max(20, Math.min(eRect.top - wRect.top + eRect.height / 2, wRect.height - 20));
      cursor!.style.left = `${x}px`;
      cursor!.style.top = `${y}px`;
      tooltip!.textContent = label;
      tooltip!.style.left = `${Math.max(8, x - 60)}px`;
      tooltip!.style.top = `${y - 42}px`;
      tooltip!.classList.add("visible");
      schedule(() => {
        cursor!.classList.add("clicking");
        schedule(() => {
          cursor!.classList.remove("clicking");
          cb();
        }, CLICK_MS);
      }, MOVE_MS);
    }

    function runMicro(microFn: MicroFn) {
      const activePanel = wrap!.querySelector(".demo-panel.active");
      if (!activePanel) return;

      if (microFn === "dashboard") {
        activePanel.querySelectorAll<HTMLElement>(".dw-stat-n").forEach((el, i) => {
          const target = DASHBOARD_TARGETS[i] ?? 0;
          const t0 = Date.now();
          const dur = 600;
          const iv = scheduleInterval(() => {
            const p = Math.min(1, (Date.now() - t0) / dur);
            el.textContent = String(Math.round(target * p));
            if (p >= 1) {
              el.textContent = String(target);
              clearManaged(iv);
            }
          }, 30);
        });
      } else if (microFn === "busqueda") {
        const hot = activePanel.querySelector<HTMLElement>(".dw-kcard.hot");
        if (!hot) return;
        hot.style.boxShadow = "0 0 0 2px #6d28d9, 0 8px 24px rgba(109,40,217,0.25)";
        hot.style.transform = "translateY(-3px)";
        schedule(() => {
          hot.style.boxShadow = "";
          hot.style.transform = "";
        }, 1200);
      } else if (microFn === "talento") {
        const card = activePanel.querySelector<HTMLElement>(".dw-card");
        if (!card) return;
        card.style.borderColor = "#6d28d9";
        card.style.boxShadow = "0 0 0 2px rgba(109,40,217,0.2)";
        card.style.transform = "scale(1.02)";
        schedule(() => {
          card.style.borderColor = "";
          card.style.boxShadow = "";
          card.style.transform = "";
        }, 1000);
      } else if (microFn === "asistente") {
        asistenteRef.current?.runAutoDemo();
      }
    }

    function tick() {
      if (!running) return;
      const scene = SCENES[step % SCENES.length];
      const pausedByUser = Date.now() - (manualInteractionRef.current ?? 0) < MANUAL_PAUSE_MS;
      if (pausedByUser) {
        mainTimer = schedule(tick, 1000);
        return;
      }
      const tabEl = wrap!.querySelector(`.demo-tab[data-tab="${scene.id}"]`);
      if (!tabEl) {
        step++;
        mainTimer = schedule(tick, STAY_MS);
        return;
      }
      moveCursorTo(tabEl, scene.label, () => {
        setActiveTab(scene.id);
        if (scene.microFn) {
          schedule(() => runMicro(scene.microFn!), 300);
        }
        mainTimer = schedule(() => {
          tooltip!.classList.remove("visible");
          step++;
          tick();
        }, STAY_MS);
      });
    }

    function start() {
      if (running || reducedMotion) return;
      running = true;
      step = 0;
      tick();
    }

    function pause() {
      running = false;
      if (mainTimer) clearManaged(mainTimer);
      cursor!.style.display = "none";
      tooltip!.classList.remove("visible");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) start();
          else pause();
        });
      },
      { threshold: 0.3 },
    );
    observer.observe(wrap);

    return () => {
      reducedMotionQuery.removeEventListener("change", handleReducedMotionChange);
      observer.disconnect();
      running = false;
      clearAllManaged();
    };
  }, [wrapperRef, manualInteractionRef, asistenteRef, setActiveTab]);

  return (
    <>
      <div className="demo-cursor" ref={cursorRef} style={{ display: "none" }} />
      <div className="demo-tooltip" ref={tooltipRef} />
      <div className="demo-tour-badge" ref={badgeRef}>
        Tour en vivo
      </div>
    </>
  );
}
