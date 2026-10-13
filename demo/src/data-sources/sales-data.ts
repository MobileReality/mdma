export interface SalesRow {
  month: string;
  revenue: number;
  orders: number;
}

const MONTHS = [
  ['Jan', 42, 400],
  ['Feb', 47, 420],
  ['Mar', 55, 460],
  ['Apr', 51, 500],
  ['May', 63, 540],
  ['Jun', 68, 580],
  ['Jul', 72, 620],
  ['Aug', 70, 660],
  ['Sep', 78, 700],
  ['Oct', 85, 740],
  ['Nov', 91, 780],
  ['Dec', 104, 840],
] as const;

const BASE_YEAR = 2025;
const YEARLY_GROWTH = 0.08;

export function salesForYear(year: number): SalesRow[] {
  const factor = (1 + YEARLY_GROWTH) ** (year - BASE_YEAR);
  return MONTHS.map(([month, revenue, orders]) => ({
    month,
    revenue: Math.round(revenue * factor),
    orders: Math.round(orders * factor),
  }));
}
