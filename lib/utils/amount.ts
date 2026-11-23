/**
 * Parse the numeric value of a rupee amount such as "Rs. 500",
 * "Rs. 1,000" or "Rs. 1,234.50".
 */
export function parseAmount(text: string): number {
  const numeric = text.match(/[\d,]+(?:\.\d+)?/)?.[0] ?? '';
  return Number(numeric.replace(/,/g, ''));
}
