import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingEvent } from './presentation.js';

test('booking history describes status and money without exposing technical payloads',()=>{
  assert.equal(bookingEvent({event:'reservation.status',details:{from:'IN_HOUSE',to:'CHECKED_OUT'}}).label,'Trả phòng');
  assert.match(bookingEvent({event:'reservation.refund',details:{amount:'50000.00',reason:'Điều chỉnh',refundId:'internal-id'}}).detail,/50\.000/);
  assert.equal(bookingEvent({event:'reservation.refund',details:{amount:'50000.00',reason:'Điều chỉnh',refundId:'internal-id'}}).detail.includes('internal-id'),false);
  assert.match(bookingEvent({event:'reservation.created',details:{rooms:['101','102'],checkIn:'2026-10-03',checkOut:'2026-10-04'}}).detail,/101, 102/);
  assert.match(bookingEvent({event:'reservation.payment',details:{amount:'123.45'}},'USD').detail,/123,45 USD/);
});
