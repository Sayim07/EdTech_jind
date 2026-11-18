/** Contract every payment gateway implements. Add a new gateway by creating a provider and registering it in ./index.ts. */

export interface GatewayOrder {
  /** Gateway's own order id. */
  orderId: string;
  /** Smallest currency unit (paise). */
  amount: number;
  currency: string;
  /** Public values the browser needs to open the gateway's checkout. Never put secrets here. */
  clientConfig: Record<string, unknown>;
}

export interface VerifyInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface WebhookEvent {
  /** Normalised outcome. "ignored" for events we do not act on. */
  type: 'paid' | 'failed' | 'ignored';
  orderId?: string;
  paymentId?: string;
  reason?: string;
}

export interface PaymentGateway {
  /** Stable id stored on Payment.gateway, e.g. "razorpay". */
  id: string;
  /** Label shown on the checkout screen. */
  label: string;
  /** True when the credentials needed to take payments are present. */
  isConfigured(): boolean;
  createOrder(args: { amount: number; currency: string; receipt: string; notes: Record<string, string> }): Promise<GatewayOrder>;
  /** Checks the signature the gateway returned to the browser after payment. */
  verifyPayment(input: VerifyInput): boolean;
  /** Parses and authenticates a server-to-server webhook. Returns null when the signature is invalid. */
  parseWebhook(rawBody: string, signature: string | null): WebhookEvent | null;
}
