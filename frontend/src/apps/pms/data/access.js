export const FEATURES = [
  ['DASHBOARD', 'Bảng điều khiển', 'Trial'], ['ROOM_DIAGRAM', 'Sơ đồ phòng', 'Trial'],
  ['RESERVATION_VIEW', 'Xem đặt phòng', 'Trial'], ['RESERVATION_CREATE', 'Tạo đặt phòng', 'Trial'],
  ['TAPE_CHART', 'Timeline đặt phòng', 'Basic'], ['ARI_MANAGEMENT', 'Giá & Phòng trống', 'Basic'],
  ['HOUSEKEEPING', 'Buồng phòng', 'Basic'], ['POS_SALES', 'Dịch vụ & POS', 'Basic'],
  ['CASHBOOK', 'Thu chi', 'Basic'], ['REPORTS_BASIC', 'Báo cáo cơ bản', 'Basic'],
  ['OTA_SYNC', 'Đồng bộ OTA', 'Pro'], ['REPORTS_ADVANCED', 'Báo cáo nâng cao', 'Pro'],
  ['INVENTORY_WAREHOUSE', 'Quản lý kho', 'Pro'], ['MULTI_CURRENCY', 'Đa tiền tệ', 'Pro'],
  ['VOUCHER_PROMO', 'Voucher & Khuyến mãi', 'Pro'], ['API_EXTERNAL', 'API bên ngoài', 'Pro'],
].map(([code, name, minPlan]) => ({ id: code, code, name, minPlan, category: 'Nghiệp vụ PMS', enabledGlobal: true, description: name }));

export const ROLE_NAMES = { HOTEL_OWNER: 'Chủ khách sạn', FRONT_DESK: 'Lễ tân', HOUSEKEEPING: 'Buồng phòng', ACCOUNTANT: 'Kế toán', SUPER_ADMIN: 'Super Admin', SYSTEM_MANAGER: 'System Manager' };
export const DEMO_USERS = [
  ['admin', 'admin@bluejay.vn', 'Quản trị LOHA', 'SUPER_ADMIN', null],
  ['manager', 'manager@bluejay.vn', 'Quản lý hệ thống', 'SYSTEM_MANAGER', null],
  ['owner', 'owner@bluejay.vn', 'Chủ khách sạn', 'USER', 'HOTEL_OWNER'],
  ['frontdesk', 'frontdesk@bluejay.vn', 'Lễ tân', 'USER', 'FRONT_DESK'],
  ['housekeeping', 'housekeeping@bluejay.vn', 'Nhân viên buồng phòng', 'USER', 'HOUSEKEEPING'],
  ['accountant', 'accountant@bluejay.vn', 'Kế toán', 'USER', 'ACCOUNTANT'],
].map(([id, email, name, globalRole, tenantRole]) => ({ id, email, name, globalRole, memberships: tenantRole ? { 'TNT-1092': tenantRole, 'TNT-1088': tenantRole } : {} }));
export const ROLE_ACTIONS = {
  HOTEL_OWNER: ['*'],
  FRONT_DESK: ['profile.view', 'dashboard.view', 'rooms.view', 'reservations.view', 'reservations.write', 'housekeeping.view', 'housekeeping.write', 'pos.view', 'cashbook.view', 'rates.view', 'ota.view'],
  HOUSEKEEPING: ['profile.view', 'housekeeping.view', 'housekeeping.write', 'rooms.view'],
  ACCOUNTANT: ['profile.view', 'dashboard.view', 'reservations.view', 'cashbook.view', 'pos.view', 'reports.view', 'reports.advanced.view', 'inventory.view', 'inventory.write'],
};
export const isGlobalUser = user => ['SUPER_ADMIN', 'SYSTEM_MANAGER'].includes(user?.globalRole);
export function sessionUser(session, now = Date.now(), users = DEMO_USERS) {
  if (!session || !Number.isFinite(session.expiresAt) || session.expiresAt <= now) return null;
  return users.find(user => user.id === session.userId && user.active !== false) || null;
}
export function memberRole(user, tenantId) { return isGlobalUser(user) ? 'HOTEL_OWNER' : user?.memberships?.[tenantId]; }
export function normalizePlan(plan = '') {
  if (/pro|chuyên nghiệp|enterprise/i.test(plan)) return 'Pro';
  if (/basic|cơ bản/i.test(plan)) return 'Basic';
  return 'Trial';
}
export function featureDecision(workspace, tenant, code, now = Date.now()) {
  if (!tenant) return { allowed: false, reason: 'tenant', message: 'Bạn chưa được cấp quyền vào khách sạn này.' };
  const status = tenant.subscriptionStatus;
  if (tenant.status !== 'Active' || status === 'SUSPENDED') return { allowed: false, reason: 'suspended', message: 'Khách sạn đang bị tạm khóa.' };
  if (status === 'EXPIRED' || (status === 'TRIAL' && (!Number.isFinite(Date.parse(tenant.trialExpiresAt)) || Date.parse(tenant.trialExpiresAt) <= now))) return { allowed: false, reason: 'expired', message: 'Khách sạn đã hết thời gian dùng thử. Vui lòng liên hệ nâng cấp.' };
  if (!code) return { allowed: true };
  const feature = workspace.features.find(f => f.code === code);
  const override = workspace.tenantFeatureOverrides[tenant.id]?.[code];
  const liveOverride = override && (!override.expiresAt || Date.parse(override.expiresAt) > now);
  const ranks = { Trial: 0, Basic: 1, Pro: 2 };
  const enabled = feature?.enabledGlobal && (liveOverride ? override.enabled : ranks[normalizePlan(tenant.plan)] >= ranks[feature.minPlan]);
  if (!enabled) return { allowed: false, reason: 'feature', feature: code, message: `${feature?.name || code} chưa được bật. Chức năng thuộc gói ${feature?.minPlan || 'Pro'} hoặc cần quản trị viên cấp quyền.` };
  return { allowed: true };
}
export function accessDecision(workspace, session, tenantId, action, feature, now = Date.now()) {
  const user = sessionUser(session, now, workspace.users);
  if (!user) return { allowed: false, reason: 'session', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  const role = memberRole(user, tenantId);
  if (!role) return { allowed: false, reason: 'tenant', message: 'Bạn không có quyền vào khách sạn này.' };
  if (!ROLE_ACTIONS[role]?.some(a => a === '*' || a === action)) return { allowed: false, reason: 'role', message: 'Vai trò của bạn không được phép thực hiện thao tác này.' };
  if (action === 'profile.view') return { allowed: true };
  return featureDecision(workspace, workspace.tenants.find(t => t.id === tenantId), feature, now);
}
export function bookingQuota(tenant, data) {
  return tenant?.subscriptionStatus === 'TRIAL' ? { used: data.bookingCount, limit: 10 } : { used: data.bookingCount, limit: null };
}
export function routePolicy(path) {
  if (path.startsWith('/manager')) return { manager: true, superOnly: /^\/manager\/(logs|users)/.test(path) };
  const [pathname, query = ''] = path.split('?');
  const p = pathname.replace(/^\/id\/?/, '');
  if (/^profile/.test(p)) return { action: 'profile.view' };
  if (/^settings\/?$/.test(p) && new URLSearchParams(query).get('section') === 'channels') return { action: 'channels.view', feature: 'OTA_SYNC' };
  if (/^settings/.test(p)) return { action: 'settings.write' };
  if (/^users/.test(p)) return { action: 'users.write' };
  if (/^reservations/.test(p)) return { action: 'reservations.view', feature: 'RESERVATION_VIEW' };
  if (/^room-diagram|^rooms/.test(p)) return { action: 'rooms.view', feature: 'ROOM_DIAGRAM' };
  if (/^ari/.test(p)) return { action: 'reservations.view', feature: 'TAPE_CHART' };
  if (/^gia\/(vouchers|promotions)/.test(p)) return { action: 'rates.view', feature: 'VOUCHER_PROMO' };
  if (/^gia\/exchange-rates/.test(p)) return { action: 'rates.view', feature: 'MULTI_CURRENCY' };
  if (/^gia|^matrix-rate/.test(p)) return { action: 'rates.view', feature: 'ARI_MANAGEMENT' };
  if (/^housekeeping\/staff/.test(p)) return { action: 'housekeeping.manage', feature: 'HOUSEKEEPING' };
  if (/^housekeeping/.test(p)) return { action: 'housekeeping.view', feature: 'HOUSEKEEPING' };
  if (/^inventory/.test(p)) return { action: 'inventory.view', feature: 'INVENTORY_WAREHOUSE' };
  if (/^sales/.test(p)) return { action: 'pos.view', feature: 'POS_SALES' };
  if (/^cashflow|^commissions/.test(p)) return { action: 'cashbook.view', feature: 'CASHBOOK' };
  if (/^reports\/(source|room|roomType|cancellations|nationality|discounts)(\/|$)/.test(p)) return { action: 'reports.advanced.view', feature: 'REPORTS_ADVANCED' };
  if (/^reports/.test(p)) return { action: 'reports.view', feature: 'REPORTS_BASIC' };
  if (/^ota/.test(p)) return { action: 'channels.view', feature: 'OTA_SYNC' };
  return { action: 'dashboard.view', feature: 'DASHBOARD' };
}
export function routeDecision(workspace, session, tenantId, path, now = Date.now()) {
  const policy = routePolicy(path);
  if (policy.manager) {
    const user = sessionUser(session, now, workspace.users);
    if (!user) return { allowed: false, reason: 'session', message: 'Vui lòng đăng nhập.' };
    return isGlobalUser(user) && (!policy.superOnly || user.globalRole === 'SUPER_ADMIN') ? { allowed: true } : { allowed: false, reason: 'role', message: 'Bạn không có quyền quản trị phần này.' };
  }
  return accessDecision(workspace, session, tenantId, policy.action, policy.feature, now);
}
