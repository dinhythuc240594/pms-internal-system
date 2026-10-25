import test from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace, loadWorkspace, applyCommand, WORKSPACE_KEY } from './workspace.js';
import { sessionUser, accessDecision, routeDecision, featureDecision } from './access.js';
const A = 'TNT-1092', B = 'TNT-1088', now = Date.parse('2026-10-02T12:00:00Z');
const session = userId => ({ userId, expiresAt: now + 3600000 });
const actor = (userId = 'owner', tenantId = A) => ({ session: session(userId), tenantId, now });
const booking = (id, checkIn = '2026-12-01', checkOut = '2026-12-02') => ({ type: 'booking.create', id, input: { guest: id, source: 'Direct', room: '101', checkIn, checkOut } });

test('no-show requires arrival day, stays terminal and preserves the booking price', () => {
  const original = seedWorkspace(null, now);
  original.byTenant[A].bookings = [];
  const due = applyCommand(original, booking('due', '2026-10-02', '2026-10-03'), actor());
  const price = due.byTenant[A].bookings[0].total;
  const closed = applyCommand(due, { type: 'booking.status', id: 'due', status: 'NO_SHOW' }, actor());
  assert.equal(closed.byTenant[A].bookings[0].status, 'NO_SHOW');
  assert.equal(closed.byTenant[A].bookings[0].total, price);
  assert.equal(closed.byTenant[A].bookings[0].noShowAt, new Date(now).toISOString());
  assert.throws(() => applyCommand(closed, { type: 'booking.status', id: 'due', status: 'IN_HOUSE' }, actor()));
  assert.doesNotThrow(() => applyCommand(closed, booking('replacement', '2026-10-02', '2026-10-03'), actor()));
  const future = applyCommand(original, booking('future'), actor());
  assert.throws(() => applyCommand(future, { type: 'booking.status', id: 'future', status: 'NO_SHOW' }, actor()), /Chưa đến ngày/);
});

test('membership edits take effect immediately at one hotel and cannot change global identity', () => {
  const original = seedWorkspace(null, now);
  const person = original.users.find(u => u.id === 'frontdesk');
  const command = { type: 'membership.save', input: { ...person, role: 'ACCOUNTANT', active: true } };
  const ws = applyCommand(original, command, actor());
  assert.equal(routeDecision(ws, session('frontdesk'), A, '/id/reports/revenue', now).allowed, true);
  assert.equal(accessDecision(ws, session('frontdesk'), A, 'reservations.write', 'RESERVATION_CREATE', now).allowed, false);
  assert.equal(ws.users.find(u => u.id === 'frontdesk').memberships[B], 'FRONT_DESK');
  assert.throws(() => applyCommand(original, command, actor('frontdesk')), /Vai trò/);
  assert.throws(() => applyCommand(original, { ...command, input: { ...command.input, email: 'owner@bluejay.vn' } }, actor()), /Email/);
  assert.throws(() => applyCommand(original, { ...command, input: { ...command.input, name: 'Changed elsewhere' } }, actor()), /Danh tính/);
  const owner = original.users.find(u => u.id === 'owner');
  assert.throws(() => applyCommand(original, { type: 'membership.save', input: { ...owner, role: 'FRONT_DESK' } }, actor()), /ít nhất một/);
  const disabled = applyCommand(ws, { ...command, input: { ...command.input, active: false } }, actor());
  assert.equal(routeDecision(disabled, session('frontdesk'), A, '/id/dashboard', now).reason, 'tenant');
  assert.equal(routeDecision(disabled, session('frontdesk'), B, '/id/dashboard', now).allowed, true);
});

test('custom hotel users can sign in without being granted membership at other hotels', () => {
  const ws = applyCommand(seedWorkspace(null, now), { type: 'membership.save', id: 'new-user', input: { name: 'Demo employee', email: 'employee@example.test', role: 'HOUSEKEEPING', active: true } }, actor());
  assert.equal(sessionUser(session('new-user'), now, ws.users).name, 'Demo employee');
  assert.equal(routeDecision(ws, session('new-user'), A, '/id/housekeeping/status', now).allowed, true);
  assert.equal(routeDecision(ws, session('new-user'), B, '/id/housekeeping/status', now).reason, 'tenant');
  assert.throws(() => applyCommand(ws, { type: 'membership.save', input: { ...ws.users.find(u => u.id === 'admin'), role: 'HOTEL_OWNER' } }, actor()), /Không tìm thấy|quản trị/);
});

test('master changes propagate to related catalogs and validate receipt selections', () => {
  const original = seedWorkspace(null, now);
  let ws = applyCommand(original, { type: 'master.save', catalog: 'itemCategories', input: { id: 'minibar', name: 'Đồ uống' } }, actor());
  assert.equal(ws.byTenant[A].masters.items[0].category, 'Đồ uống');
  assert.deepEqual(ws.byTenant[B].masters, original.byTenant[B].masters);
  ws = applyCommand(ws, { type: 'master.save', catalog: 'warehouses', id: 'new-warehouse', input: { name: 'Kho tầng 2' } }, actor());
  const command = { type: 'receipt.create', id: 'test-receipt', input: { supplier: 'Demo supplier', date: '2026-10-02', warehouse: 'Kho tầng 2', items: [{ itemId: 'water', name: 'Nước', quantity: 2, price: 5000 }] } };
  ws = applyCommand(ws, command, actor());
  assert.equal(ws.byTenant[A].receipts[0].total, 10000);
  assert.equal(ws.byTenant[B].receipts.length, 0);
  ws = applyCommand(ws, { type: 'master.disable', catalog: 'items', id: 'water' }, actor());
  assert.throws(() => applyCommand(ws, command, actor()), /ngừng sử dụng/);
  assert.equal(ws.byTenant[A].receipts[0].total, 10000);
});

test('an unrelated admin edit preserves explicit expiry and logs changes', () => {
  const original = seedWorkspace(null, now);
  original.tenants.find(t => t.id === A).subscriptionStatus = 'EXPIRED';
  const ws = applyCommand(original, { type: 'admin.tenants', update: list => list.map(t => t.id === B ? { ...t, name: 'New B' } : t) }, actor('manager'));
  assert.equal(ws.tenants.find(t => t.id === A).subscriptionStatus, 'EXPIRED');
  assert.equal(ws.auditLogs[0].user, 'Quản lý hệ thống');
  assert.match(ws.auditLogs[0].details, /before/);
  assert.throws(() => applyCommand(ws, { type: 'admin.features', update: list => list }, actor('manager')), /Super Admin/);
});

test('a newly created hotel starts empty with its configured rooms and a scoped owner', () => {
  const original = seedWorkspace(null, now);
  const ws = applyCommand(original, { type: 'admin.tenants', update: list => [{ id: 'new-hotel', name: 'New hotel', plan: 'Trial', status: 'Active', rooms: 20, contactName: 'New owner', contactEmail: 'new-owner@example.test' }, ...list] }, actor('manager'));
  assert.equal(ws.byTenant['new-hotel'].rooms.length, 20);
  assert.equal(ws.byTenant['new-hotel'].bookings.length, 0);
  assert.equal(ws.byTenant['new-hotel'].bookingCount, 0);
  assert.equal(ws.tenants[0].trialExpiresAt, new Date(now + 14 * 86400000).toISOString());
  const owner = ws.users.find(u => u.email === 'new-owner@example.test');
  assert.deepEqual(owner.memberships, { 'new-hotel': 'HOTEL_OWNER' });
  assert.equal(routeDecision(ws, session(owner.id), A, '/id/dashboard', now).reason, 'tenant');
  assert.deepEqual(ws.byTenant[A], original.byTenant[A]);
});
test('legacy data migrates only to the first hotel and survives a storage roundtrip', () => {
  const legacy = { rooms: [{ id: '101', typeId: 'city', condition: 'clean' }], bookings: [{ id: 'old', guest: 'Original' }], receipts: [], housekeepingLog: [] };
  const map = new Map([['bluejay-pms-demo-v1', JSON.stringify(legacy)]]);
  const storage = { getItem: key => map.get(key) || null };
  const ws = loadWorkspace(storage, now);
  assert.equal(ws.byTenant[A].bookings[0].id, 'old');
  assert.ok(!ws.byTenant[B].bookings.some(b => b.id === 'old'));
  map.set(WORKSPACE_KEY, JSON.stringify(ws));
  assert.deepEqual(loadWorkspace(storage, now), ws);
  assert.equal(JSON.parse(map.get('bluejay-pms-demo-v1')).bookings[0].id, 'old');
});
test('booking and settings changes stay isolated even with identical room IDs', () => {
  const original = seedWorkspace(null, now);
  const ws = applyCommand(original, booking('A-only'), actor());
  assert.deepEqual(ws.byTenant[B], original.byTenant[B]);
  assert.equal(original.byTenant[A].bookings.length, 2);
  assert.throws(() => applyCommand(ws, { type: 'booking.update', id: 'A-only', input: { guest: 'Cross tenant' } }, actor('owner', B)), /Không tìm thấy/);
  const renamed = applyCommand(ws, { type: 'settings.save', input: { ...ws.byTenant[A].settings, name: 'New A' } }, actor());
  assert.equal(renamed.tenants.find(t => t.id === A).name, 'New A');
  assert.deepEqual(renamed.byTenant[B], original.byTenant[B]);
});
test('shared price affects new bookings while contact edits preserve the old price', () => {
  let ws = applyCommand(seedWorkspace(null, now), booking('old-rate'), actor());
  const old = ws.byTenant[A].bookings[0];
  ws = applyCommand(ws, { type: 'master.save', catalog: 'roomTypes', input: { ...ws.byTenant[A].masters.roomTypes[0], price: 2500000 } }, actor());
  ws = applyCommand(ws, booking('new-rate', '2026-12-03', '2026-12-04'), actor());
  assert.equal(ws.byTenant[A].bookings[0].total, 2500000);
  ws = applyCommand(ws, { type: 'booking.update', id: old.id, input: { ...old, phone: '123' } }, actor());
  assert.equal(ws.byTenant[A].bookings.find(b => b.id === old.id).total, 1200000);
});
test('expired or unknown sessions deny direct URLs and mutations', () => {
  const ws = seedWorkspace(null, now);
  assert.equal(sessionUser({ userId: 'owner', expiresAt: now }, now), null);
  assert.equal(sessionUser({ userId: 'unknown', expiresAt: now + 1 }, now), null);
  assert.equal(routeDecision(ws, null, A, '/id/reservations', now).reason, 'session');
  assert.throws(() => applyCommand(ws, booking('expired'), { session: { userId: 'owner', expiresAt: now }, tenantId: A, now }), /hết hạn/);
});
test('roles, memberships and global permissions guard direct URLs and data commands', () => {
  const ws = seedWorkspace(null, now);
  assert.equal(routeDecision(ws, session('housekeeping'), A, '/id/housekeeping/status', now).allowed, true);
  for (const path of ['/id/reports/revenue', '/id/housekeeping/staff', '/id/settings', '/manager/tenants']) assert.equal(routeDecision(ws, session('housekeeping'), A, path, now).reason, 'role');
  assert.equal(routeDecision(ws, session('manager'), A, '/manager/logs', now).reason, 'role');
  assert.equal(routeDecision(ws, session('manager'), A, '/manager/features', now).allowed, true);
  assert.equal(accessDecision(ws, session('owner'), 'TNT-1085', 'dashboard.view', 'DASHBOARD', now).reason, 'tenant');
  assert.throws(() => applyCommand(ws, booking('forbidden'), actor('accountant')), /Vai trò/);
  assert.throws(() => applyCommand(ws, { type: 'admin.features', update: list => list }, actor('manager')), /Super Admin/);
});
test('overrides affect the client immediately without bypassing roles or global disable', () => {
  let ws = seedWorkspace(null, now);
  assert.equal(routeDecision(ws, session('owner'), B, '/id/inventory/in', now).reason, 'feature');
  ws = applyCommand(ws, { type: 'admin.overrides', update: prev => ({ ...prev, [B]: { INVENTORY_WAREHOUSE: { enabled: true } } }) }, actor('manager'));
  assert.equal(routeDecision(ws, session('owner'), B, '/id/inventory/in', now).allowed, true);
  assert.equal(routeDecision(ws, session('housekeeping'), B, '/id/inventory/in', now).reason, 'role');
  assert.equal(ws.auditLogs[0].user, 'Quản lý hệ thống');
  assert.match(ws.auditLogs[0].details, /INVENTORY_WAREHOUSE/);
  ws = applyCommand(ws, { type: 'admin.features', update: list => list.map(f => f.code === 'INVENTORY_WAREHOUSE' ? { ...f, enabledGlobal: false } : f) }, actor('admin'));
  assert.equal(routeDecision(ws, session('owner'), B, '/id/inventory/in', now).reason, 'feature');
});
test('plan upgrades grant features and tenant suspension revokes them', () => {
  let ws = seedWorkspace(null, now);
  ws = applyCommand(ws, { type: 'admin.tenants', update: list => list.map(t => t.id === B ? { ...t, plan: 'Cơ bản (Basic)' } : t) }, actor('manager'));
  assert.equal(routeDecision(ws, session('owner'), B, '/id/ari', now).allowed, true);
  assert.equal(routeDecision(ws, session('owner'), B, '/id/ota', now).allowed, false);
  ws = applyCommand(ws, { type: 'admin.tenants', update: list => list.map(t => t.id === B ? { ...t, plan: 'Pro', status: 'Suspended' } : t) }, actor('manager'));
  assert.equal(routeDecision(ws, session('owner'), B, '/id/dashboard', now).reason, 'suspended');
});
test('trial quota counts ten lifetime creations, survives cancellation and lifts on upgrade', () => {
  let ws = seedWorkspace(null, now);
  for (let i = 0; i < 8; i++) ws = applyCommand(ws, booking(`trial-${i}`, `2026-12-${String(i + 1).padStart(2, '0')}`, `2026-12-${String(i + 2).padStart(2, '0')}`), actor('owner', B));
  assert.equal(ws.byTenant[B].bookingCount, 10);
  ws = applyCommand(ws, { type: 'booking.status', id: 'trial-0', status: 'CANCELLED' }, actor('owner', B));
  assert.throws(() => applyCommand(ws, booking('eleventh', '2026-12-20', '2026-12-21'), actor('owner', B)), /giới hạn 10/);
  ws = applyCommand(ws, { type: 'admin.tenants', update: list => list.map(t => t.id === B ? { ...t, plan: 'Basic' } : t) }, actor('manager'));
  assert.doesNotThrow(() => applyCommand(ws, booking('paid', '2026-12-20', '2026-12-21'), actor('owner', B)));
});
test('expired trials and expired feature grants stay locked', () => {
  const ws = seedWorkspace(null, now), tenant = ws.tenants.find(t => t.id === B);
  ws.tenantFeatureOverrides[B] = { OTA_SYNC: { enabled: true, expiresAt: new Date(now - 1).toISOString() } };
  assert.equal(featureDecision(ws, tenant, 'OTA_SYNC', now).allowed, false);
  tenant.trialExpiresAt = new Date(now - 1).toISOString();
  ws.tenantFeatureOverrides[B].DASHBOARD = { enabled: true };
  assert.equal(featureDecision(ws, tenant, 'DASHBOARD', now).reason, 'expired');
});
test('disabled sources are rejected, cash stays enabled and invalid room edits are atomic', () => {
  let ws = seedWorkspace(null, now);
  ws = applyCommand(ws, { type: 'master.disable', catalog: 'bookingSources', id: 'source-0' }, actor());
  assert.throws(() => applyCommand(ws, booking('bad-source'), actor()), /Nguồn/);
  assert.throws(() => applyCommand(ws, { type: 'master.disable', catalog: 'paymentMethods', id: 'cash' }, actor()), /luôn được bật/);
  const before = structuredClone(ws);
  assert.throws(() => applyCommand(ws, { type: 'master.save', catalog: 'roomTypes', input: { ...ws.byTenant[A].masters.roomTypes[0], roomNumbers: ['101', '401'] } }, actor()), /loại phòng khác/);
  assert.deepEqual(ws, before);
});
