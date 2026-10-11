import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePms } from '../../data/usePms';
import { timestamp } from '../../data/presentation';
import { bookingRooms, today } from '../../data/model';
import { Search, Download, CheckCircle, Clock, AlertCircle, Calendar, User, History } from 'lucide-react';

export default function Housekeeping() {
  const [activeTab, setActiveTab] = useState('status'); // 'status' or 'history'

  const { rooms, bookings, cleanRoom, dirtyRoom, housekeepingLog, housekeepingWorkLogs, housekeepingTasks, housekeepingStaff, setCondition, roomTypes, settings, access, runAction } = usePms();
  const [query, setQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [staffFilter,setStaffFilter]=useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [historyFilter,setHistoryFilter]=useState({start:today(settings.timezone),end:today(settings.timezone),room:'',actor:''});
  const roomStatusList = rooms.filter(r => r.active !== false).map(r => {
    const task=housekeepingTasks.find(task=>String(task.room)===String(r.id)&&!['completed','cancelled'].includes(task.status));
    const worker=housekeepingStaff.find(worker=>worker.id===task?.staffId);
    const booking = bookings.find(b => bookingRooms(b).includes(String(r.id)) && b.status === 'IN_HOUSE');
    return { id: 'R-' + r.id, number: r.id, typeId: r.typeId, condition: r.condition, booking: booking ? 'Đang ở' : 'Trống', hkCode: booking ? 'OCC' : r.condition === 'maintenance' ? 'OOO' : r.condition === 'inspection' ? 'VI' : r.condition === 'dirty' ? 'VD' : 'VC', hkDesc: booking ? 'Khách đang ở (' + booking.guest + ')' : r.condition === 'maintenance' ? 'Phòng bảo trì' : r.condition === 'inspection' ? 'Phòng chờ kiểm tra' : r.condition === 'dirty' ? 'Phòng trống cần dọn' : 'Phòng trống sạch', staff: worker?.name||'', staffId: task?.staffId, taskId: task?.id, note: task?.note||'' };
  }).filter(r => r.id.includes(query) && (!conditionFilter || r.condition === conditionFilter) && (!bookingFilter || r.booking === bookingFilter) && (!typeFilter || r.typeId === typeFilter)&&(!staffFilter||r.staffId===staffFilter));
  const allHistory=[...housekeepingLog,...housekeepingWorkLogs.filter(log=>!log.condition&&log.room)].map(log=>({...log,date:new Date(log.createdAt||log.at).toLocaleDateString('en-CA',{timeZone:settings.timezone}),time:timestamp(log.createdAt||log.at),user:log.actor||log.actorName||log.actorId||'—',room:'R-'+log.room,action:({clean:'Phòng sạch',dirty:'Phòng bẩn',maintenance:'Phòng bảo trì',inspection:'Đang kiểm tra'})[log.condition]||({'housekeeping.task_created':'Tạo việc dọn','housekeeping.task_assigned':'Phân công','housekeeping.task_superseded':'Hủy việc cũ'})[log.action]||'Cập nhật công việc',note:log.note||log.details?.note||''}));
  const historyList=allHistory.filter(log=>(!historyFilter.start||log.date>=historyFilter.start)&&(!historyFilter.end||log.date<=historyFilter.end)&&(!historyFilter.room||log.room===historyFilter.room)&&(!historyFilter.actor||log.user===historyFilter.actor));

  // Helpers for UI Badges
  const getConditionBadge = (condition) => {
    if (condition === 'clean') return <span style={{ ...badgeStyle, backgroundColor: '#d1fae5', color: '#059669', border: '1px solid #10b981' }}><CheckCircle size={14} /> Phòng sạch</span>;
    if (condition === 'dirty') return <span style={{ ...badgeStyle, backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #ef4444' }}><AlertCircle size={14} /> Phòng bẩn</span>;
    return <span style={badgeStyle}>{condition==='maintenance'?'Phòng bảo trì':condition==='inspection'?'Đang kiểm tra':condition}</span>;
  };

  const getHkCodeBadge = (code) => {
    switch (code) {
      case 'VC': return <span style={{ ...hkBadgeStyle, backgroundColor: '#10b981' }}>VC</span>; // Vacant Clean
      case 'VD': return <span style={{ ...hkBadgeStyle, backgroundColor: '#ef4444' }}>VD</span>; // Vacant Dirty
      case 'OCC': return <span style={{ ...hkBadgeStyle, backgroundColor: '#3b82f6' }}>OCC</span>; // Occupied Clean
      default: return <span style={{ ...hkBadgeStyle, backgroundColor: '#6b7280' }}>{code}</span>;
    }
  };

  return (
    <div className="pms-original pms-housekeeping" style={{ padding: '24px', backgroundColor: '#f4f5f7', minHeight: '100%', fontFamily: 'Inter, Arial, sans-serif' }}>
      
      {/* Header & Local Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 16px 0' }}>Quản lý Buồng phòng</h1>
          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#e5e7eb', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
            <button onClick={() => setActiveTab('status')} style={activeTab === 'status' ? activeTabStyle : inactiveTabStyle}>
              <CheckCircle size={16} /> Trạng thái phòng
            </button>
            <button onClick={() => setActiveTab('history')} style={activeTab === 'history' ? activeTabStyle : inactiveTabStyle}>
              <History size={16} /> Lịch sử dọn phòng
            </button>
          </div>
        </div>
        
        <div>
          <button disabled title="Chức năng xuất Excel chưa triển khai" style={{ backgroundColor: '#fff', border: '1px solid #d1d5db', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
            <Download size={16} /> Xuất Excel
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pms-housekeeping-panel" style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        
        {/* Filter Toolbar */}
        <div className="pms-housekeeping-filters" style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: '#f9fafb' }}>
          {activeTab === 'status' ? (
            <>
              <select aria-label="Loại phòng" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={inputStyle}><option value="">Tất cả Loại phòng</option>{roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              <select aria-label="Tình trạng phòng" value={conditionFilter} onChange={e => setConditionFilter(e.target.value)} style={inputStyle}><option value="">Tình trạng: Tất cả</option><option value="clean">Phòng sạch</option><option value="dirty">Phòng bẩn</option><option value="inspection">Đang kiểm tra</option><option value="maintenance">Bảo trì / hỏng</option></select>
              <select aria-label="Trạng thái lưu trú" value={bookingFilter} onChange={e => setBookingFilter(e.target.value)} style={inputStyle}><option value="">TT Đặt phòng: Tất cả</option><option>Trống</option><option>Đang ở</option></select>
              <select aria-label="Nhân viên được giao" style={inputStyle} value={staffFilter} onChange={e=>setStaffFilter(e.target.value)}><option value="">Nhân viên: Tất cả</option>{housekeepingStaff.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select>
              <div style={{ position: 'relative', flex: 1, maxWidth: '250px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#9ca3af' }} />
                <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm theo số phòng..." style={{ ...inputStyle, paddingLeft: '36px', width: '100%' }} />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#6b7280" />
                <input aria-label="Lịch sử từ ngày" type="date" value={historyFilter.start} onChange={e=>setHistoryFilter(f=>({...f,start:e.target.value}))} style={inputStyle} />
                <span>-</span>
                <input aria-label="Lịch sử đến ngày" type="date" value={historyFilter.end} onChange={e=>setHistoryFilter(f=>({...f,end:e.target.value}))} style={inputStyle} />
              </div>
              <select aria-label="Phòng trong lịch sử" style={inputStyle} value={historyFilter.room} onChange={e=>setHistoryFilter(f=>({...f,room:e.target.value}))}><option value="">Tất cả phòng</option>{[...new Set(allHistory.map(log=>log.room))].map(room=><option key={room}>{room}</option>)}</select>
              <select aria-label="Người thao tác lịch sử" style={inputStyle} value={historyFilter.actor} onChange={e=>setHistoryFilter(f=>({...f,actor:e.target.value}))}><option value="">Tất cả nhân viên</option>{[...new Set(allHistory.map(log=>log.user))].map(actor=><option key={actor}>{actor}</option>)}</select>
              <button style={{ backgroundColor: '#4f46e5', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Lọc</button>
            </>
          )}
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              {activeTab === 'status' ? (
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}><input type="checkbox" /></th>
                  <th style={thStyle}>Phòng</th>
                  <th style={thStyle}>Tình trạng</th>
                  <th style={thStyle}>Trạng thái hệ thống (PMS)</th>
                  <th style={thStyle}>Mã dọn phòng (HK)</th>
                  <th style={thStyle}>Phân công</th>
                  <th style={thStyle}>Ghi chú</th>
                </tr>
              ) : (
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={thStyle}>Thời gian</th>
                  <th style={thStyle}>Nhân viên thao tác</th>
                  <th style={thStyle}>Phòng</th>
                  <th style={thStyle}>Hành động (Trạng thái)</th>
                  <th style={thStyle}>Ghi chú</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activeTab === 'status' ? (
                roomStatusList.map((room) => (
                  <tr key={room.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}>
                    <td style={{ ...tdStyle, textAlign: 'center' }}><input type="checkbox" /></td>
                    <td style={{ ...tdStyle, fontWeight: 'bold', color: '#111827', fontSize: '15px' }}>{room.id}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getConditionBadge(room.condition)}
                        {/* Quick toggle button */}
                        <button disabled={Boolean(room.taskId)||room.condition==='inspection'||room.condition==='maintenance'||!access('housekeeping.manage').allowed} aria-label={'Đổi trạng thái ' + room.id} onClick={() => runAction('housekeeping.write', 'HOUSEKEEPING', () => room.condition === 'dirty' ? cleanRoom(room.number) : dirtyRoom(room.number))} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }} title="Đổi trạng thái nhanh">
                           <Clock size={16} />
                        </button>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: '#4b5563', fontWeight: '500' }}>{room.booking}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {getHkCodeBadge(room.hkCode)}
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>{room.hkDesc}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {room.staff ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '12px', fontSize: '13px', width: 'fit-content' }}>
                          <User size={14} /> {room.staff}
                        </div>
                      ) : (
                        <Link to="/id/housekeeping/plan" style={{ background: 'none', border: '1px dashed #d1d5db', color: '#6b7280', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', cursor: 'pointer' }}>+ Giao việc</Link>
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: '#6b7280', fontStyle: room.note ? 'normal' : 'italic' }}>
                      {room.taskId?<Link to='/id/housekeeping/plan'>{room.note||'Xem công việc'}</Link>:room.note||'Không có'}{access('housekeeping.manage').allowed&&!room.taskId&&<button style={{marginLeft:8}} onClick={()=>runAction('housekeeping.write','HOUSEKEEPING',()=>setCondition(room.number,room.condition==='maintenance'?'dirty':'maintenance'))}>{room.condition==='maintenance'?'Kết thúc bảo trì':'Bảo trì / hỏng'}</button>}
                    </td>
                  </tr>
                ))
              ) : (
                historyList.map((hist) => (
                  <tr key={hist.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ ...tdStyle, fontWeight: '500', color: '#374151' }}>{hist.time}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', backgroundColor: '#e5e7eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={14} color="#4b5563" />
                        </div>
                        <span style={{ fontWeight: hist.user === 'SYSTEM ADMIN' ? 'bold' : 'normal' }}>{hist.user}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 'bold' }}>{hist.room}</td>
                    <td style={tdStyle}>
                      {hist.action === 'Phòng sạch' ? (
                        <span style={{ color: '#059669', fontWeight: '600' }}>Đổi thành Phòng sạch</span>
                      ) : (
                        <span style={{ color: '#dc2626', fontWeight: '600' }}>Đổi thành {hist.action}</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: '#6b7280' }}>{hist.note}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

// Styles
const activeTabStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: '#fff',
  color: '#111827',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '6px',
  fontWeight: 'bold',
  fontSize: '14px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  cursor: 'pointer'
};

const inactiveTabStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: 'transparent',
  color: '#6b7280',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '6px',
  fontWeight: '500',
  fontSize: '14px',
  cursor: 'pointer'
};

const thStyle = {
  padding: '16px',
  fontSize: '13px',
  fontWeight: '600',
  color: '#4b5563',
  textTransform: 'uppercase'
};

const tdStyle = {
  padding: '16px',
  fontSize: '14px',
  color: '#374151'
};

const inputStyle = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  backgroundColor: '#fff',
  fontSize: '14px',
  outline: 'none',
};

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  borderRadius: '12px',
  fontSize: '13px',
  fontWeight: '600'
};

const hkBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '24px',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '12px',
  fontWeight: 'bold',
  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
};
