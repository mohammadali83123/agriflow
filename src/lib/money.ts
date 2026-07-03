// Money is stored as integer paisa (1 rupee = 100 paisa) in BIGINT columns
// suffixed _minor. All arithmetic stays in paisa. Display conversion happens
// only at the UI edge. Currency is PKR for v1.

/** Convert rupees (user input) to paisa for storage. Always round. */
export function toMinor(rupees: number): bigint {
  return BigInt(Math.round(rupees * 100));
}

/** Convert stored paisa to a rupee float for arithmetic only — never store the result. */
export function toRupees(minor: bigint | number): number {
  return Number(minor) / 100;
}

/**
 * Format paisa for display as "Rs 1,25,000" (South Asian grouping).
 * This is the ONLY place paisa becomes a human-readable string.
 */
export function formatRupees(minor: bigint | number): string {
  const rupees = toRupees(minor);
  return "Rs " + rupees.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/**
 * Format paisa with explicit decimal places for invoices / line totals.
 * e.g. formatRupeesExact(125050n) → "Rs 1,250.50"
 */
export function formatRupeesExact(minor: bigint | number): string {
  const rupees = toRupees(minor);
  return (
    "Rs " +
    rupees.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
