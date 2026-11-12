import { describe, expect, it } from 'vitest';
import { estimateProration, PRO_MONTHLY, savingPct, withGst, yearlyFromMonthly } from './pricing';

describe('pricing', () => {
  it('Pro monthly is ₹199 + 18% GST', () => {
    expect(PRO_MONTHLY).toBe(199);
    expect(withGst(199)).toEqual({ net: 199, gst: 35.82, total: 234.82 });
  });
  it('yearly = 12 months less 20%, rounded to whole rupees, then + GST', () => {
    expect(yearlyFromMonthly(199)).toBe(1910); // 199 × 12 × 0.8 = 1910.4
    expect(withGst(1910)).toEqual({ net: 1910, gst: 343.8, total: 2253.8 });
  });
  it('the saving label is calculated from the real prices', () => {
    expect(savingPct(199, 1910)).toBe(20);
    expect(savingPct(0, 0)).toBeNull();
    expect(savingPct(null, 1910)).toBeNull();
  });
  it('inclusive pricing backs the GST out of the listed price', () => {
    expect(withGst(118, 18, 'inclusive')).toEqual({ net: 100, gst: 18, total: 118 });
  });
  it('proration credits unused time against the new plan', () => {
    // Pro monthly → yearly with 15 of 30 days left: credit 99.5, charge 1910 − 99.5 = 1810.5 + GST
    const p = estimateProration({ fromListed: 199, toListed: 1910, daysLeft: 15, periodDays: 30 });
    expect(p.credit).toBe(99.5);
    expect(p.net).toBe(1810.5);
    expect(p.total).toBe(2136.39);
  });
  it('proration never goes negative and caps days left', () => {
    expect(
      estimateProration({ fromListed: 1910, toListed: 199, daysLeft: 400, periodDays: 365 }).net,
    ).toBe(0);
  });
});
