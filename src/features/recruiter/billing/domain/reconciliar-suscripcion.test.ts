import { describe, it, expect } from "vitest";
import {
  reconciliarSuscripcion,
  type ReconciliarSuscripcionInput,
  type DlocalRemoteState,
} from "./reconciliar-suscripcion";

const NOW = new Date("2026-08-28T23:00:00Z");

const remote = (over: Partial<DlocalRemoteState> = {}): DlocalRemoteState => ({
  subscriptionId: 11081,
  subscriptionToken: "JEBjOn9OpQBZ9lFDZyImyLObvzW5fwGN",
  active: true,
  clientEmail: "dueño@estudio.com",
  scheduledDate: "2026-09-28T22:56:23",
  latestExecution: {
    orderId: "ST-JEBjOn9OpQBZ9lFDZyImyLObvzW5fwGN-0",
    status: "COMPLETED",
    amountReceived: 95.77,
    balanceCurrency: "USD",
    createdAt: "2026-08-28T22:56:23",
  },
  ...over,
});

const input = (over: Partial<ReconciliarSuscripcionInput> = {}): ReconciliarSuscripcionInput => ({
  local: { status: "pending" },
  remote: remote(),
  recordedPaymentIds: [],
  now: NOW,
  ...over,
});

describe("reconciliarSuscripcion", () => {
  it("sin estado remoto todavía: no resuelve, sin patch", () => {
    const r = reconciliarSuscripcion(input({ remote: null }));
    expect(r.settled).toBe(false);
    expect(r.subscriptionPatch).toBeNull();
    expect(r.paymentToRecord).toBeNull();
  });

  it("cobro COMPLETED: activa, setea fin de período y registra el pago en USD", () => {
    const r = reconciliarSuscripcion(input());
    expect(r.settled).toBe(true);
    expect(r.subscriptionPatch).toMatchObject({
      dlocalSubscriptionId: "11081",
      dlocalSubscriptionToken: "JEBjOn9OpQBZ9lFDZyImyLObvzW5fwGN",
      dlocalPayerEmail: "dueño@estudio.com",
      status: "active",
    });
    expect(r.subscriptionPatch?.currentPeriodEndsAt).toEqual(new Date("2026-09-28T22:56:23"));
    expect(r.paymentToRecord).toEqual({
      dlocalPaymentId: "ST-JEBjOn9OpQBZ9lFDZyImyLObvzW5fwGN-0",
      amount: "95.77",
      currency: "USD",
      paidAt: new Date("2026-08-28T22:56:23"),
    });
  });

  it("cobro ya registrado: activa pero no duplica el pago", () => {
    const r = reconciliarSuscripcion(
      input({ recordedPaymentIds: ["ST-JEBjOn9OpQBZ9lFDZyImyLObvzW5fwGN-0"] }),
    );
    expect(r.settled).toBe(true);
    expect(r.subscriptionPatch?.status).toBe("active");
    expect(r.paymentToRecord).toBeNull();
  });

  it("ejecución PENDING: guarda el vínculo pero no cambia el acceso", () => {
    const r = reconciliarSuscripcion(
      input({ remote: remote({ latestExecution: { orderId: "x", status: "PENDING", amountReceived: 0, balanceCurrency: "USD", createdAt: null } }) }),
    );
    expect(r.settled).toBe(false);
    expect(r.subscriptionPatch?.status).toBe("pending");
    expect(r.subscriptionPatch?.currentPeriodEndsAt).toBeUndefined();
    expect(r.paymentToRecord).toBeNull();
  });

  it("sin ejecuciones todavía: no resuelve", () => {
    const r = reconciliarSuscripcion(input({ remote: remote({ latestExecution: null }) }));
    expect(r.settled).toBe(false);
    expect(r.subscriptionPatch?.status).toBe("pending");
  });

  it("cobro DECLINED: past_due, sin tocar el fin de período ni registrar pago", () => {
    const r = reconciliarSuscripcion(
      input({
        local: { status: "active" },
        remote: remote({ latestExecution: { orderId: "ST-x-1", status: "DECLINED", amountReceived: 0, balanceCurrency: "USD", createdAt: "2026-09-28T22:56:23" } }),
      }),
    );
    expect(r.settled).toBe(true);
    expect(r.subscriptionPatch?.status).toBe("past_due");
    expect(r.subscriptionPatch?.currentPeriodEndsAt).toBeUndefined();
    expect(r.paymentToRecord).toBeNull();
  });

  it("baja del lado de dLocal: cancelled, acceso hasta scheduled_date", () => {
    const r = reconciliarSuscripcion(input({ remote: remote({ active: false }) }));
    expect(r.settled).toBe(true);
    expect(r.subscriptionPatch?.status).toBe("cancelled");
    expect(r.subscriptionPatch?.currentPeriodEndsAt).toEqual(new Date("2026-09-28T22:56:23"));
  });

  it("cobro recurrente posterior: nuevo order_id se registra", () => {
    const r = reconciliarSuscripcion(
      input({
        local: { status: "active" },
        recordedPaymentIds: ["ST-JEBjOn9OpQBZ9lFDZyImyLObvzW5fwGN-0"],
        remote: remote({
          scheduledDate: "2026-10-28T22:56:23",
          latestExecution: {
            orderId: "ST-JEBjOn9OpQBZ9lFDZyImyLObvzW5fwGN-1",
            status: "COMPLETED",
            amountReceived: 95.77,
            balanceCurrency: "USD",
            createdAt: "2026-09-28T22:56:23",
          },
        }),
      }),
    );
    expect(r.paymentToRecord?.dlocalPaymentId).toBe("ST-JEBjOn9OpQBZ9lFDZyImyLObvzW5fwGN-1");
    expect(r.subscriptionPatch?.currentPeriodEndsAt).toEqual(new Date("2026-10-28T22:56:23"));
  });
});
