import React, { useState } from 'react';
import { usePms } from '../../data/usePms';
import { bookingRooms, today, addDays, nights, money, overlaps } from '../../data/model';
import BookingDetailPanel from '../../reservations/components/BookingDetailPanel';
import { ChevronLeft, ChevronRight, Search, Filter, Calendar as CalendarIcon, Download, Maximize2 } from 'lucide-react';

export default function ARI() {
  const { rooms, bookings: reservations, available, roomTypes, settings } = usePms();
  const [currentDate, setCurrentDate] = useState(today(settings.timezone));
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const dates = Array.from({ length: 14 }, (_, i) => new Date(addDays(currentDate, i) + 'T00:00:00'));
  const getDayName = date => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
  const isWeekend = date => date.getDay() === 0 || date.getDay() === 6;
  const isToday = date => date.toLocaleDateString('en-CA') === today(settings.timezone);
  const groups = roomTypes.filter(t => !typeFilter || t.id === typeFilter).map(t => ({ ...t, price: money(t.price,settings.currency), rooms: rooms.filter(r => r.active !== false && r.typeId === t.id).map(r => ({ id: 'R' + r.id, name: 'R - ' + r.id })), available: dates.map((_, i) => available(addDays(currentDate, i), addDays(currentDate, i + 1), t.id).length) }));
  const bookings = reservations.filter(b => overlaps(b, currentDate, addDays(currentDate, 14)) && (b.guest + ' ' + b.id).toLowerCase().includes(query.toLowerCase())).flatMap(b => bookingRooms(b).map(number => ({ ...b, room: 'R' + number, colStart: Math.max(0, nights(currentDate, b.checkIn)), colSpan: Math.min(14, nights(currentDate, b.checkOut)) - Math.max(0, nights(currentDate, b.checkIn)), bgColor: b.status === 'IN_HOUSE' ? '#10b981' : '#3b82f6', payment: Number(b.balance) === 0 ? 'paid' : Number(b.paid)>0 ? 'partial' : 'unpaid' })));

  return (
    <div className="pms-original pms-legacy-timeline" style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f4f5f7', fontFamily: 'Inter, Arial, sans-serif' }}>
      
      {/* Header Toolbar */}
      <div style={{ padding: '20px 24px', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0 0 4px 0' }}>Lịch đặt phòng (Tape Chart)</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>Click để xem chi tiết, nhận phòng hoặc trả phòng</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '4px' }}>
            <button aria-label="14 ngày trước" onClick={() => setCurrentDate(addDays(currentDate, -14))} style={{ border: 'none', background: 'none', padding: '6px', cursor: 'pointer', borderRadius: '4px' }}><ChevronLeft size={18} /></button>
            <span style={{ fontWeight: '600', fontSize: '14px', padding: '0 16px', color: '#374151' }}>{new Date(currentDate + 'T00:00:00').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</span>
            <button aria-label="14 ngày sau" onClick={() => setCurrentDate(addDays(currentDate, 14))} style={{ border: 'none', background: 'none', padding: '6px', cursor: 'pointer', borderRadius: '4px' }}><ChevronRight size={18} /></button>
          </div>
          
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#9ca3af' }} />
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm tên khách, mã..." style={{ padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', fontSize: '14px', width: '220px' }} />
          </div>

          <button onClick={() => setShowFilter(!showFilter)} style={{ backgroundColor: '#fff', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500', color: '#374151' }}>
            <Filter size={16} /> Lọc
          </button>
          <button onClick={() => setCurrentDate(today(settings.timezone))} style={{ backgroundColor: '#4f46e5', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={16} /> Hôm nay
          </button>
        </div>
      </div>

      {showFilter && <select aria-label="Lọc loại phòng" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ margin: '12px 24px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '8px' }}><option value="">Tất cả loại phòng</option>{roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}
      {/* Main Gantt Chart Area */}
      <div className="pms-legacy-chart" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', margin: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        
        {/* Timeline Header (Dates) */}
        <div style={{ display: 'flex', minWidth: '1650px', position: 'sticky', top: 0, zIndex: 20, borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
          {/* Top-left empty corner */}
          <div style={{ position: 'sticky', left: 0, zIndex: 21, width: '250px', flexShrink: 0, borderRight: '1px solid #e5e7eb', padding: '16px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280' }}>Loại phòng / Phòng</span>
          </div>
          
          {/* Date Columns */}
          <div style={{ display: 'flex', flex: 1, overflowX: 'hidden' }}>
            {dates.map((d, i) => (
              <div key={i} style={{ 
                flex: '0 0 100px',
                borderRight: '1px solid #e5e7eb', 
                padding: '12px 0', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                backgroundColor: isToday(d) ? '#eff6ff' : (isWeekend(d) ? '#fef2f2' : 'transparent')
              }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: isToday(d) ? '#2563eb' : (isWeekend(d) ? '#dc2626' : '#6b7280'), textTransform: 'uppercase' }}>
                  {getDayName(d)}
                </span>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: isToday(d) ? '#2563eb' : '#111827', marginTop: '4px' }}>
                  {d.getDate()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Body (Scrollable both ways) */}
        <div style={{ display: 'flex', minWidth: '1650px' }}>
          
          {/* Left Fixed Column: Room Types & Rooms */}
          <div style={{ position: 'sticky', left: 0, width: '250px', flexShrink: 0, borderRight: '1px solid #e5e7eb', backgroundColor: '#fff', zIndex: 10 }}>
            {groups.map((rt) => (
              <div key={rt.id}>
                {/* Room Type Row */}
                <div style={{ height: '48px', padding: '0 16px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827' }}>{rt.name}</span>
                  <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>{rt.price}</span>
                </div>
                {/* Rooms */}
                {rt.rooms.map((room) => (
                  <div key={room.id} style={{ height: '56px', padding: '0 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#4b5563' }}>{room.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Right Scrollable Grid: Bookings */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 'fit-content' }}>
            {groups.map((rt) => (
              <div key={rt.id}>
                {/* Room Type Availability Row */}
                <div style={{ display: 'flex', height: '48px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  {rt.available.map((av, i) => (
                    <div key={i} style={{ width: '100px', flexShrink: 0, borderRight: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: av === 0 ? '#ef4444' : '#6b7280' }}>
                        {av === 0 ? 'Hết' : av}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Room Rows */}
                {rt.rooms.map((room) => {
                  // Find bookings for this room
                  const roomBookings = bookings.filter(b => b.room === room.id);
                  
                  return (
                    <div key={room.id} style={{ display: 'flex', height: '56px', borderBottom: '1px solid #f3f4f6', position: 'relative' }}>
                      
                      {/* Empty Grid Cells */}
                      {dates.map((d, i) => (
                        <div key={i} style={{ 
                          width: '100px', flexShrink: 0, borderRight: '1px solid #f3f4f6',
                          backgroundColor: isWeekend(d) ? '#fffaf5' : 'transparent'
                        }}></div>
                      ))}

                      {/* Booking Pills */}
                      {roomBookings.map((booking) => (
                        <button onClick={() => setSelectedBookingId(booking.id)} key={booking.id} style={{ border: 'none', textAlign: 'left',
                          position: 'absolute',
                          top: '8px',
                          left: `${booking.colStart * 100 + 4}px`, // 100px per day, 4px margin
                          width: `${booking.colSpan * 100 - 8}px`,
                          height: '40px',
                          backgroundColor: booking.bgColor,
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 12px',
                          color: '#fff',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          transition: 'transform 0.1s, filter 0.1s',
                          zIndex: 5
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                        title={`${booking.guest} (${booking.status})`}
                        >
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', marginRight: '8px', flexShrink: 0 }}>
                            {booking.guest.charAt(0)}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {booking.guest}
                          </span>
                          
                          {/* Payment Status Icon */}
                          <div style={{
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: booking.payment === 'paid' ? '#10b981' : booking.payment === 'partial' ? 'linear-gradient(to right, #3b82f6 50%, #e5e7eb 50%)' : '#e5e7eb',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid #fff',
                            marginLeft: 'auto', flexShrink: 0
                          }} title={booking.payment === 'paid' ? 'Đã thanh toán đủ' : booking.payment === 'partial' ? 'Đã cọc / Thanh toán 1 phần' : 'Chưa thanh toán'}>
                            <span style={{ fontSize: '11px', color: booking.payment === 'paid' ? '#fff' : (booking.payment === 'partial' ? '#fff' : '#6b7280'), fontWeight: 'bold' }}>$</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          
        </div>
      </div>
      {selectedBookingId && <BookingDetailPanel bookingId={selectedBookingId} onClose={() => setSelectedBookingId(null)} />}
    </div>
  );
}
