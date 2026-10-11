import { addDays } from '../../../pms/data/model.js';

export function positiveMoneyInput(value) {
  const amount = value.trim();
  if (!/^\d{1,15}(?:\.\d{1,4})?$/.test(amount) || /^0+(?:\.0+)?$/.test(amount)) {
    throw new Error('Số tiền phải lớn hơn 0, tối đa 15 chữ số nguyên và 4 chữ số thập phân. Dùng dấu chấm cho phần thập phân.');
  }
  return amount;
}

export function dateFilterRange(start, through) {
  for (const value of [start, through]) {
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) {
      throw new Error('Vui lòng chọn ngày hợp lệ.');
    }
  }
  if (start && through && start > through) throw new Error('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
  return { ...(start ? { start } : {}), ...(through ? { end: addDays(through, 1) } : {}) };
}

export function currentMonthRange(date = new Date()) {
  const year = date.getUTCFullYear(), month = date.getUTCMonth();
  return { start: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10), through: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10) };
}
