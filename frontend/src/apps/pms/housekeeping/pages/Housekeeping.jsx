import { t as tUi, tr as labelUi, useI18n } from '../../../../shared/i18n/useI18n.js';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePms } from '../../data/usePms';
import { timestamp } from '../../data/presentation';
import { bookingRooms, today } from '../../data/model';
import { Search, Download, CheckCircle, Clock, AlertCircle, Calendar, User, History } from 'lucide-react';
import { downloadCsv } from '../../../../shared/lib/csv';
import './Housekeeping.css';

export default function Housekeeping() {
  useI18n();
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
  const allHistory=[...housekeepingLog,...housekeepingWorkLogs.filter(log=>!log.condition&&log.room)].map(log=>({...log,date:new Date(log.createdAt||log.at).toLocaleDateString('en-CA',{timeZone:settings.timezone}),time:timestamp(log.createdAt||log.at, settings.timezone),user:log.actor||log.actorName||log.actorId||'—',room:'R-'+log.room,action:({clean:'Phòng sạch',dirty:'Phòng bẩn',maintenance:'Phòng bảo trì',inspection:'Đang kiểm tra'})[log.condition]||({'housekeeping.task_created':'Tạo việc dọn','housekeeping.task_assigned':'Phân công','housekeeping.task_superseded':'Hủy việc cũ'})[log.action]||'Cập nhật công việc',note:log.note||log.details?.note||''}));
  const historyList=allHistory.filter(log=>(!historyFilter.start||log.date>=historyFilter.start)&&(!historyFilter.end||log.date<=historyFilter.end)&&(!historyFilter.room||log.room===historyFilter.room)&&(!historyFilter.actor||log.user===historyFilter.actor));
  function exportHousekeeping() {
    if (activeTab === 'history') downloadCsv(['Ngày', 'Thời gian', 'Phòng', 'Nhân viên', 'Thao tác', 'Ghi chú'], historyList.map(row => [row.date, row.time, row.room, row.user, row.action, row.note]), 'lich-su-buong-phong.csv');
    else downloadCsv(['Phòng', 'Loại phòng', 'Tình trạng', 'Lưu trú', 'Mã buồng phòng', 'Nhân viên', 'Ghi chú'], roomStatusList.map(row => [row.number, roomTypes.find(type => type.id === row.typeId)?.name || '', ({clean:'Sạch',dirty:'Bẩn',inspection:'Kiểm tra',maintenance:'Bảo trì'})[row.condition], row.booking, row.hkCode, row.staff, row.note]), 'buong-phong.csv');
  }

  // Helpers for UI Badges
  const getConditionBadge = (condition) => {
    if (condition === 'clean') return <span style={{ ...badgeStyle, backgroundColor: '#d1fae5', color: '#059669', border: '1px solid #10b981' }}><CheckCircle size={14} />{' '}{tUi("hk.cleanRoom")}</span>;
    if (condition === 'dirty') return <span style={{ ...badgeStyle, backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #ef4444' }}><AlertCircle size={14} />{' '}{tUi("hk.dirtyRoom")}</span>;
    return <span style={badgeStyle}>{condition==='maintenance'?tUi("hk.maintenanceRoom"):condition==='inspection'?tUi("hk.inspecting"):condition}</span>;
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
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 16px 0' }}>{tUi("hk.management")}</h1>
          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#e5e7eb', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
            <button onClick={() => setActiveTab('status')} style={activeTab === 'status' ? activeTabStyle : inactiveTabStyle}>
              <CheckCircle size={16} /> Trạng thái phòng
            </button>
            <button onClick={() => setActiveTab('history')} style={activeTab === 'history' ? activeTabStyle : inactiveTabStyle}>
              <History size={16} />{' '}{tUi("hk.history")}</button>
          </div>
        </div>
        
        <div>
          <button type="button" onClick={exportHousekeeping} disabled={!access('housekeeping.view', 'HOUSEKEEPING').allowed} style={{ backgroundColor: '#fff', border: '1px solid #d1d5db', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
            <Download size={16} />{' '}{tUi("common.exportCsv")}</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pms-housekeeping-panel" style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        
        {/* Filter Toolbar */}
        <div className="pms-housekeeping-filters" style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: '#f9fafb' }}>
          {activeTab === 'status' ? (
            <>
              <select aria-label={tUi("common.roomType")} value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={inputStyle}><option value="">{tUi("hk.allTypes")}</option>{roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              <select aria-label={tUi("hk.roomCondition")} value={conditionFilter} onChange={e => setConditionFilter(e.target.value)} style={inputStyle}><option value="">{tUi("hk.allConditions")}</option><option value="clean">{tUi("hk.cleanRoom")}</option><option value="dirty">{tUi("hk.dirtyRoom")}</option><option value="inspection">{tUi("hk.inspecting")}</option><option value="maintenance">{tUi("hk.maintenanceAction")}</option></select>
              <select aria-label={tUi("hk.stayStatus")} value={bookingFilter} onChange={e => setBookingFilter(e.target.value)} style={inputStyle}><option value="">{tUi("hk.allStayStatuses")}</option><option value="Trống">{tUi("hk.vacant")}</option><option value="Đang ở">{tUi("hk.occupied")}</option></select>
              <select aria-label={tUi("hk.assignedStaff")} style={inputStyle} value={staffFilter} onChange={e=>setStaffFilter(e.target.value)}><option value="">{tUi("hk.allStaff")}</option>{housekeepingStaff.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select>
              <div style={{ position: 'relative', flex: 1, maxWidth: '250px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#9ca3af' }} />
                <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder={tUi("hk.searchRoom")} style={{ ...inputStyle, paddingLeft: '36px', width: '100%' }} />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#6b7280" />
                <input aria-label={tUi("hk.historyFrom")} type="date" value={historyFilter.start} onChange={e=>setHistoryFilter(f=>({...f,start:e.target.value}))} style={inputStyle} />
                <span>-</span>
                <input aria-label={tUi("hk.historyTo")} type="date" value={historyFilter.end} onChange={e=>setHistoryFilter(f=>({...f,end:e.target.value}))} style={inputStyle} />
              </div>
              <select aria-label={tUi("hk.historyRoom")} style={inputStyle} value={historyFilter.room} onChange={e=>setHistoryFilter(f=>({...f,room:e.target.value}))}><option value="">{tUi("common.allRooms")}</option>{[...new Set(allHistory.map(log=>log.room))].map(room=><option key={room}>{room}</option>)}</select>
              <select aria-label={tUi("hk.historyActor")} style={inputStyle} value={historyFilter.actor} onChange={e=>setHistoryFilter(f=>({...f,actor:e.target.value}))}><option value="">{tUi("common.allStaff")}</option>{[...new Set(allHistory.map(log=>log.user))].map(actor=><option key={actor}>{actor}</option>)}</select>
              <button style={{ backgroundColor: '#4f46e5', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{tUi("common.filter")}</button>
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
                  <th style={thStyle}>{tUi("common.room")}</th>
                  <th style={thStyle}>{tUi("hk.condition")}</th>
                  <th style={thStyle}>{tUi("hk.systemStatus")}</th>
                  <th style={thStyle}>{tUi("hk.hkCode")}</th>
                  <th style={thStyle}>{tUi("hk.assignment")}</th>
                  <th style={thStyle}>{tUi("common.notes")}</th>
                </tr>
              ) : (
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={thStyle}>{tUi("common.time")}</th>
                  <th style={thStyle}>{tUi("hk.operator")}</th>
                  <th style={thStyle}>{tUi("common.room")}</th>
                  <th style={thStyle}>{tUi("hk.actionStatus")}</th>
                  <th style={thStyle}>{tUi("common.notes")}</th>
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
                        <Link className="hk-room-action" to="/id/housekeeping/plan">{tUi("hk.assignAction")}</Link>
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: '#6b7280', fontStyle: room.note ? 'normal' : 'italic' }}>
                      {room.taskId?<Link className="hk-room-task-link" to='/id/housekeeping/plan'>{room.note||tUi("hk.viewTask")}</Link>:room.note||tUi("common.none")}{access('housekeeping.manage').allowed&&!room.taskId&&<button type="button" className="hk-room-action" onClick={()=>runAction('housekeeping.write','HOUSEKEEPING',()=>setCondition(room.number,room.condition==='maintenance'?'dirty':'maintenance'))}>{room.condition==='maintenance'?tUi("hk.endMaintenance"):tUi("hk.maintenanceAction")}</button>}
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
                        <span style={{ color: '#059669', fontWeight: '600' }}>{tUi("hk.markClean")}</span>
                      ) : (
                        <span style={{ color: '#dc2626', fontWeight: '600' }}>{tUi("hk.changeTo")}{' '}{labelUi(hist.action)}</span>
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
