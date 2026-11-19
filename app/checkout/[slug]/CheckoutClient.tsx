'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, Lock, ShieldCheck, Tag, X } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface Gateway {
  id: string;
  label: string;
  enabled: boolean;
}

interface Course {
  id: string;
  slug: string;
  title: string;
  thumbnail: string | null;
  instructorName: string;
  price: number;
  originalPrice: number | null;
}

interface Billing {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  country: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void; on(event: string, cb: (r: any) => void): void };
  }
}

const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

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

const input =
  'w-full h-11 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff] disabled:opacity-60';

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-sm font-semibold text-gray-900">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function CheckoutClient({ course, gateways, initialBilling }: { course: Course; gateways: Gateway[]; initialBilling: Billing }) {
  const router = useRouter();
  const firstEnabled = gateways.find((g) => g.enabled)?.id ?? gateways[0]?.id ?? '';
  const [gateway, setGateway] = useState(firstEnabled);
  const [billing, setBilling] = useState(initialBilling);
  const [stage, setStage] = useState<'idle' | 'starting' | 'paying' | 'verifying'>('idle');
  const [error, setError] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [checking, setChecking] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [applied, setApplied] = useState<{ code: string; discount: number; total: number } | null>(null);
  const anyEnabled = gateways.some((g) => g.enabled);
  const busy = stage !== 'idle';

  const total = applied ? applied.total : course.price;
  const set = (k: keyof Billing) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setBilling({ ...billing, [k]: e.target.value });

  const applyCoupon = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!codeInput.trim()) return;
    setChecking(true);
    setCouponError('');
    const r = await post('/api/payments/coupon', { courseId: course.id, code: codeInput });
    setChecking(false);
    if (!r.ok) return setCouponError(r.data.error || 'Could not check this coupon.');
    setApplied({ code: r.data.code, discount: r.data.discount, total: r.data.total });
  };

  const removeCoupon = () => {
    setApplied(null);
    setCodeInput('');
    setCouponError('');
  };

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStage('starting');

    const order = await post('/api/payments/create-order', { courseId: course.id, gateway, billing, coupon: applied?.code });
    if (!order.ok) {
      if (order.status === 401) return router.push(`/login?redirect=/checkout/${course.slug}`);
      if (order.data.alreadyEnrolled) return router.push(`/learn/${course.slug}`);
      if (order.data.field === 'coupon') {
        removeCoupon();
        setCouponError(order.data.error);
      }
      setError(order.data.error || 'Could not start the payment. Please try again.');
      return setStage('idle');
    }
    const o = order.data;

    // A coupon that covers the whole price: already enrolled, nothing to pay.
    if (o.free) return router.push(`/checkout/result/${o.paymentId}`);

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
          // Closed without paying: the student can simply try again.
          ondismiss: () => {
            setStage((s) => (s === 'verifying' ? s : 'idle'));
            setError((er) => er || 'Payment was cancelled. You have not been charged.');
          },
        },
      });
      rzp.on('payment.failed', async (r: any) => {
        const reason = r?.error?.description || 'Payment failed';
        await post('/api/payments/fail', { paymentId: o.paymentId, reason, gatewayPaymentId: r?.error?.metadata?.payment_id });
        router.push(`/checkout/result/${o.paymentId}`);
      });

      setStage('paying');
      rzp.open();
      return;
    }

    setError('This payment method is not available yet.');
    setStage('idle');
  };

  const free = total <= 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem] gap-6 items-start">
      <form onSubmit={pay} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-8" aria-label="Checkout">
        <section className="space-y-4" aria-labelledby="billing">
          <h2 id="billing" className="text-lg font-semibold text-gray-900">
            Billing details
          </h2>
          <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4" disabled={busy}>
            <legend className="sr-only">Billing address</legend>
            <Field label="Full name">
              <input required maxLength={80} value={billing.name} onChange={set('name')} autoComplete="name" className={input} />
            </Field>
            <Field label="Email">
              <input required type="email" maxLength={120} value={billing.email} onChange={set('email')} autoComplete="email" className={input} />
            </Field>
            <Field label="Phone number">
              <input required type="tel" inputMode="tel" maxLength={16} value={billing.phone} onChange={set('phone')} autoComplete="tel" placeholder="10-digit mobile number" className={input} />
            </Field>
            <Field label="Country">
              <input required maxLength={60} value={billing.country} onChange={set('country')} autoComplete="country-name" className={input} />
            </Field>
            <Field label="Address" wide>
              <input required maxLength={200} value={billing.address} onChange={set('address')} autoComplete="street-address" placeholder="House number, street, area" className={input} />
            </Field>
            <Field label="City">
              <input required maxLength={60} value={billing.city} onChange={set('city')} autoComplete="address-level2" className={input} />
            </Field>
            <Field label="State">
              {billing.country.trim().toLowerCase() === 'india' ? (
                <select required value={billing.state} onChange={set('state')} autoComplete="address-level1" className={input}>
                  <option value="">Select state</option>
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input required maxLength={60} value={billing.state} onChange={set('state')} autoComplete="address-level1" className={input} />
              )}
            </Field>
            <Field label="PIN code">
              <input required inputMode="numeric" maxLength={10} value={billing.pin} onChange={set('pin')} autoComplete="postal-code" className={input} />
            </Field>
          </fieldset>
        </section>

        <section className="space-y-3" aria-labelledby="method">
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
        </section>

        {!anyEnabled && !free && (
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
          type="submit"
          disabled={busy || (!anyEnabled && !free)}
          className="w-full sm:w-auto sm:min-w-64 h-12 px-6 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-base transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff] inline-flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Lock className="w-4 h-4" aria-hidden />}
          {stage === 'starting' ? 'Preparing payment...' : stage === 'paying' ? 'Waiting for payment...' : stage === 'verifying' ? 'Confirming payment...' : free ? 'Enroll for free' : `Pay ${formatPrice(total)}`}
        </button>
      </form>

      <aside className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5" aria-labelledby="summary">
        <h2 id="summary" className="text-lg font-semibold text-gray-900">
          Order summary
        </h2>
        <div className="flex gap-3">
          {course.thumbnail ? <img src={course.thumbnail} alt="" className="w-20 h-14 rounded-lg object-cover shrink-0" /> : <div className="w-20 h-14 rounded-lg bg-amber-100 shrink-0" aria-hidden />}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 line-clamp-2">{course.title}</p>
            <p className="text-xs text-gray-600 mt-0.5">{course.instructorName}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          {applied ? (
            <p className="flex items-center gap-2 text-sm text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                <strong className="tracking-wide">{applied.code}</strong> applied
              </span>
              <button type="button" onClick={removeCoupon} disabled={busy} aria-label="Remove coupon" className="h-6 w-6 rounded inline-flex items-center justify-center hover:bg-emerald-100 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                <X className="w-4 h-4" />
              </button>
            </p>
          ) : (
            <form onSubmit={applyCoupon} className="space-y-1.5">
              <label htmlFor="coupon" className="text-sm font-semibold text-gray-900">
                Have a coupon?
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <Tag className="w-4 h-4 absolute left-3 top-3.5 text-gray-500" aria-hidden />
                  <input id="coupon" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} maxLength={30} disabled={busy || checking} autoComplete="off" placeholder="Enter code" className={`${input} pl-9 uppercase tracking-wide`} aria-describedby={couponError ? 'coupon-err' : undefined} />
                </div>
                <button type="submit" disabled={busy || checking || !codeInput.trim()} className="h-11 px-4 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 text-sm font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#e3eeff]">
                  {checking ? 'Checking...' : 'Apply'}
                </button>
              </div>
              {couponError && (
                <p id="coupon-err" role="alert" className="text-xs text-red-700">
                  {couponError}
                </p>
              )}
            </form>
          )}
        </div>

        <dl className="space-y-2 text-sm border-t border-gray-200 pt-4">
          {course.originalPrice && course.originalPrice > course.price && (
            <>
              <div className="flex justify-between text-gray-600">
                <dt>List price</dt>
                <dd className="line-through tabular-nums">{formatPrice(course.originalPrice)}</dd>
              </div>
              <div className="flex justify-between text-emerald-700">
                <dt>Discount</dt>
                <dd className="tabular-nums">-{formatPrice(course.originalPrice - course.price)}</dd>
              </div>
            </>
          )}
          {applied && (
            <>
              <div className="flex justify-between text-gray-700">
                <dt>Course price</dt>
                <dd className="tabular-nums">{formatPrice(course.price)}</dd>
              </div>
              <div className="flex justify-between text-emerald-700">
                <dt>Coupon {applied.code}</dt>
                <dd className="tabular-nums">-{formatPrice(applied.discount)}</dd>
              </div>
            </>
          )}
          <div className="flex justify-between text-base font-semibold text-gray-900 pt-2">
            <dt>Total</dt>
            <dd className="tabular-nums">{total <= 0 ? 'Free' : formatPrice(total)}</dd>
          </div>
        </dl>
        <p className="flex items-start gap-2 text-xs text-gray-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
          Payments are processed securely by the gateway. We never see or store your card or UPI details.
        </p>
      </aside>
    </div>
  );
}
