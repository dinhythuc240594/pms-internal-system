import React, { useEffect, useState } from 'react';
import { usePms } from '../../data/usePms';
import { today, addDays, nights, money as formatMoney } from '../../data/model';
import LegacyOverlay from '../../components/LegacyOverlay';
import { Search, X, Calendar, User, CreditCard, CheckCircle2 } from 'lucide-react';

export default function BookingModal({ onClose }) {
  const { available, createBooking, roomTypes, settings, bookingSources, allowAction, quote, getAvailability } = usePms();
  const [form, setForm] = useState({ guest: '', phone: '', source: bookingSources.find(s => s.active !== false)?.name || '', checkIn: today(settings.timezone), checkOut: addDays(today(settings.timezone), 1), checkInTime: settings.checkInTime, checkOutTime: settings.checkOutTime, room: '', rooms: [], guests: [], typeId: '', currency: settings.currency, voucherCode: '' });
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [quoted, setQuoted] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [inventory, setInventory] = useState([]);
  const selectedKey = form.rooms.join(',');
  useEffect(() => {
    let live = true; setQuoted(null);
    if (!form.rooms.length) { setQuoting(false); return; }
    setQuoting(true);
    quote({ checkIn: form.checkIn, checkOut: form.checkOut, rooms: form.rooms, currency: form.currency, voucherCode: form.voucherCode }).then(result => { if (live) { setQuoted(result); setError(''); } }).catch(err => { if(live) setError(err.message); }).finally(() => { if(live) setQuoting(false); });
    return () => { live = false; };
  }, [selectedKey, form.checkIn, form.checkOut, form.currency, form.voucherCode]);
  function update(key, value) {
    setForm(f => ({ ...f, [key]: value, ...(['checkIn', 'checkOut', 'typeId'].includes(key) ? { room: '', rooms: [] } : {}) }));
    if (['checkIn', 'checkOut', 'typeId'].includes(key)) setSearched(false);
    setError('');
  }
  const choices = available(form.checkIn, form.checkOut, form.typeId).filter(r => !inventory.some(row => row.roomTypeId === r.typeId && (row.stopSell || row.available <= 0)));
  const selected = choices.find(r => form.rooms.includes(r.id));
  const total = quoted?.total || 0;
  const money=value=>formatMoney(value,quoted?.currency||settings.currency);
  function toggleRoom(number) { setQuoted(null); setForm(f => ({ ...f, rooms: f.rooms.includes(number) ? f.rooms.filter(n => n !== number) : [...f.rooms, number] })); }
  async function check() {
    if (!form.checkIn || !form.checkOut || nights(form.checkIn, form.checkOut) <= 0) { setError('Ngày trả phòng phải sau ngày nhận phòng.'); return; }
    setBusy(true);
    try { const result = await getAvailability(form.checkIn, form.checkOut, form.typeId); setInventory(result.availability || []); setSearched(true); setError(''); } catch(err) { setError(err.message); } finally { setBusy(false); }
  }
  async function submit() { if (!allowAction('reservations.write', 'RESERVATION_CREATE') || busy || !quoted) return; setBusy(true); try { await createBooking({ ...form, rooms: form.rooms, guests: [{ name: form.guest, phone: form.phone }, ...form.guests] }); onClose(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return (
    <LegacyOverlay title="Tạo đặt phòng mới" onClose={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Slide-over Panel (Originality Strategy: Instead of Center Modal) */}
      <div style={{ backgroundColor: '#fff', width: '600px', maxWidth: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', animation: 'slideIn 0.3s ease-out' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#212529', margin: '0 0 4px 0' }}>Tạo Đặt phòng mới</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#6c757d' }}>Nhập thông tin để tìm và giữ phòng cho khách.</p>
          </div>
          <button aria-label="Đóng" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', padding: '4px' }}>
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Body (Originality Strategy: Seamless form instead of wizard steps) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Section 1: Search Criteria */}
          <section>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0c7cd5', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
              <Search size={18} /> 1. Điều kiện tìm kiếm
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: '#495057', fontWeight: 'bold' }}>Nguồn đặt phòng <span style={{ color: '#dc3545' }}>*</span></label>
                <select aria-label="Nguồn đặt phòng" value={form.source} onChange={e => update('source', e.target.value)} style={inputStyle}>
                  {bookingSources.filter(s => s.active !== false).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: '#495057', fontWeight: 'bold' }}>Loại phòng mong muốn</label>
                <select aria-label="Loại phòng mong muốn" value={form.typeId} onChange={e => update('typeId', e.target.value)} style={inputStyle}>
                  <option value="">Tất cả loại phòng</option>{roomTypes.filter(t => t.active !== false).map(t => <option value={t.id} key={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: '#495057', fontWeight: 'bold' }}>Ngày & Giờ Nhận (Check-in)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input aria-label="Ngày nhận phòng" type="date" value={form.checkIn} onChange={e => update('checkIn', e.target.value)} style={{ ...inputStyle, flex: 2 }} />
                  <input disabled title="Giờ theo cấu hình khách sạn" aria-label="Giờ nhận phòng" type="time" value={form.checkInTime} onChange={e => update('checkInTime', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: '#495057', fontWeight: 'bold' }}>Ngày & Giờ Trả (Check-out)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input aria-label="Ngày trả phòng" type="date" value={form.checkOut} onChange={e => update('checkOut', e.target.value)} style={{ ...inputStyle, flex: 2 }} />
                  <input disabled title="Giờ theo cấu hình khách sạn" aria-label="Giờ trả phòng" type="time" value={form.checkOutTime} onChange={e => update('checkOutTime', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                </div>
              </div>
            </div>

            <button disabled={busy} onClick={check} style={{ width: '100%', backgroundColor: '#f8f9fa', color: '#0c7cd5', border: '1px solid #0c7cd5', borderRadius: '6px', padding: '10px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
              Kiểm tra phòng trống
            </button>
          </section>

          <hr style={{ border: 'none', borderTop: '1px dashed #dee2e6' }} />

          {/* Section 2: Available Rooms */}
          <section>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0c7cd5', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
              <Calendar size={18} /> 2. Danh sách phòng trống
            </h3>
            
            {!searched && <p style={{ color: '#6c757d', fontSize: '14px' }}>Chọn ngày và bấm Kiểm tra phòng trống.</p>}
            {searched && !choices.length && <p role="status" style={{ color: '#dc3545' }}>Không còn phòng phù hợp. Vui lòng chọn ngày hoặc loại phòng khác.</p>}
            {searched && roomTypes.filter(t => t.active !== false && choices.some(r => r.typeId === t.id)).map(t => (
              <div key={t.id} style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', transition: 'border-color 0.2s' }}>
                <div><h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#212529', margin: '0 0 4px 0' }}>{t.name}</h4><p style={{ margin: 0, fontSize: '13px', color: '#6c757d' }}>Sức chứa: {t.capacity} khách • {nights(form.checkIn, form.checkOut)} đêm</p></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}><div style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc3545' }}>{formatMoney(t.price, settings.currency)}</div><div style={{ fontSize: '12px', color: '#6c757d' }}>Giá niêm yết · Còn {choices.filter(r => r.typeId === t.id).length} phòng</div></div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{choices.filter(r => r.typeId === t.id).map(r => <label key={r.id} style={{ color: '#28a745', border: '1px solid #28a745', borderRadius: 6, padding: 8 }}><input type="checkbox" checked={form.rooms.includes(r.id)} onChange={() => toggleRoom(r.id)} /> Phòng {r.id}</label>)}</div>
                </div>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}><label style={{ fontSize: 13 }}>Tiền thanh toán<select aria-label="Tiền thanh toán" style={{ ...inputStyle, width: '100%', marginTop: 6 }} value={form.currency} onChange={event => update('currency', event.target.value)}>{['VND', 'USD'].map(code => <option key={code}>{code}</option>)}</select></label><label style={{ fontSize: 13 }}>Mã voucher<input aria-label="Mã voucher" style={{ ...inputStyle, width: '100%', marginTop: 6, boxSizing: 'border-box' }} maxLength="40" value={form.voucherCode} onChange={event => update('voucherCode', event.target.value.toUpperCase())} placeholder="Không bắt buộc" /></label></div>
            {quoting && <p role="status">Đang lấy báo giá từng đêm…</p>}
            {quoted && <div>{quoted.nightlyRates.map((row, i) => <p key={i} style={{ fontSize: 13, color: '#495057' }}>Phòng {row.room} · {row.date} · {money(row.price)}</p>)}</div>}
          </section>

          <hr style={{ border: 'none', borderTop: '1px dashed #dee2e6' }} />

          {/* Section 3: Guest Info */}
          <section style={{ opacity: selected ? 1 : 0.5 }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#6c757d', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
              <User size={18} /> 3. Thông tin Khách hàng (Vui lòng chọn phòng trước)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <input aria-label="Họ và tên khách" type="text" placeholder="Họ và tên khách" style={inputStyle} disabled={!selected} value={form.guest} onChange={e => update('guest', e.target.value)} />
              <input aria-label="Số điện thoại" type="tel" placeholder="Số điện thoại" style={inputStyle} disabled={!selected} value={form.phone} onChange={e => update('phone', e.target.value)} />
            </div>
            {form.guests.map((guest, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginTop: 12 }}><input aria-label={'Khách bổ sung ' + (index + 1)} placeholder="Tên khách bổ sung" style={inputStyle} value={guest.name} onChange={e => setForm(f => ({ ...f, guests: f.guests.map((g, i) => i === index ? { ...g, name: e.target.value } : g) }))} /><input aria-label={'Điện thoại khách ' + (index + 1)} style={inputStyle} placeholder="Điện thoại" value={guest.phone} onChange={e => setForm(f => ({ ...f, guests: f.guests.map((g, i) => i === index ? { ...g, phone: e.target.value } : g) }))} /><button onClick={() => setForm(f => ({ ...f, guests: f.guests.filter((_, i) => i !== index) }))}>Xóa</button></div>)}
            <button disabled={!selected} style={{ ...inputStyle, marginTop: 12 }} onClick={() => setForm(f => ({ ...f, guests: [...f.guests, { name: '', phone: '' }] }))}>+ Thêm khách lưu trú</button>
          </section>

        </div>

        {error && <p role="alert" style={{ padding: '12px 24px', color: '#dc3545' }}>{error}</p>}
        {/* Footer (Fixed at bottom) */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #dee2e6', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', color: '#495057' }}>
            Tổng cộng: <strong style={{ fontSize: '18px', color: '#212529' }}>{money(total)}</strong>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onClose} style={{ backgroundColor: '#fff', color: '#495057', border: '1px solid #dee2e6', borderRadius: '6px', padding: '10px 20px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
              Hủy
            </button>
            <button disabled={busy || quoting || !quoted || !selected || !searched} onClick={submit} style={{ backgroundColor: '#0c7cd5', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} /> Tạo Đặt phòng
            </button>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}} />
    </LegacyOverlay>
  );
}

const inputStyle = {
  padding: '10px 12px',
  border: '1px solid #ced4da',
  borderRadius: '6px',
  fontSize: '14px',
  outline: 'none',
  backgroundColor: '#fff',
  color: '#212529'
};
