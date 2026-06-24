"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type ToastVariant = "default" | "success" | "danger";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastInput {
  message: string;
  variant?: ToastVariant;
  /** Acción inline, ej. "Deshacer". Si está presente, el toast dura más. */
  action?: ToastAction;
  /** Override de duración (ms). 0 = no auto-dismiss. */
  duration?: number;
}

interface Toast extends ToastInput {
  id: number;
}

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

/**
 * Feedback efímero de acciones (PRODUCT.md #2 "velocidad percibida"). El slot `action`
 * realiza el #4: las operaciones recuperables ofrecen "Deshacer" en vez de un modal de
 * confirmación. Auto-dismiss; con acción dura más para dar tiempo a deshacer.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, ...input }]);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[var(--z-toast)] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
        // Región viva: lectores de pantalla anuncian los toasts (status changes).
        role="region"
        aria-label="Notificaciones"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const VARIANT_DOT: Record<ToastVariant, string> = {
  default: "bg-primary",
  success: "bg-success",
  danger: "bg-danger",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const duration = toast.duration ?? (toast.action ? 6000 : 3500);

  useEffect(() => {
    if (duration === 0) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      role="status"
      className="flex animate-toast-in items-center gap-3 rounded-[var(--radius)] border border-border bg-surface px-4 py-3 shadow-[var(--shadow-overlay)]"
    >
      <span className={["h-2 w-2 shrink-0 rounded-full", VARIANT_DOT[toast.variant ?? "default"]].join(" ")} aria-hidden />
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-text">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action!.onClick();
            onDismiss();
          }}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-light"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Descartar"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-bg hover:text-text"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="m4 4 8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  );
}

/** Hook para disparar toasts desde cualquier client component bajo el provider. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
