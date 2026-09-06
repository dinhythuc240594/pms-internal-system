import React, { useState } from 'react';
import { 
  BedDouble, 
  Filter, 
  PlusCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Wrench, 
  User,
  Calendar,
  Sparkles
} from 'lucide-react';
import { mockRooms, mockFloors } from '../mockData/roomsData';
import RoomDetailModal from '../components/RoomDetailModal';
import BookingModal from '../components/BookingModal';

export default function RoomMatrixPage({ rooms, onUpdateRoomStatus, onCheckOut, onAddBooking }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const filteredRooms = rooms.filter(room => {
    if (filterStatus === 'all') return true;
    return room.status === filterStatus;
  });

  const getStatusLabel = (status) => {
    switch (status) {
      case 'available': return 'Sạch & Trống';
      case 'occupied': return 'Có Khách';
      case 'dirty': return 'Cần Dọn';
      case 'maintenance': return 'Bảo Trì';
      case 'reserved': return 'Đã Đặt';
      default: return status;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Filters & Actions */}
      <div className="room-matrix-header">
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ez-text-main)' }}>
            Sơ Đồ Phòng Theo Tầng (Real-time Room Matrix)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--ez-text-muted)' }}>
            Quản lý trực tiếp trạng thái 17 phòng tại HMS Hotel Resort
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Status Filter Pills */}
          <div className="status-filter-pills">
            {[
              { id: 'all', label: 'Tất cả (17)' },
              { id: 'available', label: 'Trống (5)', color: 'var(--status-available)' },
              { id: 'occupied', label: 'Có khách (8)', color: 'var(--status-occupied)' },
              { id: 'dirty', label: 'Bẩn (2)', color: 'var(--status-dirty)' },
              { id: 'maintenance', label: 'Bảo trì (1)', color: 'var(--status-maintenance)' }
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setFilterStatus(pill.id)}
                className={`pill-btn ${filterStatus === pill.id ? 'active' : ''}`}
              >
                {pill.color && (
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: pill.color }} />
                )}
                {pill.label}
              </button>
            ))}
          </div>

          <button 
            className="btn btn-primary"
            onClick={() => setShowBookingModal(true)}
          >
            <PlusCircle size={16} /> Đặt Phòng Nhanh
          </button>
        </div>
      </div>

      {/* Grid of Rooms Grouped by Floor */}
      {mockFloors.map((floor) => {
        const roomsOnFloor = filteredRooms.filter(r => r.floor === floor);
        if (roomsOnFloor.length === 0) return null;

        return (
          <div key={floor} style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ez-text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '16px', background: 'var(--ez-primary)', borderRadius: '2px' }} />
              {floor} ({roomsOnFloor.length} phòng)
            </div>

            <div className="room-grid">
              {roomsOnFloor.map((room) => (
                <div
                  key={room.id}
                  className={`room-card status-${room.status}`}
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className="room-card-header">
                    <span className="room-number">{room.number}</span>
                    <span className="room-type-tag">{room.type.split(' ')[0]}</span>
                  </div>

                  <div className="room-card-body">
                    {room.status === 'occupied' && (
                      <div>
                        <div className="room-guest-name">👤 {room.guest}</div>
                        <div style={{ fontSize: '11px', color: 'var(--ez-text-muted)', marginTop: '2px' }}>
                          Out: {room.checkOut}
                        </div>
                      </div>
                    )}

                    {room.status === 'available' && (
                      <div style={{ color: 'var(--status-available)', fontWeight: 600, fontSize: '12px' }}>
                        ✓ Sẵn sàng đón khách
                      </div>
                    )}

                    {room.status === 'dirty' && (
                      <div style={{ color: 'var(--status-dirty)', fontWeight: 600, fontSize: '12px' }}>
                        ⚠ Cần dọn buồng phòng
                      </div>
                    )}

                    {room.status === 'maintenance' && (
                      <div style={{ color: 'var(--status-maintenance)', fontWeight: 600, fontSize: '12px' }}>
                        🛠 Đang sửa chữa
                      </div>
                    )}

                    {room.status === 'reserved' && (
                      <div style={{ color: 'var(--status-reserved)', fontWeight: 600, fontSize: '12px' }}>
                        📅 Đã cọc • {room.guest}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--ez-border)', paddingTop: '6px', fontSize: '11px', color: 'var(--ez-text-muted)' }}>
                    <span>{room.price.toLocaleString('vi-VN')} đ/đêm</span>
                    <span style={{ fontWeight: 700, color: 'var(--ez-primary)' }}>Chi tiết →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Room Detail Modal */}
      <RoomDetailModal 
        room={selectedRoom}
        isOpen={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
        onUpdateRoomStatus={onUpdateRoomStatus}
        onCheckOut={onCheckOut}
      />

      {/* Quick Booking Modal */}
      <BookingModal 
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onAddBooking={onAddBooking}
      />
    </div>
  );
}
