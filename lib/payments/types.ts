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
  type: 'paid' | 'failed' | 'refund' | 'ignored';
  orderId?: string;
  paymentId?: string;
  reason?: string;
  /** Only for type "refund". */
  refund?: { id: string; amount: number; status: 'PROCESSED' | 'FAILED' | 'PENDING' };
}

/** What the gateway reports about how a payment was made. All fields are optional: it is best effort. */
export interface PaymentDetails {
  method?: string;
  detail?: string;
  /** Gateway fee including tax, in paise. */
  fee?: number;
}

/** Where a gateway says an order stands, used to repair payments whose webhook never arrived. */
export interface OrderState {
  status: 'paid' | 'failed' | 'open';
  paymentId?: string;
  reason?: string;
}

export interface RefundResult {
  id: string;
  status: 'PROCESSED' | 'PENDING';
}

export interface PaymentGateway {
  /** Stable id stored on Payment.gateway, e.g. "razorpay". */
  id: string;
  /** Label shown on the checkout screen. */
  label: string;
  /** True when the credentials needed to take payments are present. */
  isConfigured(): boolean;
  createOrder(args: { amount: number; currency: string; receipt: string; notes: Record<string, string> }): Promise<GatewayOrder>;
  /** Looks up how the customer paid (UPI, card, netbanking...). Never throws: returns null when unavailable. */
  fetchPaymentDetails?(paymentId: string): Promise<PaymentDetails | null>;
  /** Asks the gateway what happened to an order. Returns null when it cannot be reached. */
  fetchOrderState?(orderId: string): Promise<OrderState | null>;
  /** Refunds all or part of a captured payment. Throws with a readable message when the gateway refuses. */
  refund?(args: { paymentId: string; amount: number; receipt: string; reason?: string }): Promise<RefundResult>;
  /** Checks the signature the gateway returned to the browser after payment. */
  verifyPayment(input: VerifyInput): boolean;
  /** Parses and authenticates a server-to-server webhook. Returns null when the signature is invalid. */
  parseWebhook(rawBody: string, signature: string | null): WebhookEvent | null;
}
