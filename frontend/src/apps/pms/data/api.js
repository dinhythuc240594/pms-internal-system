export const CORE_ROLES = {
  HOTEL_OWNER: ['*'],
  FRONT_DESK: ['profile.view', 'dashboard.view', 'reservations.view', 'reservations.write', 'rooms.view', 'housekeeping.view', 'housekeeping.write', 'rates.view', 'guests.view', 'guests.write', 'payments.write', 'cashbook.view', 'pos.view', 'pos.write', 'housekeeping.manage', 'channels.view', 'notifications.view'],
  HOUSEKEEPING: ['profile.view', 'rooms.view', 'housekeeping.view', 'housekeeping.write', 'notifications.view'],
  ACCOUNTANT: ['profile.view', 'dashboard.view', 'reservations.view', 'guests.view', 'cashbook.view', 'reports.view', 'rates.view', 'payments.write', 'cashbook.write', 'pos.view', 'pos.write', 'finance.adjust', 'pos.cancel', 'cashbook.reverse', 'inventory.view', 'inventory.write', 'notifications.view'],
};
export const systemUser = user => ['SYSTEM_MANAGER', 'SUPER_ADMIN'].includes(user?.globalRole);
export function tenantRole(user, id) {
  if (systemUser(user)) return 'HOTEL_OWNER';
  return user?.memberships?.find(m => m.tenantId === id && m.active !== false)?.role;
}
export function permitted(user, tenant, action, write = false) {
  if (!user || user.active === false) return { allowed: false, reason: 'session', message: 'Vui lòng đăng nhập lại (401).' };
  if (!tenant || !tenantRole(user, tenant.id)) return { allowed: false, reason: 'tenant', message: 'Bạn không có quyền vào khách sạn này (403).' };
  if (tenant.status?.toUpperCase() !== 'ACTIVE' && (write || !action.endsWith('.view'))) return { allowed: false, reason: 'suspended', message: 'Khách sạn đang tạm ngưng. Dữ liệu chỉ được xem.' };
  if (!CORE_ROLES[tenantRole(user, tenant.id)]?.some(a => a === '*' || a === action)) return { allowed: false, reason: 'role', message: 'Vai trò của bạn không được phép thực hiện thao tác này (403).' };
  return { allowed: true };
}
export const ACTION_FEATURES = {
  'dashboard.view': 'DASHBOARD', 'reservations.view': 'RESERVATION_VIEW', 'reservations.write': 'RESERVATION_CREATE',
  'rooms.view': 'ROOM_DIAGRAM', 'housekeeping.view': 'HOUSEKEEPING', 'housekeeping.write': 'HOUSEKEEPING', 'housekeeping.manage': 'HOUSEKEEPING',
  'cashbook.view': 'CASHBOOK', 'cashbook.write': 'CASHBOOK', 'cashbook.reverse': 'CASHBOOK', 'payments.write': 'CASHBOOK', 'finance.adjust': 'CASHBOOK',
  'rates.view': 'ARI_MANAGEMENT', 'reports.view': 'REPORTS_BASIC', 'pos.view': 'POS_SALES', 'pos.write': 'POS_SALES', 'pos.cancel': 'POS_SALES',
  'inventory.view': 'INVENTORY_WAREHOUSE', 'inventory.write': 'INVENTORY_WAREHOUSE',
  'channels.view': 'OTA_SYNC', 'channels.write': 'OTA_SYNC',
};
export function subscriptionDecision(subscription, features, action, feature = ACTION_FEATURES[action], write = !action.endsWith('.view'), now = Date.now()) {
  const configured = subscription?.effectiveFeatures || subscription?.planFeatures || features || {};
  if (feature && configured[feature] === false) return { allowed: false, reason: 'feature', message: 'Tính năng này đang tắt tại khách sạn. Vui lòng liên hệ quản trị viên.' };
  if (!subscription) return { allowed: true };
  const inactive = subscription.effectiveActive === false || subscription.status !== 'active'
    || (subscription.startDate && Date.parse(subscription.startDate) > now)
    || (subscription.endDate && Date.parse(subscription.endDate) <= now);
  if (write && inactive) return { allowed: false, reason: 'expired', message: 'Gói chưa hoạt động hoặc đã hết hạn. Dữ liệu hiện chỉ được xem; vui lòng liên hệ gia hạn.' };
  return { allowed: true };
}
export function createRequestScope() {
  let generation = 0;
  let tenantId = null;
  return {
    select(id) { tenantId = id; return { tenantId, generation: ++generation }; },
    current() { return { tenantId, generation }; },
    isCurrent(value) { return value.tenantId === tenantId && value.generation === generation; },
  };
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export function createIntentJournal(storage) {
  const storageKey = 'bluejay-pms-pending-intents-v1';
  let pending = {};
  try { pending = JSON.parse(storage?.getItem(storageKey) || '{}'); } catch { /* An inaccessible storage still permits in-memory retries. */ }
  const save = () => { try { storage?.setItem(storageKey, JSON.stringify(pending)); } catch { /* Retain the in-memory intent. */ } };
  return {
    async acquire(path, body, suggested = crypto.randomUUID(), actor = '') {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode((actor ? actor + '\u0000' : '') + path + JSON.stringify(canonical(body))));
      const fingerprint = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
      if (!pending[fingerprint]) { pending[fingerprint] = suggested; save(); }
      return { fingerprint, key: pending[fingerprint] };
    },
    confirm(intent) { if (pending[intent.fingerprint] === intent.key) { delete pending[intent.fingerprint]; save(); } },
  };
}
export function createApiClient(fetcher = globalThis.fetch, baseUrl = import.meta.env?.VITE_API_BASE_URL || '') {
  let csrfToken = null;
  return {
    setCsrf(token) { csrfToken = token; },
    async request(url, { method = 'GET', body, signal, intent } = {}) {
      const headers = { Accept: 'application/json' };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (!['GET', 'HEAD'].includes(method) && csrfToken) headers['X-CSRF-Token'] = csrfToken;
      if (intent) headers['Idempotency-Key'] = intent;
      const response = await fetcher(baseUrl.replace(/\/$/, '') + url, { method, credentials: 'include', headers, signal, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
      const data = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(data?.error?.message || `Yêu cầu thất bại (${response.status}).`);
        Object.assign(error, { status: response.status, code: data?.error?.code, details: data?.error?.details });
        throw error;
      }
      return data;
    },
  };
}
