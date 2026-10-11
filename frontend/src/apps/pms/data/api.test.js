import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient, createRequestScope, createIntentJournal, permitted, subscriptionDecision } from './api.js';

test('front desk can read channels while only owners write; all hotel roles receive their own notifications', () => {
  const tenant = { id: 'hotel', status: 'active' };
  const user = role => ({ active: true, memberships: [{ tenantId: tenant.id, role, active: true }] });
  assert.equal(permitted(user('FRONT_DESK'), tenant, 'channels.view').allowed, true);
  assert.equal(permitted(user('FRONT_DESK'), tenant, 'channels.write').allowed, false);
  assert.equal(permitted(user('HOTEL_OWNER'), tenant, 'channels.write').allowed, true);
  for (const role of ['FRONT_DESK', 'HOUSEKEEPING', 'ACCOUNTANT']) assert.equal(permitted(user(role), tenant, 'notifications.view').allowed, true);
  assert.equal(subscriptionDecision({ status: 'active', planFeatures: { OTA_SYNC: false } }, {}, 'channels.view').reason, 'feature');
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

test('cookie credentials and CSRF protect mutations without persistent credentials', async () => {
  let request;
  const api = createApiClient(async (url, options) => { request = { url, ...options }; return new Response('{"id":"ok"}', { status: 200 }); });
  api.setCsrf('in-memory');
  await api.request('/api/tenants/a/reservations', { method: 'POST', body: { rooms: ['101'] }, intent: 'payment-intent' });
  assert.equal(request.credentials, 'include');
  assert.equal(request.headers['X-CSRF-Token'], 'in-memory');
  assert.equal(request.headers['Idempotency-Key'], 'payment-intent');
  assert.deepEqual(JSON.parse(request.body), { rooms: ['101'] });
});
test('structured 403 errors remain visible and never become successful fallback data', async () => {
  const api = createApiClient(async () => new Response('{"error":{"code":"FORBIDDEN","message":"No access"}}', { status: 403 }));
  await assert.rejects(api.request('/api/tenants/a/workspace'), error => error.status === 403 && error.message === 'No access');
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
