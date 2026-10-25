import test from 'node:test';
import assert from 'node:assert/strict';
import { canCreateChannexProperty, channexPropertyDraft, channexPropertyInput, propertyChoices } from './propertyForm.js';

test('only system admins and managers can create properties with a configured shared source', () => {
  const account = { id: 'system:staging', configured: true };
  for (const globalRole of ['SUPER_ADMIN', 'SYSTEM_MANAGER']) assert.equal(canCreateChannexProperty({ globalRole }, account), true);
  for (const globalRole of ['USER', 'HOTEL_OWNER', 'FRONT_DESK', undefined]) assert.equal(canCreateChannexProperty({ globalRole }, account), false);
  assert.equal(canCreateChannexProperty(null, account), false);
  assert.equal(canCreateChannexProperty({ globalRole: 'SUPER_ADMIN' }, { ...account, configured: false }), false);
  assert.equal(canCreateChannexProperty({ globalRole: 'SUPER_ADMIN' }, { ...account, id: 'hotel:demo' }), false);
  assert.equal(canCreateChannexProperty({ globalRole: 'SYSTEM_MANAGER' }, { ...account, id: 'system:production' }), true);
});

test('property defaults use the selected hotel contacts and hotel operating settings', () => {
  const hotel = { name: 'An Nhiên Riverside', address: 'Đường Ven Sông', city: 'Đà Nẵng', contactEmail: 'owner@example.com', contactPhone: '0900000000' };
  assert.deepEqual(channexPropertyDraft(hotel, { currency: 'USD', timezone: 'Asia/Singapore', contactEmail: 'reception@example.com' }), {
    name: hotel.name, currency: 'USD', timezone: 'Asia/Singapore', country: 'VN', city: hotel.city, address: hotel.address, email: 'reception@example.com', phone: hotel.contactPhone,
  });
  assert.equal(channexPropertyDraft().timezone, 'Asia/Ho_Chi_Minh');
  assert.equal(channexPropertyDraft().currency, 'VND');
});

test('property payload trims text, omits blank optional fields and never forwards PMS ids or secrets', () => {
  assert.deepEqual(channexPropertyInput('system:staging', { name: ' An Nhiên ', currency: 'VND', timezone: ' Asia/Ho_Chi_Minh ', country: 'VN', city: ' Đà Nẵng ', phone: ' ', id: 'local-hotel', apiKey: 'secret' }), {
    accountId: 'system:staging', name: 'An Nhiên', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', country: 'VN', city: 'Đà Nẵng',
  });
  const valid = { name: 'An Nhiên', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', country: 'VN' };
  for (const invalid of [{ name: ' ' }, { currency: 'EUR' }, { timezone: 'Not/AZone' }, { timezone: '' }, { timezone: '+07:00' }, { country: 'Vietnam' }]) {
    assert.throws(() => channexPropertyInput('system:staging', { ...valid, ...invalid }));
  }
});

test('the newly created property stays selectable when pagination or sorting puts it on another page', () => {
  const created = { id: 'new-property', name: 'An Nhiên', linkedHotel: null };
  const page = [{ id: 'other', name: 'Khách sạn khác' }];
  assert.deepEqual(propertyChoices(page, created), [created, ...page]);
  const remote = { ...created, linkedHotel: { tenantId: 'another-hotel' } };
  assert.deepEqual(propertyChoices([remote], created), [remote]);
  assert.equal(propertyChoices(page, null), page);
});

test('property inputs enforce remote field limits without silently truncating PMS contact data', () => {
  const valid = { name: 'An Nhiên', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', country: '' };
  assert.equal('country' in channexPropertyInput('system:staging', valid), false);
  for (const [field, label, maximum] of [['name', 'Tên khách sạn', 255], ['city', 'Tỉnh / Thành phố', 255], ['address', 'Địa chỉ', 255], ['email', 'Email liên hệ', 254], ['phone', 'Điện thoại', 32]]) {
    assert.equal(channexPropertyInput('system:staging', { ...valid, [field]: 'a'.repeat(maximum) })[field].length, maximum);
    assert.throws(() => channexPropertyInput('system:staging', { ...valid, [field]: 'a'.repeat(maximum + 1) }), { message: `${label} chỉ được tối đa ${maximum} ký tự.` });
    for (const control of ['\n', '\u0000', '\u007f', '\u009f']) assert.throws(() => channexPropertyInput('system:staging', { ...valid, [field]: `a${control}b` }), { message: `${label} có ký tự điều khiển không hợp lệ. Vui lòng nhập lại.` });
  }
  const draft = channexPropertyDraft({ address: 'a'.repeat(500), contactPhone: '1'.repeat(40) });
  assert.equal(draft.address.length, 500);
  assert.equal(draft.phone.length, 40);
  assert.throws(() => channexPropertyInput('system:staging', { ...draft, name: 'An Nhiên' }), /Địa chỉ/);
});
