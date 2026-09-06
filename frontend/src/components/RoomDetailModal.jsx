import React from 'react';
import { X, User, Calendar, DollarSign, CheckCircle, AlertTriangle, RefreshCw, Printer, LogOut } from 'lucide-react';

export default function RoomDetailModal({ room, isOpen, onClose, onUpdateRoomStatus, onCheckOut }) {
  if (!isOpen || !room) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Phòng {room.number}</h3>
              <span className={`badge badge-${room.status === 'available' ? 'success' : room.status === 'occupied' ? 'primary' : room.status === 'dirty' ? 'amber' : 'danger'}`}>
                {room.status === 'available' ? 'TRỐNG' : room.status === 'occupied' ? 'ĐANG CÓ KHÁCH' : room.status === 'dirty' ? 'CẦN DỌN' : 'BẢO TRÌ'}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--ez-text-muted)', marginTop: '2px' }}>
              {room.floor} • {room.type} • {room.price.toLocaleString('vi-VN')} VNĐ/đêm
            </p>
          </div>
          <button className="login-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {room.status === 'occupied' && (
            <div className="ez-card" style={{ padding: '16px', marginBottom: '16px', background: 'var(--ez-primary-light)', border: '1px solid rgba(27, 73, 166, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 700, color: 'var(--ez-primary)' }}>
                <User size={18} /> Thông tin Khách lưu trú
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ez-text-main)' }}>
                {room.guest}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px', color: 'var(--ez-text-muted)' }}>
                <div><Calendar size={14} /> Check-in: {room.checkIn}</div>
                <div><Calendar size={14} /> Check-out dự kiến: {room.checkOut}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ez-text-muted)' }}>
              Thao tác Nhanh Trạng thái Phòng
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {room.status === 'dirty' && (
                <button 
                  className="btn btn-secondary"
                  onClick={() => { onUpdateRoomStatus(room.id, 'available', 'clean'); onClose(); }}
                  style={{ color: '#10b981', borderColor: '#10b981' }}
                >
                  <CheckCircle size={16} /> Đã Dọn Sạch (Chuyển Trống)
                </button>
              )}

              {room.status === 'available' && (
                <button 
                  className="btn btn-secondary"
                  onClick={() => { onUpdateRoomStatus(room.id, 'dirty', 'dirty'); onClose(); }}
                  style={{ color: '#f59e0b', borderColor: '#f59e0b' }}
                >
                  <AlertTriangle size={16} /> Đổi Trạng thái Bẩn (Dirty)
                </button>
              )}

              {room.status === 'occupied' && (
                <button 
                  className="btn btn-primary"
                  style={{ background: '#ef4444', borderColor: '#ef4444' }}
                  onClick={() => { onCheckOut(room.id); onClose(); }}
                >
                  <LogOut size={16} /> Thao tác Check-out & Thanh toán
                </button>
              )}

              <button className="btn btn-outline">
                <Printer size={16} /> In Phiếu Phòng / Folio
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
