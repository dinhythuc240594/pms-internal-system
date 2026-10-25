import { money, today } from '../../pms/data/model.js';

export function defaultChannexAccount(accounts) {
  const configured = accounts.filter(account => account.configured);
  return (configured.find(account => account.id === 'system:staging')
    || configured.find(account => account.environment === 'staging') || configured[0])?.id || '';
}

export function channexMoney(amount, currency) {
  if (amount == null || amount === '' || !currency) return '—';
  return /^-?\d+\.\d{5,}$/.test(String(amount)) ? `${amount} ${currency}` : money(amount, currency);
}
export const inventoryValue = value => value == null ? '—' : value;
export const environmentLabel = environment => environment === 'production' ? 'Production' : 'Staging';
export const dateLabel = value => value ? value.slice(0, 10).split('-').reverse().join('/') : '—';

export function inventoryDateError(start, end) {
  const from = Date.parse(`${start}T00:00:00Z`), to = Date.parse(`${end}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)
    || !Number.isFinite(from) || !Number.isFinite(to)
    || new Date(from).toISOString().slice(0, 10) !== start || new Date(to).toISOString().slice(0, 10) !== end) {
    return 'Chọn đủ ngày bắt đầu và ngày kết thúc hợp lệ.';
  }
  if (to < from) return 'Ngày kết thúc phải từ ngày bắt đầu trở đi.';
  if ((to - from) / 86400000 >= 31) return 'Chỉ xem tối đa 31 ngày, bao gồm ngày kết thúc.';
  return '';
}
export function channexToday(timezone) {
  try { return today(timezone || 'Asia/Ho_Chi_Minh'); }
  catch { return today(); }
}

export function channexCatalogInput(kind, draft, editing) {
  const name = draft.name.trim();
  if (kind === 'room') return { name, ...Object.fromEntries(['countOfRooms', 'adults', 'children', 'infants'].map(field => [field, Number(draft[field])])) };
  const input = { name, rate: draft.rate };
  return editing ? input : { ...input, roomTypeId: draft.roomTypeId, currency: draft.currency };
}
