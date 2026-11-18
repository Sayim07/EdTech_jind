import crypto from 'crypto';
import type { PaymentGateway, WebhookEvent } from './types';

const API = 'https://api.razorpay.com/v1';

const keyId = () => process.env.RAZORPAY_KEY_ID?.trim() || '';
const keySecret = () => process.env.RAZORPAY_KEY_SECRET?.trim() || '';
const webhookSecret = () => process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || '';

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

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
