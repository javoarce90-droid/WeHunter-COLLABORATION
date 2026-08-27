import { describe, it, expect } from "vitest";
import {
  evaluarAccesoWorkspace,
  TRIAL_DAYS,
  GRACE_DAYS,
  FIRST_CHARGE_MARGIN_DAYS,
  type SubscriptionSnapshot,
} from "./evaluar-acceso-workspace";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-09-01T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * DAY);

const sub = (over: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot => ({
  status: "active",
  trialEndsAt: null,
  currentPeriodEndsAt: daysFromNow(20),
  ...over,
});

describe("evaluarAccesoWorkspace", () => {
  describe("sin fila de suscripción", () => {
    it("está en prueba dentro de los 14 días desde la creación", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: daysAgo(3),
        trialDays: TRIAL_DAYS,
        subscription: null,
        now: NOW,
      });
      expect(res.state).toBe("trial");
      expect(res.reason).toBe("trialing");
      expect(res.daysLeft).toBe(TRIAL_DAYS - 3);
      expect(res.hasPaymentMethod).toBe(false);
    });

    it("queda bloqueado pasados los 14 días", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: daysAgo(TRIAL_DAYS + 1),
        trialDays: TRIAL_DAYS,
        subscription: null,
        now: NOW,
      });
      expect(res.state).toBe("blocked");
      expect(res.reason).toBe("trial_expired");
      expect(res.daysLeft).toBe(0);
    });

    it("el borde exacto del día 14 ya bloquea", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: daysAgo(TRIAL_DAYS),
        trialDays: TRIAL_DAYS,
        subscription: null,
        now: NOW,
      });
      expect(res.state).toBe("blocked");
    });

    it("respeta el trialDays del plan (ventana más larga)", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: daysAgo(20),
        trialDays: 30,
        subscription: null,
        now: NOW,
      });
      expect(res.state).toBe("trial");
      expect(res.daysLeft).toBe(10);
    });

    it("con menos de un día de prueba restante informa daysLeft = 1", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: new Date(NOW.getTime() - (TRIAL_DAYS * DAY - DAY / 2)),
        trialDays: TRIAL_DAYS,
        subscription: null,
        now: NOW,
      });
      expect(res.state).toBe("trial");
      expect(res.daysLeft).toBe(1);
    });
  });

  describe("status pending (fila creada, tarjeta no cargada)", () => {
    it("sigue la ventana derivada de la creación: en prueba", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: daysAgo(2),
        trialDays: TRIAL_DAYS,
        subscription: sub({ status: "pending", currentPeriodEndsAt: null }),
        now: NOW,
      });
      expect(res.state).toBe("trial");
      expect(res.hasPaymentMethod).toBe(false);
    });

    it("bloquea pasada la ventana", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: daysAgo(TRIAL_DAYS + 5),
        trialDays: TRIAL_DAYS,
        subscription: sub({ status: "pending", currentPeriodEndsAt: null }),
        now: NOW,
      });
      expect(res.state).toBe("blocked");
      expect(res.reason).toBe("trial_expired");
    });
  });

  describe("status trialing (tarjeta cargada en dLocal)", () => {
    it("en prueba mientras no venza trial_ends_at, con tarjeta en archivo", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: daysAgo(20),
        trialDays: TRIAL_DAYS,
        subscription: sub({
          status: "trialing",
          trialEndsAt: daysFromNow(5),
          currentPeriodEndsAt: null,
        }),
        now: NOW,
      });
      expect(res.state).toBe("trial");
      expect(res.daysLeft).toBe(5);
      expect(res.hasPaymentMethod).toBe(true);
    });

    it("terminada la prueba, tolera unos días esperando el webhook del primer cobro", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: daysAgo(20),
        trialDays: TRIAL_DAYS,
        subscription: sub({
          status: "trialing",
          trialEndsAt: daysAgo(1),
          currentPeriodEndsAt: null,
        }),
        now: NOW,
      });
      expect(res.state).toBe("ok");
      expect(res.reason).toBe("awaiting_first_charge");
    });

    it("bloquea si pasó el margen y dLocal nunca confirmó el cobro", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: daysAgo(20),
        trialDays: TRIAL_DAYS,
        subscription: sub({
          status: "trialing",
          trialEndsAt: daysAgo(FIRST_CHARGE_MARGIN_DAYS + 1),
          currentPeriodEndsAt: null,
        }),
        now: NOW,
      });
      expect(res.state).toBe("blocked");
      expect(res.reason).toBe("payment_overdue");
    });
  });

  describe("status active", () => {
    it("ok con el período vigente", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: daysAgo(60),
        trialDays: TRIAL_DAYS,
        subscription: sub({ currentPeriodEndsAt: daysFromNow(10) }),
        now: NOW,
      });
      expect(res.state).toBe("ok");
      expect(res.reason).toBe("active");
    });

    it("ok dentro de la gracia post vencimiento", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: daysAgo(60),
        trialDays: TRIAL_DAYS,
        subscription: sub({ currentPeriodEndsAt: daysAgo(GRACE_DAYS - 1) }),
        now: NOW,
      });
      expect(res.state).toBe("ok");
    });

    it("bloquea pasada la gracia", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: daysAgo(60),
        trialDays: TRIAL_DAYS,
        subscription: sub({ currentPeriodEndsAt: daysAgo(GRACE_DAYS + 1) }),
        now: NOW,
      });
      expect(res.state).toBe("blocked");
      expect(res.reason).toBe("payment_overdue");
    });
  });

  describe("status past_due", () => {
    it("ok dentro de la gracia", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: daysAgo(60),
        trialDays: TRIAL_DAYS,
        subscription: sub({ status: "past_due", currentPeriodEndsAt: daysAgo(1) }),
        now: NOW,
      });
      expect(res.state).toBe("ok");
      expect(res.reason).toBe("payment_overdue");
    });

    it("bloquea pasada la gracia", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: daysAgo(60),
        trialDays: TRIAL_DAYS,
        subscription: sub({ status: "past_due", currentPeriodEndsAt: daysAgo(GRACE_DAYS + 2) }),
        now: NOW,
      });
      expect(res.state).toBe("blocked");
    });
  });

  describe("status cancelled", () => {
    it("mantiene el acceso hasta el fin del período", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: daysAgo(60),
        trialDays: TRIAL_DAYS,
        subscription: sub({ status: "cancelled", currentPeriodEndsAt: daysFromNow(4) }),
        now: NOW,
      });
      expect(res.state).toBe("ok");
      expect(res.reason).toBe("cancelled_active");
    });

    it("bloquea una vez vencido el período", () => {
      const res = evaluarAccesoWorkspace({
        orgCreatedAt: daysAgo(60),
        trialDays: TRIAL_DAYS,
        subscription: sub({ status: "cancelled", currentPeriodEndsAt: daysAgo(1) }),
        now: NOW,
      });
      expect(res.state).toBe("blocked");
      expect(res.reason).toBe("subscription_cancelled");
    });
  });
});
