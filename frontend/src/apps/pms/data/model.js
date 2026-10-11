export const today = (timezone = 'Asia/Ho_Chi_Minh') => new Date().toLocaleDateString('en-CA', { timeZone: timezone });
export const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
export const nights = (start, end) => (Date.parse(end) - Date.parse(start)) / 86400000;
export const money = (value,currency='VND') => {
  const match=String(value??0).match(/^(-?)(\d+)(?:\.(\d{0,4}))?$/);
  if(!match)return Number(value).toLocaleString('vi-VN',{minimumFractionDigits:currency==='VND'?0:2,maximumFractionDigits:4})+' '+(currency==='VND'?'₫':currency);
  const fraction=(match[3]||'').replace(/0+$/,'').padEnd(currency==='VND'?0:2,'0');
  return match[1]+BigInt(match[2]).toLocaleString('vi-VN')+(fraction?','+fraction:'')+' '+(currency==='VND'?'₫':currency);
};
export const statusLabels = { CONFIRMED: 'Đã xác nhận', IN_HOUSE: 'Đang ở', CHECKED_OUT: 'Đã trả phòng', CANCELLED: 'Đã hủy' };
export const roomTypes = [{ id: 'city', name: 'Deluxe City View', price: 1200000 }, { id: 'sea', name: 'Deluxe Seaview', price: 1500000 }, { id: 'standard', name: 'Standard Room', price: 800000 }];
export const initialRooms = ['101', '102', '201', '202', '401', '402', '403', '404', '501', '502', '601', '602'].map((id, i) => ({ id, typeId: i < 4 ? 'city' : i < 8 ? 'sea' : 'standard', condition: id === '102' ? 'dirty' : 'clean' }));
export const bookingRooms = booking => booking.rooms?.length ? booking.rooms.map(String) : booking.room ? [String(booking.room)] : [];
export const roomCount = bookings => bookings.reduce((count, booking) => count + bookingRooms(booking).length, 0);
export const active = booking => ['CONFIRMED', 'IN_HOUSE'].includes(booking.status);
export const overlaps = (booking, start, end) => active(booking) && booking.checkIn < end && booking.checkOut > start;
export function availableRooms(rooms, bookings, start, end, typeId = '', excludeId = '') {
  if (!start || !end || nights(start, end) <= 0) return [];
  return rooms.filter(room => room.active !== false && (!typeId || room.typeId === typeId) && room.condition !== 'maintenance' && !bookings.some(b => b.id !== excludeId && bookingRooms(b).includes(String(room.id)) && overlaps(b, start, end)));
}
export function validateBooking(input, rooms, bookings) {
  if (!input.guest?.trim()) throw new Error('Vui lòng nhập tên khách.');
  if (!input.checkIn || !input.checkOut || !Number.isFinite(nights(input.checkIn, input.checkOut)) || nights(input.checkIn, input.checkOut) <= 0) throw new Error('Ngày trả phòng phải sau ngày nhận phòng.');
  if (!availableRooms(rooms, bookings, input.checkIn, input.checkOut).some(r => r.id === input.room)) throw new Error('Phòng không còn trống trong khoảng ngày đã chọn.');
}
export function seedState() {
  const date = today();
  return { rooms: initialRooms, bookings: [
    { id: 'RES-00598', guest: 'Varun Deshmane', phone: '', room: '202', source: 'Booking.com', checkIn: date, checkOut: addDays(date, 1), total: 1200000, status: 'IN_HOUSE' },
    { id: 'RES-00612', guest: 'Herundina Jurado', phone: '', room: '401', source: 'Direct', checkIn: date, checkOut: addDays(date, 2), total: 3000000, status: 'CONFIRMED' }
  ], receipts: [], housekeepingLog: [] };
}
