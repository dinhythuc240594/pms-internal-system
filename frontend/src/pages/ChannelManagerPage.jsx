import React from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, ArrowUpRight, Globe, Shield } from 'lucide-react';

export default function ChannelManagerPage() {
  const otaChannels = [
    { name: 'Booking.com', status: 'Active', syncedRooms: 12, lastSync: '2 phút trước', rateType: 'Standard Rate 2026' },
    { name: 'Agoda', status: 'Active', syncedRooms: 12, lastSync: '5 phút trước', rateType: 'Agoda Promo Rate' },
    { name: 'Traveloka', status: 'Active', syncedRooms: 12, lastSync: '10 phút trước', rateType: 'SE Asia Rate' },
    { name: 'Airbnb', status: 'Active', syncedRooms: 8, lastSync: '1 phút trước', rateType: 'Whole House Rate' },
    { name: 'Expedia Group', status: 'Syncing', syncedRooms: 12, lastSync: 'Đang đồng bộ...', rateType: 'Global Member Rate' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="ez-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>ezCms™ Channel Management System</h2>
          <p style={{ fontSize: '13px', color: 'var(--ez-text-muted)', marginTop: '4px' }}>
            Tự động đồng bộ số lượng phòng trống và bảng giá theo thời gian thực lên 5 kênh OTA quốc tế
          </p>
        </div>

        <button className="btn btn-primary">
          <RefreshCw size={16} /> Đồng bộ Trực tiếp Tất cả OTA
        </button>
      </div>

      <div className="app-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {otaChannels.map((ota, idx) => (
          <div key={idx} className="ez-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={20} color="var(--ez-primary)" />
                <span style={{ fontSize: '16px', fontWeight: 800 }}>{ota.name}</span>
              </div>
              <span className={`badge ${ota.status === 'Active' ? 'badge-success' : 'badge-amber'}`}>
                {ota.status}
              </span>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--ez-text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>• Số phòng đang mở bán: <strong>{ota.syncedRooms} phòng</strong></div>
              <div>• Gói giá áp dụng: <strong>{ota.rateType}</strong></div>
              <div>• Đồng bộ gần nhất: <strong>{ota.lastSync}</strong></div>
            </div>

            <button className="btn btn-secondary btn-block" style={{ marginTop: '16px', fontSize: '13px' }}>
              Quản lý Cấu hình Kênh
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
