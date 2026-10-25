export function shiftCreationDates(value, period = 'day') {
  if (!['day', 'week', 'month'].includes(period) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return [];
  const first = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(first.getTime()) || first.toISOString().slice(0, 10) !== value || first.getUTCFullYear() < 1) return [];
  let count = period === 'day' ? 1 : 7;
  if (period === 'month') {
    const lastCurrent = new Date(first), lastNext = new Date(first);
    lastCurrent.setUTCMonth(first.getUTCMonth() + 1, 0);
    lastNext.setUTCMonth(first.getUTCMonth() + 2, 0);
    count = lastCurrent.getUTCDate() - first.getUTCDate() + Math.min(first.getUTCDate(), lastNext.getUTCDate());
  }
  const last = new Date(first.getTime() + (count - 1) * 86400000);
  if (last.getUTCFullYear() > 9999) return [];
  return Array.from({ length: count }, (_, index) => new Date(first.getTime() + index * 86400000).toISOString().slice(0, 10));
}
