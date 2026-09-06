import React, { useState } from 'react';
import { X, Calendar, User, Phone, CreditCard, Building, CheckCircle2 } from 'lucide-react';
import { mockRoomTypes } from '../mockData/roomsData';

export default function BookingModal({ isOpen, onClose, onAddBooking, defaultRoomNumber = '' }) {
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [roomNumber, setRoomNumber] = useState(defaultRoomNumber || '101');
  const [roomType, setRoomType] = useState('Standard (STD)');
  const [checkIn, setCheckIn] = useState('2026-09-06');
  const [checkOut, setCheckOut] = useState('2026-09-08');
  const [deposit, setDeposit] = useState('500000');
  const [channel, setChannel] = useState('Direct Walk-in');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!guestName) return alert('Vui lòng nhập tên khách hàng');

    onAddBooking({
      roomNumber,
      guestName,
      phone,
      roomType,
      checkIn,
      checkOut,
      deposit: Number(deposit),
      channel
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '10px', 
              background: 'var(--ez-primary-light)', 
              color: 'var(--ez-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Tạo Đặt Phòng / Nhận Phòng Nhanh</h3>
              <p style={{ fontSize: '12px', color: 'var(--ez-text-muted)' }}>Hệ thống HMS system</p>
            </div>
          </div>
          <button className="login-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Tên khách hàng (*)</label>
                <div className="input-wrapper">
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ví dụ: Nguyễn Văn A" 
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <div className="input-wrapper">
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="0987xxxxxx" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Số Phòng chọn</label>
                <select 
                  className="form-input"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                >
                  <option value="101">Phòng 101 (Standard - Tầng 1)</option>
                  <option value="103">Phòng 103 (Superior - Tầng 1)</option>
                  <option value="201">Phòng 201 (Standard - Tầng 2)</option>
                  <option value="204">Phòng 204 (Deluxe - Tầng 2)</option>
                  <option value="303">Phòng 303 (Superior - Tầng 3)</option>
                  <option value="401">Phòng 401 (Suite - Tầng 4)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Kênh đặt phòng</label>
                <select 
                  className="form-input"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  <option value="Direct Walk-in">Khách lẻ Trực tiếp (Walk-in)</option>
                  <option value="Booking.com">Booking.com</option>
                  <option value="Agoda">Agoda</option>
                  <option value="Traveloka">Traveloka</option>
                  <option value="Direct Website">Website HMS Booking Engine</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ngày Check-in</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ngày Check-out</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Tiền cọc trước (VNĐ)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy bỏ</button>
            <button type="submit" className="btn btn-primary">
              <CheckCircle2 size={16} /> Xác nhận Check-in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
