import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePms } from '../../data/usePms';
import { bookingRooms, today, addDays, overlaps } from '../../data/model';
import BookingModal from '../../reservations/components/BookingModal';
import BookingDetailPanel from '../../reservations/components/BookingDetailPanel';
import LegacyOverlay from '../../components/LegacyOverlay';
import { User, CalendarDays, AlertTriangle, DollarSign, Sparkles, Grid, List, X, Key, LogOut, Brush, Plus, ArrowUpRight, BedDouble } from 'lucide-react';
import './RoomDiagram.css';

export default function RoomDiagram() {
  const { rooms, bookings, available, cleanRoom, dirtyRoom, changeStatus, roomTypes, settings, roomBlocks, setCondition, allowAction, runAction, access, housekeepingTasks } = usePms();
  const [selectedRoomNumber, setSelectedRoomNumber] = useState(null);
  const [bookingId, setBookingId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [listView, setListView] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const setSelectedRoom = room => { setSelectedRoomNumber(room?.number || null); setError(''); };
  const roomCards = rooms.filter(r => r.active !== false).map(r => {
    const b = bookings.find(b => bookingRooms(b).includes(String(r.id)) && b.status === 'IN_HOUSE') || bookings.find(b => bookingRooms(b).includes(String(r.id)) && overlaps(b, today(settings.timezone), addDays(today(settings.timezone), 1)));
    const blocked = r.condition === 'maintenance' || roomBlocks.some(block => (block.room === r.id || block.roomId === r.uuid) && block.start <= today(settings.timezone) && block.end > today(settings.timezone));
    return { blocked, condition: r.condition, number: r.id, typeId: r.typeId, name: 'Phòng ' + r.id, state: b ? 'occupied' : 'empty', status: b?.status === 'CONFIRMED' ? 'confirmed' : 'in-house', guest: b?.guest, id: b?.id, checkIn: b?.checkIn, checkOut: b?.checkOut, dirty: r.condition === 'dirty' || r.condition === 'inspection', paid: b && Number(b.balance) === 0, type: roomTypes.find(t => t.id === r.typeId)?.name };
  });
  const selectedRoom = roomCards.find(r => r.number === selectedRoomNumber);
  async function checkout() { if (!allowAction('reservations.write', 'RESERVATION_VIEW')) return; try { await changeStatus(selectedRoom.id, 'CHECKED_OUT'); setError(''); } catch (err) { setError(err.message); } }
  const openCreate = () => { if (allowAction('reservations.write', 'RESERVATION_CREATE')) { setCreateOpen(true); setSelectedRoom(null); } };
  const stats = [
    { label: 'Nhận phòng hôm nay', count: bookings.filter(b => b.status === 'CONFIRMED' && b.checkIn === today(settings.timezone)).reduce((sum, b) => sum + bookingRooms(b).length, 0), kind: 'confirmed' },
    { label: 'Trả phòng hôm nay', count: bookings.filter(b => b.status === 'IN_HOUSE' && b.checkOut === today(settings.timezone)).reduce((sum, b) => sum + bookingRooms(b).length, 0), kind: 'checkout' },
    { label: 'Phòng đang có khách', count: bookings.filter(b => b.status === 'IN_HOUSE').reduce((sum, b) => sum + bookingRooms(b).length, 0), kind: 'occupied' },
    { label: 'Sẵn sàng bán', count: available().filter(r => r.condition === 'clean').length, kind: 'available' },
    { label: 'Phòng cần dọn', count: rooms.filter(r => r.active !== false && r.condition === 'dirty').length, kind: 'dirty' },
  ];
  const legend = [
    { key: '', label: 'Tất cả', matches: () => true },
    { key: 'empty', label: 'Phòng trống', matches: room => room.state === 'empty' && !room.blocked },
    { key: 'confirmed', label: 'Đã xác nhận', matches: room => room.state === 'occupied' && room.status === 'confirmed' },
    { key: 'occupied', label: 'Đang có khách', matches: room => room.state === 'occupied' && room.status !== 'confirmed' },
    { key: 'dirty', label: 'Cần dọn / kiểm tra', matches: room => room.dirty },
    { key: 'blocked', label: 'Khóa / bảo trì', matches: room => room.blocked },
  ];
  const selectedLegend = legend.find(item => item.key === statusFilter);
  const unassigned = bookings.filter(b => !b.room && ['CONFIRMED', 'IN_HOUSE'].includes(b.status));
  const floors = [...new Set(roomCards.map(r => r.number[0]))].filter(floor => !floorFilter || floor === floorFilter).map(floor => ({ name: 'Tầng ' + floor, rooms: roomCards.filter(room => room.number[0] === floor && (!typeFilter || room.typeId === typeFilter) && selectedLegend.matches(room)) })).filter(floor => floor.rooms.length);
  const roomLabel = room => room.blocked ? 'Khóa / bảo trì' : room.state === 'empty' ? 'Phòng trống' : room.status === 'confirmed' ? 'Đã xác nhận' : 'Đang có khách';
  const roomKind = room => room.blocked ? 'blocked' : room.state === 'empty' ? 'empty' : room.status === 'confirmed' ? 'confirmed' : 'occupied';
  const hasOpenTask = selectedRoom && housekeepingTasks.some(task => task.room === selectedRoom.number && !['completed', 'cancelled'].includes(task.status));

  return (
    <div className="loha-rooms">
      <header className="loha-rooms-heading"><div><span className="loha-rooms-eyebrow">TÌNH TRẠNG PHÒNG</span><h1>Sơ đồ phòng</h1><p>Toàn cảnh phòng và lượt lưu trú trong ngày · {today(settings.timezone)}</p></div><button type="button" className="loha-rooms-primary" onClick={openCreate}><Plus size={17} aria-hidden="true" />Tạo đặt phòng</button></header>
      <div className="loha-rooms-stats" aria-label="Thống kê phòng hôm nay">{stats.map(stat => <div key={stat.kind} className={'loha-rooms-stat stat-' + stat.kind}><span>{stat.label}</span><strong>{stat.count}<span>phòng</span></strong></div>)}</div>
      <section className="loha-rooms-panel" aria-label="Phòng theo khu vực">
        <div className="loha-rooms-toolbar"><div><h2>Danh sách phòng</h2><p>Chọn phòng để xem lưu trú và thực hiện thao tác.</p></div><div className="loha-rooms-filters"><label className="loha-rooms-visually-hidden" htmlFor="diagram-type">Loại phòng</label><select id="diagram-type" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}><option value="">Tất cả loại phòng</option>{roomTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select><label className="loha-rooms-visually-hidden" htmlFor="diagram-floor">Tầng</label><select id="diagram-floor" value={floorFilter} onChange={event => setFloorFilter(event.target.value)}><option value="">Tất cả tầng</option>{[...new Set(rooms.map(room => room.id[0]))].map(floor => <option key={floor} value={floor}>Tầng {floor}</option>)}</select><div className="loha-rooms-view" role="group" aria-label="Kiểu hiển thị"><button type="button" aria-label="Dạng lưới" aria-pressed={!listView} onClick={() => setListView(false)}><Grid size={16} aria-hidden="true" /></button><button type="button" aria-label="Dạng danh sách" aria-pressed={listView} onClick={() => setListView(true)}><List size={16} aria-hidden="true" /></button></div></div></div>
        <div className="loha-rooms-legend" aria-label="Lọc tình trạng phòng">{legend.map(item => <button key={item.key} type="button" aria-pressed={statusFilter === item.key} className={'legend-' + (item.key || 'all')} onClick={() => setStatusFilter(item.key)}><span className="loha-rooms-dot" aria-hidden="true" />{item.label}<strong>{roomCards.filter(item.matches).length}</strong></button>)}</div>
        <div className="loha-rooms-body">
          {!!unassigned.length && <section className="loha-rooms-unassigned"><div className="loha-rooms-floor-heading"><h3>Chưa gán phòng</h3><span>{unassigned.length} đặt phòng</span></div><div className={'loha-rooms-grid' + (listView ? ' is-list' : '')}>{unassigned.map(booking => <button type="button" key={booking.id} className="loha-room-card room-confirmed" onClick={() => setBookingId(booking.id)}><span className="loha-room-card-top"><strong>Chưa gán phòng</strong><ArrowUpRight size={16} aria-hidden="true" /></span><span className="loha-room-card-body"><strong className="loha-room-guest"><User size={14} aria-hidden="true" />{booking.guest}</strong><span className="loha-room-stay">{booking.checkIn} → {booking.checkOut}</span><span className="loha-room-booking-code">{booking.id}</span><span className="loha-room-status">{booking.status === 'CONFIRMED' ? 'Đã xác nhận' : 'Đang ở'}</span></span></button>)}</div></section>}
          {floors.map(floor => <section className="loha-rooms-floor" key={floor.name}><div className="loha-rooms-floor-heading"><h3>{floor.name}</h3><span>{floor.rooms.length} phòng</span></div><div className={'loha-rooms-grid' + (listView ? ' is-list' : '')}>{floor.rooms.map(room => <button type="button" key={room.number} className={'loha-room-card room-' + roomKind(room)} onClick={() => setSelectedRoom(room)} aria-label={`${room.name}, ${roomLabel(room)}${room.dirty ? ', cần dọn hoặc kiểm tra' : ''}`}><span className="loha-room-card-top"><strong>{room.name}</strong><span className="loha-room-card-icons">{room.dirty && <AlertTriangle size={15} aria-label={room.condition === 'inspection' ? 'Đang kiểm tra' : 'Phòng bẩn'} />}{room.state !== 'empty' && room.paid && <DollarSign size={15} aria-label="Đã thanh toán đủ" />}<ArrowUpRight size={16} aria-hidden="true" /></span></span><span className="loha-room-type">{room.type || 'Chưa chọn loại phòng'}</span><span className="loha-room-card-body">{room.state === 'empty' ? <span className="loha-room-empty"><BedDouble size={22} aria-hidden="true" /><span>{roomLabel(room)}</span>{room.dirty && <small>{room.condition === 'inspection' ? 'Đang kiểm tra' : 'Cần dọn dẹp'}</small>}</span> : <><strong className="loha-room-guest"><User size={14} aria-hidden="true" />{room.guest}</strong><span className="loha-room-stay">{room.checkIn} → {room.checkOut}</span><span className="loha-room-booking-code">{room.id}</span></>}</span><span className="loha-room-card-footer"><span className="loha-room-status">{roomLabel(room)}</span>{room.state !== 'empty' && <span className="loha-room-payment">{room.paid ? 'Đã thanh toán' : 'Còn phải thu'}</span>}</span></button>)}</div></section>)}
          {!floors.length && <div className="loha-rooms-empty" role="status"><BedDouble size={32} aria-hidden="true" /><strong>{roomCards.length ? 'Không có phòng phù hợp bộ lọc' : 'Chưa có phòng trong hệ thống'}</strong><span>{roomCards.length ? 'Chọn tình trạng hoặc khu vực khác để xem phòng.' : 'Phòng đã cấu hình sẽ xuất hiện tại đây.'}</span></div>}
        </div>
      </section>
      {selectedRoom && <LegacyOverlay title={selectedRoom.name} onClose={() => setSelectedRoom(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(18,43,68,.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
        <div className="loha-room-dialog"><header className="loha-room-dialog-heading"><div><h2>{selectedRoom.name}</h2><span className={'loha-room-status room-' + roomKind(selectedRoom)}>{roomLabel(selectedRoom)}</span>{selectedRoom.dirty && <span className="loha-room-dirty">{selectedRoom.condition === 'inspection' ? 'Đang kiểm tra' : 'Cần dọn'}</span>}</div><button type="button" aria-label="Đóng" className="loha-room-close" onClick={() => setSelectedRoom(null)}><X size={18} /></button></header>
          <div className="loha-room-dialog-info">{selectedRoom.state === 'occupied' ? <><div><span>Khách lưu trú</span><strong>{selectedRoom.guest}</strong></div><div><span>Mã đặt phòng</span><strong>{selectedRoom.id}</strong></div><div><span>Thời gian lưu trú</span><strong>{selectedRoom.checkIn} → {selectedRoom.checkOut}</strong></div><div><span>Loại phòng</span><strong>{selectedRoom.type}</strong></div><div><span>Thanh toán</span><strong>{selectedRoom.paid ? 'Đã thanh toán đủ' : 'Chưa thanh toán đủ'}</strong></div></> : <><div><span>Loại phòng</span><strong>{selectedRoom.type}</strong></div><div><span>Dọn dẹp</span><strong>{selectedRoom.condition === 'inspection' ? 'Đang kiểm tra' : selectedRoom.condition === 'maintenance' ? 'Bảo trì / hỏng' : selectedRoom.dirty ? 'Cần dọn dẹp' : 'Đã dọn sạch'}</strong></div></>}</div>
          {error && <p role="alert" className="loha-room-error">{error}</p>}
          <div className="loha-room-dialog-actions">
            {access('housekeeping.manage').allowed && !hasOpenTask && selectedRoom.condition !== 'inspection' && <button type="button" onClick={() => runAction('housekeeping.write', '', () => setCondition(selectedRoom.number, selectedRoom.condition === 'maintenance' ? 'dirty' : 'maintenance'))}>{selectedRoom.condition === 'maintenance' ? 'Kết thúc bảo trì (cần dọn)' : 'Đánh dấu bảo trì'}</button>}
            <button type="button" className="loha-rooms-primary" onClick={() => { if (selectedRoom.id) setBookingId(selectedRoom.id); else openCreate(); }}><Grid size={17} aria-hidden="true" />Xem chi tiết phòng</button>
            <div className="loha-room-action-grid">{selectedRoom.state === 'empty' ? <>
              <button type="button" disabled={selectedRoom.blocked} title={selectedRoom.blocked ? 'Phòng đang khóa / bảo trì' : ''} onClick={openCreate}><Key size={16} aria-hidden="true" />Nhận phòng</button>
              <button type="button" onClick={openCreate}><CalendarDays size={16} aria-hidden="true" />Giữ phòng</button>
              {selectedRoom.condition === 'inspection' || !access('housekeeping.manage').allowed || hasOpenTask ? <Link className="loha-room-action-wide" to="/id/housekeeping/plan">Xem công việc buồng phòng</Link> : selectedRoom.dirty ? <button type="button" className="loha-room-action-wide" onClick={() => runAction('housekeeping.write', 'HOUSEKEEPING', () => cleanRoom(selectedRoom.number))}><Sparkles size={16} aria-hidden="true" />Đánh dấu sạch</button> : <button type="button" className="loha-room-action-wide" onClick={() => runAction('housekeeping.write', 'HOUSEKEEPING', () => dirtyRoom(selectedRoom.number))}><Brush size={16} aria-hidden="true" />Đánh dấu bẩn</button>}
            </> : <>
              <button type="button" onClick={() => setBookingId(selectedRoom.id)}><User size={16} aria-hidden="true" />Sửa đặt phòng</button>
              <button type="button" onClick={() => setBookingId(selectedRoom.id)}><DollarSign size={16} aria-hidden="true" />Dịch vụ</button>
              <button type="button" className="loha-room-action-wide" disabled={selectedRoom.status !== 'confirmed' && !selectedRoom.paid} title={!selectedRoom.paid ? 'Cần thanh toán đủ trước khi trả phòng' : ''} onClick={() => selectedRoom.status === 'confirmed' ? setBookingId(selectedRoom.id) : checkout()}><LogOut size={16} aria-hidden="true" />{selectedRoom.status === 'confirmed' ? 'Nhận phòng' : 'Trả phòng'}</button>
            </>}</div>
          </div>
        </div>
      </LegacyOverlay>}
      {bookingId && <BookingDetailPanel bookingId={bookingId} onClose={() => setBookingId(null)} />}
      {createOpen && <BookingModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
