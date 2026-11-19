import { prisma } from '@/lib/prisma';

export const toPaise = (rupees: number) => Math.round(rupees * 100);

/** Reservations older than this no longer count against a coupon's limits (the student abandoned checkout). */
const RESERVE_MS = 30 * 60 * 1000;

export interface Pricing {
  /** paise */
  original: number;
  discount: number;
  total: number;
  couponId: string | null;
  couponCode: string | null;
}

export type CouponResult = ({ ok: true } & Pricing) | { ok: false; error: string };

/** Uses that count against a limit: paid ones, plus fresh unpaid reservations. */
function usageWhere(couponId: string, userId?: string) {
  return {
    couponId,
    ...(userId ? { userId } : {}),
    OR: [{ status: 'REDEEMED' }, { status: 'RESERVED', createdAt: { gte: new Date(Date.now() - RESERVE_MS) } }],
  };
}

export const normalizeCode = (raw: unknown) => (typeof raw === 'string' ? raw.trim().toUpperCase().replace(/\s+/g, '') : '');

/**
 * Works out the price for a student, applying the coupon if one is given. The price always comes from the
 * database, so the browser can never choose its own amount.
 */
export async function priceFor(args: { userId: string; userEmail: string; course: { id: string; price: number }; code?: unknown }): Promise<CouponResult> {
  const original = toPaise(args.course.price);
  const none: Pricing = { original, discount: 0, total: original, couponId: null, couponCode: null };
  const code = normalizeCode(args.code);
  if (!code) return { ok: true, ...none };

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  // One message for unknown and switched-off codes, so codes cannot be guessed by their error text.
  if (!coupon || !coupon.active) return { ok: false, error: 'This coupon code is not valid.' };

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, error: 'This coupon is not active yet.' };
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, error: 'This coupon has expired.' };
  if (coupon.courseIds.length && !coupon.courseIds.includes(args.course.id)) return { ok: false, error: 'This coupon does not apply to this course.' };
  if (coupon.allowedEmails.length && !coupon.allowedEmails.includes(args.userEmail.toLowerCase())) return { ok: false, error: 'This coupon is not available for your account.' };
  if (coupon.minOrder && args.course.price < coupon.minOrder) return { ok: false, error: `This coupon needs an order of at least ₹${coupon.minOrder}.` };

  const [used, usedByUser] = await Promise.all([
    coupon.maxUses ? prisma.couponRedemption.count({ where: usageWhere(coupon.id) }) : Promise.resolve(0),
    prisma.couponRedemption.count({ where: usageWhere(coupon.id, args.userId) }),
  ]);
  if (coupon.maxUses && used >= coupon.maxUses) return { ok: false, error: 'This coupon has reached its usage limit.' };
  if (usedByUser >= coupon.perUserLimit) return { ok: false, error: 'You have already used this coupon.' };

  let discount = coupon.type === 'PERCENT' ? Math.round((original * coupon.value) / 100) : toPaise(coupon.value);
  if (coupon.type === 'PERCENT' && coupon.maxDiscount) discount = Math.min(discount, toPaise(coupon.maxDiscount));
  discount = Math.max(0, Math.min(discount, original));
  // Gateways cannot charge less than ₹1: a discount that would leave a few paise is trimmed.
  if (original - discount > 0 && original - discount < 100) discount = original - 100;
  return { ok: true, original, discount, total: original - discount, couponId: coupon.id, couponCode: coupon.code };
}

/** Validates the admin form. Returns clean data for prisma or an error message. */
export function parseCouponInput(body: any): { data?: Record<string, any>; error?: string } {
  const code = normalizeCode(body?.code);
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { error: 'Use 3 to 30 letters, numbers, dashes or underscores for the code.' };
  const type = body?.type === 'FIXED' ? 'FIXED' : body?.type === 'PERCENT' ? 'PERCENT' : '';
  if (!type) return { error: 'Choose a percentage or fixed-amount discount.' };
  const value = Number(body?.value);
  if (!Number.isFinite(value) || value <= 0) return { error: 'Enter a discount greater than zero.' };
  if (type === 'PERCENT' && value > 100) return { error: 'A percentage discount cannot be more than 100.' };

  const num = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v));
  const maxDiscount = num(body?.maxDiscount);
  const minOrder = num(body?.minOrder);
  const maxUses = num(body?.maxUses);
  const perUserLimit = num(body?.perUserLimit) ?? 1;
  if ([maxDiscount, minOrder, maxUses].some((n) => n !== null && (!Number.isFinite(n) || n < 0))) return { error: 'Limits must be positive numbers.' };
  if (!Number.isInteger(perUserLimit) || perUserLimit < 1) return { error: 'Per-student limit must be at least 1.' };
  if (maxUses !== null && !Number.isInteger(maxUses)) return { error: 'Maximum uses must be a whole number.' };

  const date = (v: unknown) => {
    if (!v) return null;
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? undefined : d;
  };
  const startsAt = date(body?.startsAt);
  const expiresAt = date(body?.expiresAt);
  if (startsAt === undefined || expiresAt === undefined) return { error: 'One of the dates is not valid.' };
  if (startsAt && expiresAt && expiresAt <= startsAt) return { error: 'The expiry must be after the start date.' };

  const list = (v: unknown, lower = false) =>
    Array.from(new Set((Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[\s,;]+/) : []).map((x) => String(x).trim()).filter(Boolean).map((x) => (lower ? x.toLowerCase() : x))));
  const allowedEmails = list(body?.allowedEmails, true);
  if (allowedEmails.some((e) => !/^\S+@\S+\.\S+$/.test(e))) return { error: 'One of the student emails is not valid.' };

  return {
    data: {
      code,
      description: typeof body?.description === 'string' && body.description.trim() ? body.description.trim().slice(0, 200) : null,
      type,
      value,
      maxDiscount: type === 'PERCENT' ? maxDiscount || null : null,
      minOrder: minOrder || null,
      startsAt,
      expiresAt,
      maxUses: maxUses || null,
      perUserLimit,
      active: body?.active !== false,
      courseIds: list(body?.courseIds),
      allowedEmails,
    },
  };
}

export interface Billing {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  country: string;
}

/** Checks the billing address from checkout. Returns clean values or the first problem found. */
export function parseBilling(raw: any): { billing?: Billing; error?: string } {
  const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');
  const b: Billing = {
    name: s(raw?.name, 80),
    email: s(raw?.email, 120).toLowerCase(),
    phone: s(raw?.phone, 20).replace(/[\s-]/g, ''),
    address: s(raw?.address, 200),
    city: s(raw?.city, 60),
    state: s(raw?.state, 60),
    pin: s(raw?.pin, 10).replace(/\s/g, ''),
    country: s(raw?.country, 60) || 'India',
  };
  if (!b.name) return { error: 'Enter the billing name.' };
  if (!/^\S+@\S+\.\S+$/.test(b.email)) return { error: 'Enter a valid billing email.' };
  if (!/^\+?\d{10,13}$/.test(b.phone)) return { error: 'Enter a valid phone number (10 digits).' };
  if (!b.address) return { error: 'Enter the billing address.' };
  if (!b.city) return { error: 'Enter the city.' };
  if (!b.state) return { error: 'Enter the state.' };
  if (b.country.toLowerCase() === 'india' ? !/^\d{6}$/.test(b.pin) : b.pin.length < 3) return { error: b.country.toLowerCase() === 'india' ? 'Enter a 6-digit PIN code.' : 'Enter the postal code.' };
  return { billing: b };
}
