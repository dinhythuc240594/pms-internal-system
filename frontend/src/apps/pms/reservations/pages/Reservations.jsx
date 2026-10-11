import { useState } from 'react';
import { Search, Plus, Download, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, ClipboardList } from 'lucide-react';
import { usePms } from '../../data/usePms';
import { today, nights, statusLabels, money, bookingRooms } from '../../data/model';
import BookingModal from '../components/BookingModal';
import BookingDetailPanel from '../components/BookingDetailPanel';
import './Reservations.css';

export default function Reservations() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const { bookings, rooms, roomTypes, settings, allowAction, bookingSources } = usePms();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);
  const [filterMenu, setFilterMenu] = useState('');
  const filtered = bookings.filter(b => (b.id + ' ' + b.guest + ' ' + bookingRooms(b).join(' ') + ' ' + (b.phone || '')).toLowerCase().includes(query.toLowerCase()) && (!status || b.status === status) && (!source || b.source === source));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * 10, currentPage * 10).map(b => ({ ...b, room: bookingRooms(b).join(', '), roomType: roomTypes.find(t => t.id === rooms.find(r => r.id === (b.room || bookingRooms(b)[0]))?.typeId)?.name, nights: nights(b.checkIn, b.checkOut), total: money(b.total, b.currency) }));
  const openCreate = () => { if (allowAction('reservations.write', 'RESERVATION_CREATE')) setIsModalOpen(true); };

  return (
    <div className="loha-reservations">
      <header className="loha-reservations-heading">
        <div><span className="loha-reservations-eyebrow">QUẢN LÝ LƯU TRÚ</span><h1>Đặt phòng</h1><p>Tra cứu, sắp xếp phòng và theo dõi từng lượt lưu trú.</p></div>
        <div className="loha-reservations-actions">
          <button type="button" onClick={() => exportCsv(filtered)}><Download size={16} aria-hidden="true" />Xuất dữ liệu</button>
          <button type="button" className="is-primary" onClick={openCreate}><Plus size={17} aria-hidden="true" />Tạo đặt phòng</button>
        </div>
      </header>

      <div className="loha-reservations-status-strip" aria-label="Tổng quan đặt phòng">
        {[['', 'Tất cả'], ['CONFIRMED', 'Đã xác nhận'], ['IN_HOUSE', 'Đang ở'], ['CHECKED_OUT', 'Đã trả phòng'], ['CANCELLED', 'Đã hủy']].map(([code, label]) => <button key={code} type="button" className={status === code ? 'is-selected' : ''} aria-pressed={status === code} onClick={() => { setStatus(code); setPage(1); }}><span>{label}</span><strong>{code ? bookings.filter(booking => booking.status === code).length : bookings.length}</strong></button>)}
      </div>

      <section className="loha-reservations-panel" aria-label="Danh sách đặt phòng">
        <div className="loha-reservations-toolbar">
          <label className="loha-reservations-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="Tìm đặt phòng" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Tên khách, mã đặt phòng, số phòng…" /></label>
          <div className="loha-reservations-filters">
            <button type="button" aria-expanded={filterMenu === 'status' || filterMenu === 'all'} onClick={() => setFilterMenu(filterMenu === 'status' ? '' : 'status')}>{statusLabels[status] || 'Trạng thái'}<ChevronDown size={15} aria-hidden="true" /></button>
            <button type="button" aria-expanded={filterMenu === 'source' || filterMenu === 'all'} onClick={() => setFilterMenu(filterMenu === 'source' ? '' : 'source')}>{source || 'Nguồn đặt'}<ChevronDown size={15} aria-hidden="true" /></button>
            <button type="button" aria-expanded={Boolean(filterMenu)} onClick={() => setFilterMenu(filterMenu ? '' : 'all')}><SlidersHorizontal size={15} aria-hidden="true" />Bộ lọc</button>
          </div>
        </div>
        {filterMenu && <div className="loha-reservations-advanced">
          {filterMenu !== 'source' && <label>Trạng thái<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Tất cả trạng thái</option>{Object.entries(statusLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>}
          {filterMenu !== 'status' && <label>Nguồn đặt<select value={source} onChange={event => { setSource(event.target.value); setPage(1); }}><option value="">Tất cả nguồn</option>{[...new Set([...bookingSources.map(item => item.name), ...bookings.map(booking => booking.source)])].filter(Boolean).map(value => <option key={value}>{value}</option>)}</select></label>}
          <button type="button" onClick={() => { setStatus(''); setSource(''); setQuery(''); setPage(1); }}>Xóa bộ lọc</button>
        </div>}
        <div className="loha-reservations-list-heading"><span><strong>{filtered.length}</strong> đặt phòng{query || status || source ? ' phù hợp bộ lọc' : ' trong hệ thống'}</span><span><CalendarDays size={14} aria-hidden="true" />Hôm nay · {today(settings.timezone)}</span></div>
        <div className="loha-reservations-table-scroll" tabIndex={0} role="region" aria-label="Bảng đặt phòng, có thể cuộn ngang">
          <table>
            <thead><tr>{['Mã đặt phòng', 'Khách hàng', 'Phòng', 'Thời gian lưu trú', 'Trạng thái', 'Nguồn đặt', 'Tổng tiền'].map(title => <th key={title} scope="col">{title}</th>)}</tr></thead>
            <tbody>
              {rows.map(row => <tr key={row.id}>
                <td><button type="button" className="loha-reservations-code" onClick={() => setSelectedBookingId(row.id)}>{row.id}</button></td>
                <td><div className="loha-reservations-guest"><span className="loha-reservations-avatar" aria-hidden="true">{row.guest.charAt(0)}</span><span><strong>{row.guest}</strong>{row.phone && <small>{row.phone}</small>}</span></div></td>
                <td><strong>{row.room && row.room !== 'Unassigned' ? 'Phòng ' + row.room : 'Chưa gán phòng'}</strong><small>{row.roomType || '—'}</small></td>
                <td><strong className="loha-reservations-dates">{row.checkIn}<span aria-hidden="true"> → </span>{row.checkOut}</strong><small>{row.nights} đêm</small></td>
                <td><span className={'loha-reservations-badge status-' + row.status.toLowerCase()}>{statusLabels[row.status] || (row.status === 'NO_SHOW' ? 'Không đến' : row.status)}</span></td>
                <td><span className="loha-reservations-source">{row.source}</span></td>
                <td className="loha-reservations-total">{row.total}</td>
              </tr>)}
              {!rows.length && <tr><td colSpan={7}><div className="loha-reservations-empty" role="status"><ClipboardList size={30} aria-hidden="true" /><strong>{bookings.length ? 'Không tìm thấy đặt phòng phù hợp' : 'Chưa có đặt phòng'}</strong><span>{bookings.length ? 'Thử thay đổi từ khóa hoặc bộ lọc.' : 'Các đặt phòng mới sẽ xuất hiện tại đây.'}</span></div></td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="loha-reservations-pagination"><span>Hiển thị <strong>{filtered.length ? (currentPage - 1) * 10 + 1 : 0}–{Math.min(currentPage * 10, filtered.length)}</strong> / {filtered.length} đặt phòng</span><nav aria-label="Phân trang đặt phòng"><button type="button" aria-label="Trang trước" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).filter(number => Math.abs(number - currentPage) <= 2).map(number => <button type="button" key={number} aria-current={number === currentPage ? 'page' : undefined} className={number === currentPage ? 'is-current' : ''} onClick={() => setPage(number)}>{number}</button>)}<button type="button" aria-label="Trang sau" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></nav></footer>
      </section>
      {isModalOpen && <BookingModal onClose={() => setIsModalOpen(false)} />}
      {selectedBookingId && <BookingDetailPanel bookingId={selectedBookingId} onClose={() => setSelectedBookingId(null)} />}
    </div>
  );
}

function exportCsv(rows) {
  const escape = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  const csv = [['Mã booking', 'Khách', 'Phòng', 'Nhận', 'Trả', 'Trạng thái', 'Nguồn', 'Tổng tiền', 'Tiền tệ'], ...rows.map(b => [b.id, b.guest, bookingRooms(b).join(', '), b.checkIn, b.checkOut, statusLabels[b.status], b.source, b.total,b.currency])].map(row => row.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'dat-phong.csv'; a.click(); URL.revokeObjectURL(url);
}
