/**
 * Paquetes de créditos de Sourcing comprables (prototipo de créditos aprobado por el cliente,
 * artifact a7feb72b). No vencen, se suman a `purchased_balance` apenas se confirma el pago.
 * La compra real todavía no está integrada con dLocal — ver `BuyCreditsDialog`.
 */
export type SourcingCreditPackage = {
  id: string;
  credits: number;
  priceUsd: number;
  highlighted?: boolean;
};

export const SOURCING_CREDIT_PACKAGES: SourcingCreditPackage[] = [
  { id: "pack-250", credits: 250, priceUsd: 9.9 },
  { id: "pack-500", credits: 500, priceUsd: 17.9, highlighted: true },
  { id: "pack-1000", credits: 1000, priceUsd: 29.9 },
];
