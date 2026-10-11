import { addDays, nights } from '../data/model.js';

export function rateRangeError({ start, end }, maxNights = 366) {
  for (const date of [start, end]) {
    const time = Date.parse(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date) return 'Vui lòng chọn đủ ngày bắt đầu và kết thúc hợp lệ.';
  }
  const length = nights(start, end);
  if (length <= 0) return 'Ngày kết thúc phải sau ngày bắt đầu.';
  return length > maxNights ? `Chọn tối đa ${maxNights} ngày mỗi lần.` : '';
}

export function selectedRateRanges(types, days, selected) {
  const ranges = [];
  for (const type of types) {
    let current = null;
    for (const date of days) {
      if (!selected.has(`${type.id}:${date}`)) { current = null; continue; }
      const end = addDays(date, 1);
      if (current?.end === date) current.end = end;
      else { current = { roomTypeId: type.id, start: date, end }; ranges.push(current); }
    }
  }
  return ranges;
}
