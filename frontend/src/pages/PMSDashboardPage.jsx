import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  BedDouble, 
  UserCheck, 
  LogOut as LogOutIcon, 
  Percent, 
  ArrowUpRight, 
  Calendar, 
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { mockStats } from '../mockData/statsData';
import { mockRooms } from '../mockData/roomsData';

export default function PMSDashboardPage({ onNavigateTab, onOpenBookingModal }) {
  const occupiedCount = mockRooms.filter(r => r.status === 'occupied').length;
  const availableCount = mockRooms.filter(r => r.status === 'available').length;
  const dirtyCount = mockRooms.filter(r => r.status === 'dirty').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Doanh thu hôm nay */}
        <div className="ez-card" style={{ padding: '20px', borderLeft: '4px solid var(--ez-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ez-text-muted)' }}>Doanh thu hôm nay</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--ez-primary-light)', color: 'var(--ez-primary)', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontWeight: 800 }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ez-text-main)' }}>
            {mockStats.todayRevenue.toLocaleString('vi-VN')} đ
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
            <ArrowUpRight size={14} /> +14.2% so với hôm qua
          </div>
        </div>

        {/* Công suất phòng */}
        <div className="ez-card" style={{ padding: '20px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ez-text-muted)' }}>Công suất Phòng (Occupancy)</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
              <Percent size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ez-text-main)' }}>
            {mockStats.occupancyRate}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ez-text-muted)', marginTop: '6px' }}>
            {occupiedCount} đang có khách / {mockRooms.length} tổng phòng
          </div>
        </div>

        {/* Giá trung bình ADR */}
        <div className="ez-card" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ez-text-muted)' }}>Giá trung bình ADR</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ez-text-main)' }}>
            {mockStats.adr.toLocaleString('vi-VN')} đ
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ez-text-muted)', marginTop: '6px' }}>
            RevPAR: {mockStats.revpar.toLocaleString('vi-VN')} đ
          </div>
        </div>

        {/* Lượt Check-in hôm nay */}
        <div className="ez-card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ez-text-muted)' }}>Lượt Nhận / Trả Phòng</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
              <UserCheck size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ez-text-main)' }}>
            {mockStats.checkInsToday} In / {mockStats.checkOutsToday} Out
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginTop: '6px' }}>
            Tất cả hồ sơ đã hoàn tất
          </div>
        </div>
      </div>

      {/* Middle Grid: Room Quick Overview & Revenue Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Weekly Revenue Breakdown */}
        <div className="ez-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Biểu đồ Doanh thu Tuần này</h3>
              <p style={{ fontSize: '12px', color: 'var(--ez-text-muted)' }}>Thống kê doanh thu phòng & dịch vụ F&B</p>
            </div>
            <span className="badge badge-primary">Tuần 36 / 2026</span>
          </div>

          {/* Simple Visual Bar Chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', paddingTop: '20px', borderBottom: '1px solid var(--ez-border)' }}>
            {mockStats.revenueWeekly.map((item, idx) => {
              const maxVal = 40000000;
              const heightPct = Math.round((item.amount / maxVal) * 100);
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ez-text-muted)' }}>
                    {(item.amount / 1000000).toFixed(1)}M
                  </span>
                  <div style={{ 
                    width: '32px', 
                    height: `${heightPct}%`, 
                    background: idx === 6 ? 'var(--ez-primary)' : 'linear-gradient(180deg, #60a5fa 0%, #1b49a6 100%)', 
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.5s ease'
                  }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ez-text-main)' }}>{item.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Room Status Summary Gauge */}
        <div className="ez-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Trạng thái Khách sạn</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'var(--status-occupied-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--status-occupied)' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-occupied)' }} />
                  Đang có khách (Occupied)
                </div>
                <span style={{ fontWeight: 800 }}>{occupiedCount} phòng</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'var(--status-available-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--status-available)' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-available)' }} />
                  Phòng Trống (Available)
                </div>
                <span style={{ fontWeight: 800 }}>{availableCount} phòng</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'var(--status-dirty-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--status-dirty)' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-dirty)' }} />
                  Phòng Bẩn (Needs Housekeeping)
                </div>
                <span style={{ fontWeight: 800 }}>{dirtyCount} phòng</span>
              </div>
            </div>
          </div>

          <button 
            className="btn btn-primary btn-block" 
            onClick={() => onNavigateTab('matrix')}
            style={{ marginTop: '20px' }}
          >
            <BedDouble size={18} /> Xem Sơ Đồ Phòng Chi Tiết
          </button>
        </div>
      </div>
    </div>
  );
}
