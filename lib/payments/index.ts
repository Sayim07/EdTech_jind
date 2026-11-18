import type { PaymentGateway } from './types';
import { razorpay } from './razorpay';

/** Register new gateways here (Stripe, Cashfree, PayU...). The rest of the checkout is gateway-agnostic. */
const GATEWAYS: PaymentGateway[] = [razorpay];

export function getGateway(id: string | undefined | null): PaymentGateway | null {
  return GATEWAYS.find((g) => g.id === id) || null;
}

export function listGateways() {
  return GATEWAYS.map((g) => ({ id: g.id, label: g.label, enabled: g.isConfigured() }));
}

export function defaultGateway(): PaymentGateway | null {
  return GATEWAYS.find((g) => g.isConfigured()) || null;
}

export const toPaise = (rupees: number) => Math.round(rupees * 100);
