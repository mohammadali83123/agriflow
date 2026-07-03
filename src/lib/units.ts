// Quantities are stored in a product's base unit as numeric(14,3) — never floats.
// Packaging is a conversion layer only. The base-unit value is the stored truth.
// Conversion happens once at the system boundary; internal code works in base units.

export type BaseUnit = string; // e.g. "kg", "litre", "piece"

export interface PackagingOption {
  id: string;
  name: string;   // e.g. "50kg bag", "maund", "ton"
  factor: number; // base units per package — must be > 0
}

/** Convert a quantity expressed in packages to base units for storage. */
export function toBaseUnit(packageQty: number, factor: number): number {
  if (factor <= 0) throw new Error("Packaging factor must be positive");
  return packageQty * factor;
}

/** Convert a stored base-unit quantity to packages for display. May be fractional. */
export function fromBaseUnit(baseQty: number, factor: number): number {
  if (factor <= 0) throw new Error("Packaging factor must be positive");
  return baseQty / factor;
}

/** Format a base-unit quantity with its unit label. e.g. "980 kg", "12.5 kg" */
export function formatQty(baseQty: number, unit: BaseUnit): string {
  const formatted = baseQty.toLocaleString("en-IN", { maximumFractionDigits: 3 });
  return `${formatted} ${unit}`;
}

/** Format a packaged quantity. e.g. "20 bags (1,000 kg)" */
export function formatPackagedQty(
  baseQty: number,
  unit: BaseUnit,
  packaging: PackagingOption
): string {
  const pkgQty = fromBaseUnit(baseQty, packaging.factor);
  const pkgFormatted = pkgQty.toLocaleString("en-IN", { maximumFractionDigits: 3 });
  return `${pkgFormatted} ${packaging.name} (${formatQty(baseQty, unit)})`;
}
