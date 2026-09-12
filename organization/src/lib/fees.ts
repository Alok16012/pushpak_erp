/**
 * What a student owes, worked out the same way on both sides of the app.
 *
 * The branch roster and the student's own portal answer the same three
 * questions -- what the course costs, what has been paid, what is left -- and
 * until now they answered them from different arithmetic. The roster summed
 * `fee_invoices.totalAmount` and showed only that one figure; the portal read
 * an `amount` field the table does not have and so printed zero against every
 * invoice, which is why a recorded payment never appeared anywhere. Two screens
 * disagreeing about a student's balance is worse than either of them being
 * wrong, so the rule lives here and both sides call it.
 */

/**
 * `Number()` of a blank, a null or a column that was never selected is NaN,
 * and NaN survives `??`, so the old roster printed a literal "₹NaN" for any
 * student whose course carried no base fee.
 */
export const amount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export interface FeeStanding {
  /** What the student is being charged: their invoices, or the course price. */
  total: number;
  /** Receipts booked against those invoices, reversals excluded. */
  paid: number;
  /** What is still open. Never negative — an overpayment is not a debt. */
  balance: number;
}

/**
 * `invoiced` is null when no invoice has been raised yet, which is not the same
 * as one raised for zero. A student admitted this morning has been quoted the
 * course fee and nothing else, and that is the figure both the office and the
 * student expect to see against their name — not a blank.
 */
export function feeStanding(input: {
  courseFee?: unknown;
  invoiced?: number | null;
  paid?: unknown;
}): FeeStanding {
  const total = input.invoiced == null ? amount(input.courseFee) : amount(input.invoiced);
  const paid = amount(input.paid);
  return { total, paid, balance: Math.max(0, total - paid) };
}

/** ₹ with Indian digit grouping. Paise only show when there are paise. */
export const rupees = (value: unknown): string =>
  `₹${amount(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * A rupee figure for a stat tile, where the space is one line.
 *
 * It only reaches for a lakh or a crore once the number is actually that big.
 * The fee tiles used to divide by a lakh unconditionally and fix to one
 * decimal, so a branch that had collected ₹2,500 was shown "₹0.0L" and read
 * its own takings as nothing.
 */
export const compactRupees = (value: unknown): string => {
  const paise = amount(value);
  const sign = paise < 0 ? "-" : "";
  const size = Math.abs(paise);

  // One decimal, but not a bare ".0" — "₹2L" reads better than "₹2.0L".
  const scaled = (divisor: number, unit: string) => {
    const n = size / divisor;
    return `${sign}₹${n.toFixed(1).replace(/\.0$/, "")}${unit}`;
  };

  if (size >= 1_00_00_000) return scaled(1_00_00_000, "Cr");
  if (size >= 1_00_000) return scaled(1_00_000, "L");
  return `${sign}${rupees(size)}`;
};
