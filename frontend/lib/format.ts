/** Formatting shared by the dashboard and its dialogs. */

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function money(value?: number): string {
  return value == null ? "—" : USD.format(value);
}

export function count(value?: number): string {
  return value == null ? "—" : String(value);
}

/**
 * `lastContact` is a plain date with no time or zone. Parsing it as UTC and
 * formatting it in UTC keeps it on the same calendar day for a reader east or
 * west of the server, which a bare `new Date("2026-08-09")` would not.
 */
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
