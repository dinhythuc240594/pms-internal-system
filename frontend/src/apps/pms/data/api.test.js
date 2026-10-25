import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient, createRequestScope, createIntentJournal, localizeApiPayload, permitted, subscriptionDecision } from './api.js';
import { translateApiValue } from '../../../shared/i18n/core.js';
import { routePolicy } from './access.js';
import { setLocale } from '../../../shared/i18n/store.js';

test('API requests advertise the selected interface language', async () => {
  let request;
  const api = createApiClient(async (url, options) => {
    request = { url, ...options };
    return new Response('{}');
  });
  try {
    setLocale('zh-CN');
    await api.request('/api/locale');
    assert.equal(request.headers['Accept-Language'], 'zh-CN');
  } finally {
    setLocale('vi');
  }
});

test('API payload localization preserves reactive translation references and business data', () => {
  const payload = localizeApiPayload({
    definitions: { period: 'i18n:reports.definitions.period' },
    notification: {
      title: 'i18n:notifications.events.NEW_BOOKING',
      body: { $i18n: 'notifications.eventBodies.NEW_BOOKING', values: { entityId: 'booking-42' } },
    },
    error: { message: 'Cấu hình giá không hợp lệ.' },
    guestName: 'Nguyễn Thị Ánh',
    sourceName: 'Nguồn riêng',
  }, 'en-US');
  assert.equal(payload.definitions.period, 'i18n:reports.definitions.period');
  assert.equal(payload.notification.title, 'i18n:notifications.events.NEW_BOOKING');
  assert.deepEqual(payload.notification.body, { $i18n: 'notifications.eventBodies.NEW_BOOKING', values: { entityId: 'booking-42' } });
  assert.match(translateApiValue('en-US', payload.definitions.period), /Hotel business dates/i);
  assert.equal(translateApiValue('en-US', payload.notification.title), 'New booking');
  assert.equal(translateApiValue('en-US', payload.notification.body), 'New booking: booking-42');
  assert.match(translateApiValue('zh-CN', payload.definitions.period), /酒店营业日期/);
  assert.notEqual(payload.error.message, 'Cấu hình giá không hợp lệ.');
  assert.equal(payload.guestName, 'Nguyễn Thị Ánh');
  assert.equal(payload.sourceName, 'Nguồn riêng');
});

test('commissions share cashbook role and subscription boundaries', () => {
  assert.deepEqual(routePolicy('/id/commissions'), { action: 'cashbook.view', feature: 'CASHBOOK' });
  const tenant = { id: 'hotel', status: 'active' };
  const user = role => ({ active: true, memberships: [{ tenantId: tenant.id, role }] });
  assert.equal(permitted(user('FRONT_DESK'), tenant, 'cashbook.view').allowed, true);
  assert.equal(permitted(user('FRONT_DESK'), tenant, 'cashbook.write').allowed, false);
  assert.equal(permitted(user('ACCOUNTANT'), tenant, 'cashbook.write').allowed, true);
  assert.equal(subscriptionDecision({ status: 'active', effectiveFeatures: { CASHBOOK: false } }, {}, 'cashbook.view').reason, 'feature');
  assert.equal(subscriptionDecision({ status: 'expired' }, {}, 'cashbook.write').reason, 'expired');
});

test('advanced reports require their own role and feature while basic reports keep basic access', () => {
  const tenant = { id: 'hotel', status: 'active' };
  const user = role => ({ active: true, memberships: [{ tenantId: tenant.id, role }] });
  for (const report of ['source', 'room', 'roomType', 'cancellations', 'nationality', 'discounts']) {
    assert.deepEqual(routePolicy('/id/reports/' + report), { action: 'reports.advanced.view', feature: 'REPORTS_ADVANCED' });
  }
  assert.equal(routePolicy('/id/reports/revenue').feature, 'REPORTS_BASIC');
  assert.equal(permitted(user('ACCOUNTANT'), tenant, 'reports.advanced.view').allowed, true);
  assert.equal(permitted(user('FRONT_DESK'), tenant, 'reports.advanced.view').allowed, false);
  const subscription = { status: 'active', effectiveFeatures: { REPORTS_BASIC: true, REPORTS_ADVANCED: false } };
  assert.equal(subscriptionDecision(subscription, {}, 'reports.advanced.view').reason, 'feature');
  assert.equal(subscriptionDecision(subscription, {}, 'reports.view').allowed, true);
});

test('front desk can read channels while only owners write; all hotel roles receive their own notifications', () => {
  const tenant = { id: 'hotel', status: 'active' };
  const user = role => ({ active: true, memberships: [{ tenantId: tenant.id, role, active: true }] });
  assert.equal(permitted(user('FRONT_DESK'), tenant, 'channels.view').allowed, true);
  assert.equal(permitted(user('FRONT_DESK'), tenant, 'channels.write').allowed, false);
  assert.equal(permitted(user('HOTEL_OWNER'), tenant, 'channels.write').allowed, true);
  for (const role of ['FRONT_DESK', 'HOUSEKEEPING', 'ACCOUNTANT']) assert.equal(permitted(user(role), tenant, 'notifications.view').allowed, true);
  assert.equal(subscriptionDecision({ status: 'active', planFeatures: { OTA_SYNC: false } }, {}, 'channels.view').reason, 'feature');
});

test('OTA settings retain front desk reads without granting hotel settings or channel writes', () => {
  const tenant = { id: 'hotel', status: 'active' };
  const user = role => ({ active: true, memberships: [{ tenantId: tenant.id, role, active: true }] });
  for (const tab of ['channels', 'connection', 'history']) {
    const policy = routePolicy('/id/settings?section=channels&tab=' + tab);
    assert.deepEqual(policy, { action: 'channels.view', feature: 'OTA_SYNC' });
    assert.equal(permitted(user('FRONT_DESK'), tenant, policy.action, false).allowed, true);
    for (const role of ['ACCOUNTANT', 'HOUSEKEEPING']) assert.equal(permitted(user(role), tenant, policy.action, false).allowed, false);
    assert.equal(subscriptionDecision({ status: 'active', effectiveFeatures: { OTA_SYNC: false } }, {}, policy.action, policy.feature, false).reason, 'feature');
  }
  for (const path of ['/id/settings', '/id/settings?section=business&tab=channels', '/id/settings?section=channels%26business', '/id/settings-other?section=channels']) {
    const policy = routePolicy(path);
    assert.equal(policy.action, 'settings.write');
    assert.equal(permitted(user('FRONT_DESK'), tenant, policy.action, false).allowed, false);
    assert.equal(permitted(user('HOTEL_OWNER'), tenant, policy.action, false).allowed, true);
  }
  assert.equal(permitted(user('FRONT_DESK'), tenant, 'channels.write').allowed, false);
  assert.equal(permitted(user('FRONT_DESK'), tenant, 'settings.write').allowed, false);
});

test('ambiguous money writes reuse an opaque intent across form remount and reload', async () => {
  const values=new Map();const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  const first=createIntentJournal(storage);const body={amount:'125000.00',fundId:'fund',note:'private note'};
  const pending=await first.acquire('/api/tenants/a/reservations/b/payments',body,'first');
  const reloaded=createIntentJournal(storage);
  assert.equal((await reloaded.acquire('/api/tenants/a/reservations/b/payments',{note:'private note',fundId:'fund',amount:'125000.00'},'new-form')).key,pending.key);
  assert.equal([...values.values()].join('').includes('125000'),false);
  assert.equal([...values.values()].join('').includes('private note'),false);
  reloaded.confirm(pending);
  assert.equal((await reloaded.acquire('/api/tenants/a/reservations/b/payments',body,'next-confirmed-operation')).key,'next-confirmed-operation');
});

test('deployment API origin retains credentialed API paths',async()=>{
  let path;const api=createApiClient(async url=>{path=url;return new Response('{}');},'https://api.example.test/');
  await api.request('/api/auth/session');assert.equal(path,'https://api.example.test/api/auth/session');
});

test('tenant money retries keep the same actor and preserve unknown legacy results', async () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const path = '/api/tenants/a/reservations/b/payments', body = { amount: '25', methodId: 'bank' };
  await createIntentJournal(storage).acquire(path, body, 'owner-key', 'owner');
  assert.equal((await createIntentJournal(storage).acquire(path, body, 'desk-key', 'desk')).key, 'desk-key');
  assert.equal((await createIntentJournal(storage).acquire(path, body, 'retry', 'owner')).key, 'owner-key');
  const legacyPath = '/api/tenants/a/cashbook';
  const old = await createIntentJournal(storage).acquire(legacyPath, body, 'legacy-key');
  const upgraded = createIntentJournal(storage);
  const retry = await upgraded.acquire(legacyPath, body, 'new-key', 'owner');
  assert.deepEqual(retry, old);
  upgraded.confirm(retry);
  assert.equal((await upgraded.acquire(legacyPath, body, 'next-key', 'owner')).key, 'next-key');
});

test('cookie credentials and CSRF protect mutations without persistent credentials', async () => {
  let request;
  const api = createApiClient(async (url, options) => { request = { url, ...options }; return new Response('{"id":"ok"}', { status: 200 }); });
  api.setCsrf('in-memory');
  await api.request('/api/tenants/a/reservations', { method: 'POST', body: { rooms: ['101'] }, intent: 'payment-intent' });
  assert.equal(request.credentials, 'include');
  assert.equal(request.headers['Accept-Language'], 'vi');
  assert.equal(request.headers['X-CSRF-Token'], 'in-memory');
  assert.equal(request.headers['Idempotency-Key'], 'payment-intent');
  assert.deepEqual(JSON.parse(request.body), { rooms: ['101'] });
});
test('structured 403 errors remain visible and never become successful fallback data', async () => {
  const api = createApiClient(async () => new Response('{"error":{"code":"FORBIDDEN","message":"No access"}}', { status: 403 }));
  await assert.rejects(api.request('/api/tenants/a/workspace'), error => error.status === 403 && error.message === 'No access');
});

test('pending activity distinguishes concurrent reads and writes until each finishes', async () => {
  const responses = [Promise.withResolvers(), Promise.withResolvers(), Promise.withResolvers()];
  const activity = [];
  let next = 0;
  const api = createApiClient(() => responses[next++].promise, '', value => activity.push(value));
  const first = api.request('/api/one');
  const second = api.request('/api/two');
  const write = api.request('/api/auth/login', { method: 'POST', body: { password: 'private' } });
  try {
    assert.deepEqual(activity.at(-1), { reads: 2, writes: 1 });
    responses[0].resolve(new Response('{}'));
    await first;
    assert.deepEqual(activity.at(-1), { reads: 1, writes: 1 });
    responses[2].resolve(new Response('{}'));
    await write;
    assert.deepEqual(activity.at(-1), { reads: 1, writes: 0 });
    responses[1].resolve(new Response('{}'));
    await second;
    assert.deepEqual(activity, [
      { reads: 1, writes: 0 }, { reads: 2, writes: 0 }, { reads: 2, writes: 1 },
      { reads: 1, writes: 1 }, { reads: 1, writes: 0 }, { reads: 0, writes: 0 },
    ]);
  } finally {
    for (const response of responses) response.resolve(new Response('{}'));
    await Promise.all([first, second, write]);
  }
});

test('pending activity remains visible until JSON decoding completes', async () => {
  const json = Promise.withResolvers(), parsing = Promise.withResolvers();
  const activity = [];
  const api = createApiClient(async () => ({ status: 200, ok: true, json() { parsing.resolve(); return json.promise; } }), '', value => activity.push(value));
  const request = api.request('/api/one');
  try {
    await parsing.promise;
    assert.deepEqual(activity, [{ reads: 1, writes: 0 }]);
    json.resolve({ id: 'one' });
    assert.deepEqual(await request, { id: 'one' });
    assert.deepEqual(activity.at(-1), { reads: 0, writes: 0 });
  } finally {
    json.resolve({ id: 'one' });
    await request;
  }
});

test('pending activity clears after HTTP failures and preserves API error details', async () => {
  const activity = [];
  const api = createApiClient(async () => new Response('{"error":{"code":"FORBIDDEN","message":"No access"}}', { status: 403 }), '', value => activity.push(value));
  await assert.rejects(api.request('/api/one', { method: 'PATCH', body: {} }), error => error.status === 403 && error.code === 'FORBIDDEN' && error.message === 'No access');
  assert.deepEqual(activity, [{ reads: 0, writes: 1 }, { reads: 0, writes: 0 }]);
});

test('pending activity clears after network failures and cancellation', async () => {
  for (const failure of [new Error('Network failed'), new DOMException('Cancelled', 'AbortError')]) {
    const activity = [];
    const api = createApiClient(async () => { throw failure; }, '', value => activity.push(value));
    await assert.rejects(api.request('/api/one'), error => error === failure);
    assert.deepEqual(activity, [{ reads: 1, writes: 0 }, { reads: 0, writes: 0 }]);
  }
});

test('pending activity clears for empty 204 responses without decoding JSON', async () => {
  const activity = [];
  const api = createApiClient(async () => new Response(null, { status: 204 }), '', value => activity.push(value));
  assert.equal(await api.request('/api/one', { method: 'DELETE' }), null);
  assert.deepEqual(activity, [{ reads: 0, writes: 1 }, { reads: 0, writes: 0 }]);
});

test('old tenant responses cannot publish after switching tenant or session', () => {
  const scope = createRequestScope();
  const old = scope.select('hotel-a');
  const current = scope.select('hotel-b');
  assert.equal(scope.isCurrent(old), false);
  assert.equal(scope.isCurrent(current), true);
  scope.select(null);
  assert.equal(scope.isCurrent(current), false);
});
test('role access has no commercial plan gates and rejects suspended membership', () => {
  const user = { globalRole: 'USER', active: true, memberships: [{ tenantId: 'a', role: 'FRONT_DESK', active: true }] };
  assert.equal(permitted(user, { id: 'a', status: 'ACTIVE' }, 'payments.write').allowed, true);
  assert.equal(permitted(user, { id: 'a', status: 'ACTIVE' }, 'settings.write').allowed, false);
  assert.equal(permitted(user, { id: 'a', status: 'SUSPENDED' }, 'reservations.write').allowed, false);
});

test('a suspended hotel can read its inbox but cannot write read markers', () => {
  const user = { active: true, memberships: [{ tenantId: 'a', role: 'FRONT_DESK', active: true }] };
  const tenant = { id: 'a', status: 'SUSPENDED' };
  assert.equal(permitted(user, tenant, 'notifications.view').allowed, true);
  assert.equal(permitted(user, tenant, 'notifications.view', true).reason, 'suspended');
  assert.equal(subscriptionDecision({ status: 'expired' }, {}, 'notifications.view', undefined, false).allowed, true);
  assert.equal(subscriptionDecision({ status: 'expired' }, {}, 'notifications.view', undefined, true).reason, 'expired');
});

test('expired housekeeping management is a write while explicit read overrides remain available', () => {
  const expired = { status: 'expired', planFeatures: { HOUSEKEEPING: true } };
  assert.equal(subscriptionDecision(expired, {}, 'housekeeping.manage').reason, 'expired');
  assert.equal(subscriptionDecision(expired, {}, 'housekeeping.view').allowed, true);
  assert.equal(subscriptionDecision(expired, {}, 'housekeeping.manage', undefined, false).allowed, true);
  assert.equal(subscriptionDecision(expired, {}, 'notifications.view', undefined, true).reason, 'expired');
});

test('subscription gates preserve reads but reject expired writes and explicitly disabled features', () => {
  const now = Date.parse('2026-10-04T00:00:00Z');
  const expired = {status:'active',endDate:'2026-10-03T00:00:00Z',planFeatures:{POS_SALES:true}};
  assert.equal(subscriptionDecision(expired,{POS_SALES:false},'pos.view',undefined,false,now).allowed,true);
  assert.equal(subscriptionDecision(expired,{},'pos.write',undefined,true,now).reason,'expired');
  assert.equal(subscriptionDecision({status:'active',planFeatures:{POS_SALES:false}}, {},'pos.view').reason,'feature');
  assert.equal(subscriptionDecision({status:'active',effectiveActive:false}, {},'settings.write',undefined,true).allowed,false);
  assert.equal(subscriptionDecision(null,{},'reservations.write',undefined,true).allowed,true);
});

test('SaaS payment retry keeps its actor and cannot reuse another managers pending key', async () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const path = '/api/billing/invoices/invoice/payments', body = { amount: '25', method: 'bank' };
  const first = await createIntentJournal(storage).acquire(path, body, 'admin-payment', 'admin');
  const journal = createIntentJournal(storage);
  assert.equal((await journal.acquire(path, body, 'manager-payment', 'manager')).key, 'manager-payment');
  assert.equal((await journal.acquire(path, body, 'admin-retry', 'admin')).key, first.key);
  assert.equal([...values.values()].join('').includes('"amount"'), false);
});

test('effective feature access honors hotel grants, global switches and legacy subscriptions', () => {
  const active = { status: 'active', planFeatures: { POS_SALES: false }, effectiveFeatures: { POS_SALES: true } };
  assert.equal(subscriptionDecision(active, {}, 'pos.view').allowed, true);
  assert.equal(subscriptionDecision(active, {}, 'pos.write').allowed, true);
  assert.equal(subscriptionDecision({ ...active, effectiveFeatures: { POS_SALES: false } }, {}, 'pos.view').reason, 'feature');
  assert.equal(subscriptionDecision({ ...active, status: 'expired' }, {}, 'pos.write').reason, 'expired');
  assert.equal(subscriptionDecision(null, { POS_SALES: false }, 'pos.view').reason, 'feature');
  assert.equal(subscriptionDecision(null, { POS_SALES: true }, 'pos.write').allowed, true);
});
