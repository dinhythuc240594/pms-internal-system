import test from 'node:test';
import assert from 'node:assert/strict';
import { availableRooms, validateBooking, addDays, nights, money, roomIsBlocked } from './model.js';
test('money uses the record currency and preserves VND appearance',()=>{
  assert.equal(money('123456'), '123.456 ₫');
  assert.equal(money('123.45','USD'), '123,45 USD');
  assert.equal(money('1.2345','USD'), '1,2345 USD');
  assert.equal(money('999999999999999.9999'), '999.999.999.999.999,9999 ₫');
  assert.equal(money('-0.2500','USD'), '-0,25 USD');
});
const rooms = [{ id: '101', typeId: 'city', condition: 'clean' }, { id: '102', typeId: 'city', condition: 'maintenance' }, { id: '401', typeId: 'sea', condition: 'clean' }];
const booking = { id: 'A', room: '101', guest: 'Demo', checkIn: '2026-10-02', checkOut: '2026-10-04', status: 'CONFIRMED' };
test('check-out frees the room for an adjacent booking', () => {
  assert.deepEqual(availableRooms(rooms, [booking], '2026-10-04', '2026-10-05', 'city').map(r => r.id), ['101']);
  assert.equal(availableRooms(rooms, [booking], '2026-10-03', '2026-10-05', 'city').length, 0);
});
test('cancelled, no-show and checked-out reservations do not block new bookings', () => {
  for (const status of ['CANCELLED', 'NO_SHOW', 'CHECKED_OUT']) assert.equal(availableRooms(rooms, [{ ...booking, status }], '2026-10-02', '2026-10-04', 'city').length, 1);
});
test('reject invalid dates, blank guest and overlapping booking', () => {
  assert.throws(() => validateBooking({ ...booking, guest: '  ' }, rooms, []));
  assert.throws(() => validateBooking({ ...booking, checkOut: booking.checkIn }, rooms, []));
  assert.throws(() => validateBooking({ ...booking, checkOut: 'invalid' }, rooms, []));
  assert.throws(() => validateBooking(booking, rooms, [booking]));
  assert.doesNotThrow(() => validateBooking({ ...booking, room: '401' }, rooms, [booking]));
});
test('maintenance rooms and wrong room types cannot be selected', () => {
  assert.deepEqual(availableRooms(rooms, [], '2026-10-02', '2026-10-04', 'sea').map(r => r.id), ['401']);
  assert.throws(() => validateBooking({ ...booking, room: '102' }, rooms, []));
});
test('maintenance remains blocked throughout the calendar without a dated lock', () => {
  for (const day of ['2026-10-17', '2026-10-24', '2026-11-01']) {
    assert.equal(roomIsBlocked(rooms[1], [], day, addDays(day, 1)), true);
    assert.equal(roomIsBlocked(rooms[0], [], day, addDays(day, 1)), false);
  }
});
test('room locks match the room number or UUID and use an exclusive end date', () => {
  const room = { id: '101', uuid: 'room-101', condition: 'clean' };
  for (const target of [{ room: '101' }, { roomId: 'room-101' }]) {
    const blocks = [{ ...target, start: '2026-10-19', end: '2026-10-21' }];
    assert.equal(roomIsBlocked(room, blocks, '2026-10-18', '2026-10-19'), false);
    assert.equal(roomIsBlocked(room, blocks, '2026-10-19', '2026-10-20'), true);
    assert.equal(roomIsBlocked(room, blocks, '2026-10-20', '2026-10-21'), true);
    assert.equal(roomIsBlocked(room, blocks, '2026-10-21', '2026-10-22'), false);
    assert.equal(roomIsBlocked({ id: '102', condition: 'clean' }, blocks, '2026-10-19', '2026-10-20'), false);
  }
});
test('stay length uses calendar nights across month boundaries', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(nights('2026-10-31', '2026-11-02'), 2);
});
test('all assigned rooms block availability and adjacent stays remain valid', () => {
  const multi = { ...booking, rooms: ['101', '401'] };
  assert.deepEqual(availableRooms(rooms, [multi], '2026-10-03', '2026-10-04'), []);
  assert.deepEqual(availableRooms(rooms, [multi], '2026-10-04', '2026-10-05').map(r => r.id), ['101', '401']);
});
