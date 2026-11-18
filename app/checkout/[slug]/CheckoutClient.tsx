'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Lock } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface Gateway {
  id: string;
  label: string;
  enabled: boolean;
}

interface Props {
  courseId: string;
  courseSlug: string;
  gateways: Gateway[];
  price: number;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void; on(event: string, cb: (r: any) => void): void };
  }
}

function loadScript(src: string) {
  return new Promise<boolean>((resolve) => {
    if (document.querySelector(`script[src="${src}"]`) && window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const post = async (url: string, body: unknown) => {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
};

export function CheckoutClient({ courseId, courseSlug, gateways, price }: Props) {
  const router = useRouter();
  const firstEnabled = gateways.find((g) => g.enabled)?.id ?? gateways[0]?.id ?? '';
  const [gateway, setGateway] = useState(firstEnabled);
  const [stage, setStage] = useState<'idle' | 'starting' | 'paying' | 'verifying'>('idle');
  const [error, setError] = useState('');
  const anyEnabled = gateways.some((g) => g.enabled);
  const busy = stage !== 'idle';

  const pay = async () => {
    setError('');
    setStage('starting');

    const order = await post('/api/payments/create-order', { courseId, gateway });
    if (!order.ok) {
      if (order.status === 401) return router.push(`/login?redirect=/checkout/${courseSlug}`);
      if (order.data.alreadyEnrolled) return router.push(`/learn/${courseSlug}`);
      setError(order.data.error || 'Could not start the payment. Please try again.');
      return setStage('idle');
    }
    const o = order.data;

    if (o.gateway === 'razorpay') {
      const loaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!loaded || !window.Razorpay) {
        setError('Could not load the payment window. Check your connection and try again.');
        return setStage('idle');
      }

      const rzp = new window.Razorpay({
        key: o.clientConfig.key,
        order_id: o.orderId,
        amount: o.amount,
        currency: o.currency,
        name: 'CIM India',
        description: o.courseTitle,
        prefill: o.prefill,
        theme: { color: '#0056d2' },
        retry: { enabled: true },
        // Success: confirm the signature on the server, then land on the result page.
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setStage('verifying');
          const v = await post('/api/payments/verify', {
            paymentId: o.paymentId,
            gatewayOrderId: resp.razorpay_order_id,
            gatewayPaymentId: resp.razorpay_payment_id,
            signature: resp.razorpay_signature,
          });
          // Even if verify failed the result page shows the true state (the webhook may still confirm it).
          router.push(`/checkout/result/${o.paymentId}`);
          if (!v.ok) router.refresh();
        },
        modal: {
          // Closed without paying: the order stays open so the student can simply try again.
          ondismiss: () => {
            setStage((s) => (s === 'verifying' ? s : 'idle'));
            setError((e) => e || 'Payment was cancelled. You have not been charged.');
          },
        },
      });
      rzp.on('payment.failed', async (r: any) => {
        const reason = r?.error?.description || 'Payment failed';
        await post('/api/payments/fail', { paymentId: o.paymentId, reason });
        router.push(`/checkout/result/${o.paymentId}`);
      });

      setStage('paying');
      rzp.open();
      return;
    }

    setError('This payment method is not available yet.');
    setStage('idle');
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6" aria-labelledby="method">
      <h2 id="method" className="text-lg font-semibold text-gray-900">
        Payment method
      </h2>

      <fieldset className="space-y-2" disabled={busy}>
        <legend className="sr-only">Choose a payment gateway</legend>
        {gateways.map((g) => (
          <label
            key={g.id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 transition has-[:focus-visible]:shadow-[0_0_0_3px_#e3eeff] ${
              !g.enabled ? 'opacity-60 cursor-not-allowed border-gray-200' : gateway === g.id ? 'border-amber-600 bg-amber-50 cursor-pointer' : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
            }`}
          >
            <input type="radio" name="gateway" value={g.id} checked={gateway === g.id} disabled={!g.enabled} onChange={() => setGateway(g.id)} className="accent-[#0056d2] w-4 h-4 focus-visible:outline-none" />
            <span className="text-sm font-semibold text-gray-900">{g.label}</span>
            {!g.enabled && <span className="ml-auto text-xs text-gray-600">Not set up</span>}
          </label>
        ))}
      </fieldset>

      {!anyEnabled && (
        <p className="flex items-start gap-2 text-sm text-amber-800 bg-amber-100 rounded-xl p-3" role="status">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          Online payments are not configured yet. Add the Razorpay keys to the .env file and restart the server.
        </p>
      )}

      {error && (
        <p className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-xl p-3" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={pay}
        disabled={busy || !anyEnabled}
        className="w-full sm:w-auto sm:min-w-64 h-12 px-6 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-base transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] inline-flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Lock className="w-4 h-4" aria-hidden />}
        {stage === 'starting' ? 'Preparing payment...' : stage === 'paying' ? 'Waiting for payment...' : stage === 'verifying' ? 'Confirming payment...' : `Pay ${formatPrice(price)}`}
      </button>
    </section>
  );
}
