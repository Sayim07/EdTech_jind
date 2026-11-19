import crypto from 'crypto';
import type { OrderState, PaymentDetails, PaymentGateway, RefundResult, WebhookEvent } from './types';

const API = 'https://api.razorpay.com/v1';

const keyId = () => process.env.RAZORPAY_KEY_ID?.trim() || '';
const keySecret = () => process.env.RAZORPAY_KEY_SECRET?.trim() || '';
const webhookSecret = () => process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || '';

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const authHeader = () => ({ Authorization: `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString('base64')}` });

const hmac = (secret: string, data: string) => crypto.createHmac('sha256', secret).update(data).digest('hex');

export const razorpay: PaymentGateway = {
  id: 'razorpay',
  label: 'Razorpay (UPI, cards, netbanking, wallets)',

  isConfigured: () => Boolean(keyId() && keySecret()),

  async createOrder({ amount, currency, receipt, notes }) {
    const res = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString('base64')}`,
      },
      body: JSON.stringify({ amount, currency, receipt, notes }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.id) {
      const msg = data?.error?.description || `Razorpay responded with ${res.status}`;
      throw new Error(msg);
    }
    return {
      orderId: data.id as string,
      amount: data.amount as number,
      currency: data.currency as string,
      // Only the public key id goes to the browser; the secret stays on the server.
      clientConfig: { key: keyId() },
    };
  },

  async fetchPaymentDetails(paymentId): Promise<PaymentDetails | null> {
    try {
      const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString('base64')}` },
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const p = await res.json();
      const cap = (t: unknown) => (typeof t === 'string' && t ? t.charAt(0).toUpperCase() + t.slice(1) : '');
      let detail = '';
      if (p.method === 'card' && p.card) detail = `${cap(p.card.network)} ${p.card.type || ''} card ending ${p.card.last4 || '----'}`.replace(/\s+/g, ' ').trim();
      else if (p.method === 'upi') detail = p.vpa ? `UPI ID ${p.vpa}` : 'UPI';
      else if (p.method === 'netbanking') detail = p.bank ? `Bank code ${p.bank}` : 'Netbanking';
      else if (p.method === 'wallet') detail = cap(p.wallet) || 'Wallet';
      return { method: p.method || undefined, detail: detail || undefined, fee: typeof p.fee === 'number' ? p.fee : undefined };
    } catch {
      return null;
    }
  },

  // Lists the attempts on an order: a captured one means paid, otherwise report the latest failure.
  async fetchOrderState(orderId): Promise<OrderState | null> {
    try {
      const res = await fetch(`${API}/orders/${encodeURIComponent(orderId)}/payments`, { headers: authHeader(), cache: 'no-store' });
      if (!res.ok) return null;
      const items: any[] = (await res.json())?.items || [];
      const captured = items.find((i) => i.status === 'captured' || (i.status === 'refunded' && i.captured));
      if (captured) return { status: 'paid', paymentId: captured.id };
      const failed = items.filter((i) => i.status === 'failed').sort((a, b) => b.created_at - a.created_at)[0];
      return failed ? { status: 'failed', paymentId: failed.id, reason: failed.error_description || 'Payment failed' } : { status: 'open' };
    } catch {
      return null;
    }
  },

  async refund({ paymentId, amount, receipt, reason }): Promise<RefundResult> {
    const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ amount, speed: 'normal', receipt, notes: reason ? { reason: reason.slice(0, 200) } : undefined }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.id) throw new Error(data?.error?.description || `Razorpay responded with ${res.status}`);
    return { id: data.id as string, status: data.status === 'processed' ? 'PROCESSED' : 'PENDING' };
  },

  // Razorpay signs "<order_id>|<payment_id>" with the key secret.
  verifyPayment({ orderId, paymentId, signature }) {
    if (!keySecret() || !signature) return false;
    return safeEqual(hmac(keySecret(), `${orderId}|${paymentId}`), signature);
  },

  // Razorpay signs the raw request body with the webhook secret (set in the dashboard, not the key secret).
  parseWebhook(rawBody, signature): WebhookEvent | null {
    const secret = webhookSecret();
    if (!secret || !signature || !safeEqual(hmac(secret, rawBody), signature)) return null;

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }
    if (typeof body?.event === 'string' && body.event.startsWith('refund.')) {
      const r = body?.payload?.refund?.entity;
      if (!r?.id || !r?.payment_id) return { type: 'ignored' };
      const status = body.event === 'refund.processed' ? 'PROCESSED' : body.event === 'refund.failed' ? 'FAILED' : 'PENDING';
      return { type: 'refund', paymentId: r.payment_id, refund: { id: r.id, amount: r.amount, status } };
    }
    const entity = body?.payload?.payment?.entity;
    if (!entity) return { type: 'ignored' };

    switch (body.event) {
      case 'payment.captured':
      case 'order.paid':
        return { type: 'paid', orderId: entity.order_id, paymentId: entity.id };
      case 'payment.failed':
        return { type: 'failed', orderId: entity.order_id, paymentId: entity.id, reason: entity.error_description || 'Payment failed' };
      default:
        return { type: 'ignored' };
    }
  },
};
