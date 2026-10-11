import React, { useEffect, useState } from 'react';
import { usePms } from '../../data/usePms';
import { nights, statusLabels, money as formatMoney, bookingRooms } from '../../data/model';
import BookingTabs from './BookingTabs';
import LegacyOverlay from '../../components/LegacyOverlay';
import { AccessMessage } from '../../../../shared/components/AccessControl';
import { X, Printer, Save, User, Calendar, CreditCard, Clock, MapPin, Phone, Mail, FileText, ChevronDown } from 'lucide-react';

export default function BookingDetailPanel({ bookingId, onClose }) {
  const [activeTab, setActiveTab] = useState('details');
  const { bookings, rooms, changeStatus, updateBooking, roomTypes, access, bookingSources, settings } = usePms();
  const booking = bookings.find(b => b.id === bookingId);
  const [draft, setDraft] = useState(() => ({ ...booking, email:booking?.guests?.[0]?.email||'',identity:booking?.guests?.[0]?.identityNumber||'',nationality:booking?.guests?.[0]?.nationality||'' }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  useEffect(() => {
    setDraft({ ...booking, email:booking?.guests?.[0]?.email||'',identity:booking?.guests?.[0]?.identityNumber||'',nationality:booking?.guests?.[0]?.nationality||'' });
  }, [booking]);
  if (!booking) return null;
  const money=value=>formatMoney(value,booking.currency);
  const visibility = access('reservations.view', 'RESERVATION_VIEW');
  if (!visibility.allowed) return <LegacyOverlay title="Đặt phòng" onClose={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: '#0f172a99', display: 'grid', placeItems: 'center', padding: 20 }}><div className="pms-access-dialog"><AccessMessage result={visibility} /><button onClick={onClose}>Đóng</button></div></LegacyOverlay>;
  const roomType = roomTypes.find(t => t.id === rooms.find(r => r.id === booking.room)?.typeId);
  const update = (key, value) => { setDraft(d => ({ ...d, [key]: value })); setNotice(''); };
  async function act(status) { if (busy) return; setBusy(true); try { await changeStatus(booking.id, status); setError(''); setConfirmCancel(false); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  async function save() { if (busy) return; setBusy(true); try { const primary={...booking.guests?.[0],name:draft.guest,phone:draft.phone,email:draft.email,identityNumber:draft.identity,nationality:draft.nationality}; const input={rooms:bookingRooms(draft),checkIn:draft.checkIn,checkOut:draft.checkOut,source:draft.source,guests:[primary,...(booking.guests||[]).slice(1)]}; await updateBooking(booking.id, input); setNotice('Đã lưu thay đổi.'); setError(''); } catch (err) { setError(err.message); } finally { setBusy(false); } }


  return (
    <LegacyOverlay title={'Đặt phòng ' + booking.id} onClose={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', justifyContent: 'flex-end', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Slide-over Panel - Super Wide for Data Heavy View */}
      <div style={{ backgroundColor: '#f4f5f7', width: '1100px', maxWidth: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        
        {/* Header - Profile Style (Different from Competitor) */}
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #dee2e6', padding: '24px 32px 0 32px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: '#e0e7ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca', fontSize: '24px', fontWeight: 'bold' }}>
                {booking.guest.charAt(0)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>{booking.guest}</h2>
                  <span style={{ backgroundColor: '#d1fae5', color: '#059669', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }}>{statusLabels[booking.status]}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#6b7280', fontSize: '14px' }}>
                  <span style={{ fontWeight: '500', color: '#374151' }}>Mã: {booking.id} (Phòng {bookingRooms(booking).join(', ')})</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {booking.checkIn} ➔ {booking.checkOut}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {nights(booking.checkIn, booking.checkOut)} đêm</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right', marginRight: '16px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Công nợ / Số dư</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669' }}>{money(booking.balance)}</div>
              </div>
              <button disabled title="In chứng từ sẽ được triển khai sau" style={{ backgroundColor: '#fff', border: '1px solid #d1d5db', color: '#374151', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Printer size={18} />
              </button>
              <button disabled={busy || !['CONFIRMED','IN_HOUSE'].includes(booking.status) || !access('reservations.write', 'RESERVATION_VIEW').allowed} onClick={save} style={{ backgroundColor: '#4f46e5', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                <Save size={18} /> Lưu thay đổi
              </button>
              <button aria-label="Đóng" onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '8px', marginLeft: '8px' }}>
                <X size={24} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {booking.status === 'CONFIRMED' && access('reservations.write', 'RESERVATION_VIEW').allowed && <><button disabled={busy} onClick={() => act('IN_HOUSE')} style={lifecycleStyle('#10b981')}>Nhận phòng (Check-in)</button><button onClick={() => setConfirmCancel(true)} style={lifecycleStyle('#ef4444')}>Hủy đặt phòng</button></>}
            {booking.status === 'IN_HOUSE' && access('reservations.write', 'RESERVATION_VIEW').allowed && <button disabled={busy || Number(booking.balance) !== 0} title={Number(booking.balance) !== 0 ? 'Cần thanh toán hết số dư trước khi trả phòng' : ''} onClick={() => act('CHECKED_OUT')} style={lifecycleStyle('#ef4444')}>Trả phòng (Check-out)</button>}
          </div>
          {confirmCancel && <div style={{ marginBottom: '16px', color: '#4b5563' }}><p>Xác nhận hủy booking? Phòng sẽ được mở bán lại.</p><button onClick={() => setConfirmCancel(false)} style={lifecycleStyle('#64748b')}>Giữ booking</button> <button onClick={() => act('CANCELLED')} style={lifecycleStyle('#ef4444')}>Xác nhận hủy</button></div>}
          {error && <p role="alert" style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</p>}
          {notice && <p role="status" style={{ color: '#059669', marginBottom: '16px' }}>{notice}</p>}
          {/* Modern Tabs */}
          <div style={{ display: 'flex', gap: '32px' }}>
            {['Chi tiết', 'Khách hàng', 'Dịch vụ', 'Giá phòng', 'Thanh toán', 'Ghi chú', 'Lịch sử'].map((tab, idx) => {
              const tabId = tab.toLowerCase().replace(' ', '');
              const isActive = activeTab === (idx === 0 ? 'details' : tabId);
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(idx === 0 ? 'details' : tabId)}
                  style={{
                    background: 'none', border: 'none', padding: '0 0 12px 0', fontSize: '14px', fontWeight: isActive ? 'bold' : '500',
                    color: isActive ? '#4f46e5' : '#6b7280', cursor: 'pointer',
                    borderBottom: isActive ? '2px solid #4f46e5' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body Content - Scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          
          {activeTab === 'details' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
              
              {/* Left Column: Guest Info Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                <Card title="Thông tin khách hàng" icon={<User size={18} />}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <Field bookingStatus={booking.status} busy={busy} label="Họ tên khách (*)" value={draft.guest || ''} onChange={value => update('guest', value)} />
                    <Field bookingStatus={booking.status} busy={busy} label="CCCD/CMND/Hộ chiếu" placeholder="Nhập giấy tờ tùy thân..." value={draft.identity || ''} onChange={value => update('identity', value)} />
                    <Field bookingStatus={booking.status} busy={busy} label="Điện thoại" value={draft.phone || ''} onChange={value => update('phone', value)} icon={<Phone size={14} color="#9ca3af" />} />
                    <Field bookingStatus={booking.status} busy={busy} label="Email" value={draft.email || ''} onChange={value => update('email', value)} icon={<Mail size={14} color="#9ca3af" />} />
                    <Field bookingStatus={booking.status} busy={busy} label="Quốc tịch" value={draft.nationality || ''} onChange={value => update('nationality', value)} type="select" options={[...new Set([draft.nationality||'', 'Malaysia', 'Vietnam', 'USA'])]} />
                  </div>
                </Card>
              </div>

              {/* Right Column: Booking Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Options Row */}
                <Card>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                      <input type="checkbox" disabled title="Chưa triển khai" style={checkboxStyle} /> Đặt phòng theo giờ
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                      <input type="checkbox" disabled title="Chưa triển khai" style={checkboxStyle} /> Miễn phí tiền phòng (FOC)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                      <input type="checkbox" disabled title="Chưa triển khai" style={checkboxStyle} /> Bữa sáng
                    </label>
                  </div>
                </Card>

                {/* Main Booking Info */}
                <Card title="Chi tiết lưu trú" icon={<Calendar size={18} />}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <Field bookingStatus={booking.status} busy={busy} label="Trạng thái (*)" value={statusLabels[booking.status]} type="select" options={[statusLabels[booking.status]]} disabled />
                    <Field bookingStatus={booking.status} busy={busy} label="Ngày đặt" defaultValue={booking.createdAt?.slice(0, 10) || booking.checkIn} type="date" disabled />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: '20px', alignItems: 'end', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Field bookingStatus={booking.status} busy={busy} label="Ngày nhận (*)" value={draft.checkIn} onChange={value => update('checkIn', value)} type="date" disabled={booking.status !== 'CONFIRMED'} flex={2} />
                      <Field bookingStatus={booking.status} busy={busy} label="Giờ" value={settings.checkInTime || '14:00'} disabled type="time" flex={1} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <label style={labelStyle}>Số đêm</label>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginTop: '4px' }}>{nights(draft.checkIn, draft.checkOut) || 0}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Field bookingStatus={booking.status} busy={busy} label="Ngày trả (*)" value={draft.checkOut} onChange={value => update('checkOut', value)} type="date" disabled={booking.status !== 'CONFIRMED'} flex={2} />
                      <Field bookingStatus={booking.status} busy={busy} label="Giờ" value={settings.checkOutTime || '12:00'} disabled type="time" flex={1} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <Field bookingStatus={booking.status} busy={busy} label="Người lớn" value="Chưa triển khai" disabled type="text" />
                    <Field bookingStatus={booking.status} busy={busy} label="Trẻ em" value="Chưa triển khai" disabled type="number" />
                    <Field bookingStatus={booking.status} busy={busy} label="Em bé" value="Chưa triển khai" disabled type="number" />
                  </div>
                </Card>

                {/* Source & Room Info */}
                <Card title="Nguồn & Giá phòng" icon={<CreditCard size={18} />}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <Field bookingStatus={booking.status} busy={busy} label="Nguồn đặt (*)" value={draft.source} onChange={value => update('source', value)} type="select" options={[...new Set([draft.source, ...bookingSources.filter(s => s.active !== false).map(s => s.name)])]} />
                    <Field bookingStatus={booking.status} busy={busy} label="Kênh / Mã kênh" value={booking.source} disabled />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <Field bookingStatus={booking.status} busy={busy} label="Loại phòng (*)" value={roomType?.name} type="select" options={[roomType?.name]} disabled />
                    <div><label style={labelStyle}>Phòng ở</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{rooms.filter(r => r.active !== false || bookingRooms(booking).includes(r.id)).map(r => <label key={r.id}><input type="checkbox" disabled={booking.status !== 'CONFIRMED' || !access('reservations.write').allowed} checked={bookingRooms(draft).includes(r.id)} onChange={e => update('rooms', e.target.checked ? [...bookingRooms(draft), r.id] : bookingRooms(draft).filter(id => id !== r.id))} /> {r.id}</label>)}</div></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <Field bookingStatus={booking.status} busy={busy} label="Phòng RTC (*)" value={roomType?.name} type="select" options={[roomType?.name]} disabled />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={labelStyle}>Tiền phòng / ngày</label>
                      <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                        <input type="text" value={((booking.nightlyRates||[]).reduce((sum,row)=>sum+Number(row.price),0) / nights(booking.checkIn, booking.checkOut)).toLocaleString('vi-VN',{maximumFractionDigits:4})} readOnly style={{ ...inputBaseStyle, flex: 1, borderRight: 'none', borderRadius: '6px 0 0 6px', textAlign: 'right', fontWeight: 'bold', color: '#dc2626' }} />
                        <span style={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '0 6px 6px 0', color: '#4b5563', fontSize: '14px', fontWeight: '500' }}>{booking.currency==='VND'?'₫':booking.currency}</span>
                      </div>
                    </div>
                  </div>
                </Card>

              </div>
            </div>
          )}

          {activeTab !== 'details' && <BookingTabs key={activeTab + booking.id} tab={activeTab} booking={booking} />}

        </div>
      </div>
    </LegacyOverlay>
  );
}

// UI Components
const Card = ({ title, icon, children }) => (
  <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
    {title && (
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f9fafb' }}>
        {icon && <span style={{ color: '#6b7280' }}>{icon}</span>}
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#111827' }}>{title}</h3>
      </div>
    )}
    <div style={{ padding: '20px' }}>
      {children}
    </div>
  </div>
);

const Field = ({ label, defaultValue, value, onChange, placeholder, type = 'text', options, icon, flex, disabled, bookingStatus, busy }) => {
  const { access } = usePms();
  disabled = disabled || busy || (bookingStatus && !['CONFIRMED','IN_HOUSE'].includes(bookingStatus)) || !access('reservations.write', 'RESERVATION_VIEW').allowed;
  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: flex }}>
    <label style={labelStyle}>{label}</label>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {icon && <div style={{ position: 'absolute', left: '12px' }}>{icon}</div>}
      {type === 'select' ? (
        <select aria-label={label} value={value} defaultValue={value === undefined ? defaultValue : undefined} onChange={e => onChange?.(e.target.value)} style={{ ...inputBaseStyle, paddingLeft: icon ? '36px' : '12px', appearance: 'none' }} disabled={disabled}>
          {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input 
          type={type} 
          aria-label={label}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          defaultValue={value === undefined ? defaultValue : undefined}
          placeholder={placeholder} 
          disabled={disabled}
          style={{ ...inputBaseStyle, paddingLeft: icon ? '36px' : '12px', backgroundColor: disabled ? '#f3f4f6' : '#fff' }} 
        />
      )}
      {type === 'select' && <ChevronDown size={14} style={{ position: 'absolute', right: '12px', color: '#9ca3af', pointerEvents: 'none' }} />}
    </div>
  </div>
);
};

const labelStyle = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#4b5563'
};

const inputBaseStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  color: '#111827',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box'
};

const checkboxStyle = {
  width: '16px',
  height: '16px',
  accentColor: '#4f46e5',
  cursor: 'pointer'
};

const lifecycleStyle = color => ({ background: '#fff', color, border: '1px solid ' + color, borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', fontWeight: '600' });
