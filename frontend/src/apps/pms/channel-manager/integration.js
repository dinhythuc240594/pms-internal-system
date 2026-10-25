export const INTEGRATION_TABS = ['overview', 'connection', 'channels', 'history'];

export function integrationTab(value) {
  return INTEGRATION_TABS.includes(value) ? value : 'overview';
}

export function integrationState(snapshot = {}) {
  const { connection, roomTypes = [], mappings = [], jobs = [] } = snapshot;
  const connected = Boolean(connection?.credentialsConfigured && connection?.verifiedAt);
  const mapped = roomTypes.filter(room => mappings.some(mapping => mapping.roomTypeId === room.id && mapping.active && !mapping.pauseRequested)).length;
  const latest = jobs.find(job => ['push_ari', 'pull_bookings'].includes(job.kind));
  const pending = jobs.filter(job => ['queued', 'processing'].includes(job.status));
  const failed = jobs.filter(job => job.status === 'failed');
  const ready = connected && connection.active && mapped > 0;
  const next = !connected || !connection?.active || !mapped ? 'connection' : 'channels';
  return { connected, mapped, total: roomTypes.length, ready, latest, pending, failed, next };
}

export function syncRangeError(start, end) {
  const parse = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return NaN;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date.getTime() : NaN;
  };
  const days = (parse(end) - parse(start)) / 86400000;
  if (!Number.isFinite(days)) return 'Chọn ngày bắt đầu và ngày kết thúc hợp lệ.';
  if (days <= 0) return 'Ngày kết thúc phải sau ngày bắt đầu.';
  if (days > 31) return 'Mỗi lần chỉ gửi tối đa 31 ngày. Hãy chọn khoảng ngắn hơn.';
  return '';
}
