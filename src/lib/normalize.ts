export function normalizeId(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^0-9K]/g, "")
    .trim();
}
