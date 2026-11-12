/** Pricing rules (confirmed): Pro monthly ₹199 + GST. Yearly = 12 months less the yearly saving, + GST. */
export const PRO_MONTHLY = 199;
export const GST_PCT = 18;
export const YEARLY_SAVING_PCT = 20;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Yearly price from monthly with the standard saving, rounded to whole rupees (199 → 1,910). */
export const yearlyFromMonthly = (monthly: number, savingPct = YEARLY_SAVING_PCT) =>
  Math.round(monthly * 12 * (1 - savingPct / 100));

/** The saving label is always calculated from the real prices, never typed in. */
export const savingPct = (monthly: number | null, yearly: number | null) =>
  monthly && yearly ? Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100)) : null;

export type GstMode = 'exclusive' | 'inclusive';
export interface Priced {
  net: number;
  gst: number;
  total: number;
}

/** `exclusive`: the listed price is before GST (₹199 + GST). `inclusive`: GST is already inside the listed price. */
export function withGst(listed: number, pct = GST_PCT, mode: GstMode = 'exclusive'): Priced {
  if (mode === 'exclusive')
    return { net: r2(listed), gst: r2((listed * pct) / 100), total: r2(listed * (1 + pct / 100)) };
  const net = r2(listed / (1 + pct / 100));
  return { net, gst: r2(listed - net), total: r2(listed) };
}

/** Whole rupees when exact, otherwise paise (₹234.82). */
export const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);

export interface ProrationInput {
  fromListed: number;
  toListed: number;
  daysLeft: number;
  periodDays: number;
  gstPct?: number;
  mode?: GstMode;
}
/** Estimate only: unused time on the current plan is credited against the new plan. The billing service has the final say. */
export function estimateProration({
  fromListed,
  toListed,
  daysLeft,
  periodDays,
  gstPct = GST_PCT,
  mode = 'exclusive',
}: ProrationInput) {
  const credit = r2(fromListed * (Math.max(0, Math.min(daysLeft, periodDays)) / periodDays));
  const net = Math.max(0, r2(toListed - credit));
  return { credit, ...withGst(net, gstPct, mode) };
}
