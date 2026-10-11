import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  ShieldAlert, 
  Search, 
  Download, 
  Eye, 
  CheckCircle2, 
  X, 
  Terminal,
  Copy,
  Check,
  Clock,
  User,
  Building2,
  Globe,
  FileCode,
  Shield,
  Activity
} from 'lucide-react';

import { usePms } from '../../../pms/data/usePms';
import { getThemeTokens } from '../../theme';

export default function AdminLogs() {
  const { searchQuery: globalSearch, isDarkMode, theme } = useOutletContext() || {};
  const t = theme || getThemeTokens(isDarkMode);

  const { workspace } = usePms();
  const labels={'tenant.created':'Tạo khách sạn','tenant.updated':'Cập nhật khách sạn','membership.created':'Gán tài khoản khách sạn','membership.updated':'Cập nhật vai trò / trạng thái','guest.created':'Tạo hồ sơ khách','guest.updated':'Sửa hồ sơ khách','reservation.created':'Tạo đặt phòng','reservation.updated':'Sửa đặt phòng','reservation.status':'Đổi trạng thái đặt phòng','reservation.payment':'Thu tiền','reservation.refund':'Hoàn tiền','reservation.charge':'Thêm phụ thu','reservation.note':'Thêm ghi chú'};
  const logs=workspace.auditLogs.map(l=>({...l,action:l.event||l.action||'Cập nhật',timestamp:new Date(l.createdAt||l.at).toLocaleString('vi-VN').replace(', ',' '),operator:l.userId||l.user||'—',operatorRole:l.role||'',tenantName:workspace.tenants.find(t=>t.id===l.tenantId)?.name||'Toàn hệ thống',target:l.entityId||'—',details:labels[l.event]||l.event||'Cập nhật',ipAddress:'—',severity:'Low',status:'Success',metadata:l}));
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);
  const [logViewMode, setLogViewMode] = useState('overview'); // 'overview' | 'json'
  const [copiedJson, setCopiedJson] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const effectiveSearch = (search || globalSearch || '').toLowerCase();

  const filteredLogs = logs.filter(l => {
    const matchesSearch = 
      l.id.toLowerCase().includes(effectiveSearch) ||
      l.operator.toLowerCase().includes(effectiveSearch) ||
      l.action.toLowerCase().includes(effectiveSearch) ||
      l.tenantName.toLowerCase().includes(effectiveSearch) ||
      l.ipAddress.toLowerCase().includes(effectiveSearch) ||
      l.details.toLowerCase().includes(effectiveSearch);

    const matchesSeverity = severityFilter === 'ALL' || l.severity === severityFilter;
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const handleExportCSV = () => {
    showToast('Xuất CSV chưa được triển khai.');
  };

  return (
    <div style={{ width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: t.fontFamily || "'Inter', 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      
      {/* Toast Alert */}
      {toastMessage && (
        <div 
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            backgroundColor: t.isDark ? '#1E222B' : '#1E242B',
            color: t.primary,
            padding: '14px 22px',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            fontSize: '13px',
            fontWeight: '800',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            border: `1px solid ${t.border}`
          }}
        >
          <CheckCircle2 size={18} color={t.primary} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* -------------------------------------------------------------
          TOP BAR: Summary Metrics with Interactive Hover Effects
          ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { label: 'Tổng sự kiện ghi nhận', val: `${logs.length} Logs`, sub: 'Nhật ký từ máy chủ', color: t.aquaText },
          { label: 'Thao tác thành công (Success)', val: `${logs.length ? '100%' : '0%'} (${logs.length})`, sub: 'Bình thường', color: t.aquaText },
          { label: 'Cảnh báo tự động (Warning)', val: '0 Cảnh báo', sub: 'Cần rà soát', color: t.warning },
          { label: 'Sự kiện nguy cơ cao (High alert)', val: '0 Bị chặn', sub: 'Chưa triển khai giám sát IP', color: t.danger }
        ].map((card, idx) => (
          <div 
            key={idx}
            style={{ 
              backgroundColor: t.bgSurface, 
              padding: '18px 20px', 
              borderRadius: '20px', 
              border: `1px solid ${t.border}`, 
              boxShadow: t.cardShadow,
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = t.primary;
              e.currentTarget.style.boxShadow = t.cardHoverShadow || '0 12px 28px rgba(79, 70, 229, 0.18)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = t.border;
              e.currentTarget.style.boxShadow = t.cardShadow;
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: t.textSecondary, fontWeight: '700' }}>{card.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '6px' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', color: card.color }}>
                {card.val}
              </div>
              <span style={{ fontSize: '11px', color: t.textMuted, fontWeight: '600' }}>{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* -------------------------------------------------------------
          FILTER & SEARCH BAR with Hover Elevation
          ------------------------------------------------------------- */}
      <div 
        style={{
          backgroundColor: t.bgSurface,
          borderRadius: '22px',
          padding: '16px 20px',
          border: `1px solid ${t.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          boxShadow: t.cardShadow,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = t.isDark ? '#384252' : '#CBD5E1'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = t.border}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: t.bgInput,
            borderRadius: '20px',
            padding: '8px 16px',
            flex: 1,
            maxWidth: '400px',
            border: `1px solid ${t.border}`,
            transition: 'border-color 0.15s, box-shadow 0.15s'
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = t.primary}
          onBlur={(e) => e.currentTarget.style.borderColor = t.border}
        >
          <Search size={18} color={t.textSecondary} />
          <input 
            type="text"
            placeholder="Tìm theo hành động, nhân viên, IP, tenant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              paddingLeft: '10px',
              fontSize: '13px',
              color: t.textPrimary,
              width: '100%',
              fontWeight: '500'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '12px',
              backgroundColor: t.bgInput,
              border: `1px solid ${t.border}`,
              fontSize: '13px',
              fontWeight: '600',
              color: t.textPrimary,
              outline: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = t.primary}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = t.border}
          >
            <option value="ALL">Tất cả mức độ</option>
            <option value="High">Mức cao (High)</option>
            <option value="Medium">Trung bình (Medium)</option>
            <option value="Low">Mức thấp (Low)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '12px',
              backgroundColor: t.bgInput,
              border: `1px solid ${t.border}`,
              fontSize: '13px',
              fontWeight: '600',
              color: t.textPrimary,
              outline: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = t.primary}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = t.border}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Success">Thành công (Success)</option>
            <option value="Warning">Cảnh báo (Warning)</option>
            <option value="Failed">Thất bại / bị chặn (Failed)</option>
          </select>

          <button
            disabled title="Xuất CSV chưa được triển khai" onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: t.primary,
              color: '#FFFFFF',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
              transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.35)';
              e.currentTarget.style.filter = 'brightness(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.25)';
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            <Download size={16} />
            <span>Xuất file CSV</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          MAIN AUDIT LOGS DATA TABLE with 2-Line Row Layout
          ------------------------------------------------------------- */}
      <div 
        style={{
          backgroundColor: t.bgSurface,
          borderRadius: '24px',
          border: `1px solid ${t.border}`,
          overflow: 'hidden',
          boxShadow: t.cardShadow,
          width: '100%',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: t.isDark ? '#222731' : '#F8FAFC', color: t.textSecondary, borderBottom: `1px solid ${t.border}` }}>
                <th style={{ padding: '14px 12px', fontWeight: '700', whiteSpace: 'nowrap' }}>Thời gian</th>
                <th style={{ padding: '14px 12px', fontWeight: '700', whiteSpace: 'nowrap' }}>Người thực hiện</th>
                <th style={{ padding: '14px 10px', fontWeight: '700', whiteSpace: 'nowrap' }}>Mã hành động</th>
                <th style={{ padding: '14px 12px', fontWeight: '700', whiteSpace: 'nowrap' }}>Đối tượng / tenant</th>
                <th style={{ padding: '14px 12px', fontWeight: '700', whiteSpace: 'nowrap', maxWidth: '220px' }}>Mô tả can thiệp</th>
                <th style={{ padding: '14px 12px', fontWeight: '700', whiteSpace: 'nowrap' }}>Địa chỉ IP</th>
                <th style={{ padding: '14px 12px', fontWeight: '700', whiteSpace: 'nowrap' }}>Trạng thái</th>
                <th style={{ padding: '14px 12px', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap' }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const [datePart, timePart] = log.timestamp.split(' ');
                return (
                  <tr 
                    key={log.id}
                    style={{ 
                      borderBottom: `1px solid ${t.borderSubtle}`, 
                      transition: 'background-color 0.18s ease, transform 0.18s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = t.bgSurfaceHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Col 1: Timestamp (2 rows: Date + Time) */}
                    <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                      <div style={{ color: t.textPrimary, fontWeight: '700', fontSize: '12.5px', lineHeight: 1.25 }}>{datePart}</div>
                      <div style={{ color: t.textSecondary, fontSize: '11px', marginTop: '3px', lineHeight: 1.2 }}>{timePart}</div>
                    </td>

                    {/* Col 2: Operator (2 rows: Name + Role) */}
                    <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '800', color: t.textPrimary, whiteSpace: 'nowrap', fontSize: '13px', lineHeight: 1.25 }}>{log.operator}</div>
                      <div style={{ fontSize: '11px', color: t.textSecondary, whiteSpace: 'nowrap', marginTop: '3px', lineHeight: 1.2 }}>{log.operatorRole}</div>
                    </td>

                    {/* Col 3: Action Badge */}
                    <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                      <span 
                        style={{
                          fontSize: '10.5px',
                          fontWeight: '800',
                          fontFamily: 'monospace',
                          backgroundColor: t.bgInput,
                          color: t.textPrimary,
                          padding: '4px 7px',
                          borderRadius: '6px',
                          border: `1px solid ${t.border}`,
                          whiteSpace: 'nowrap',
                          display: 'inline-block'
                        }}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Col 4: Tenant & Target (2 rows: Name + Resource) */}
                    <td style={{ padding: '12px 12px', color: t.textPrimary, fontWeight: '700', whiteSpace: 'nowrap' }}>
                      <div style={{ whiteSpace: 'nowrap', fontSize: '13px', lineHeight: 1.25 }}>{log.tenantName}</div>
                      <div style={{ fontSize: '11px', color: t.textSecondary, whiteSpace: 'nowrap', marginTop: '3px', lineHeight: 1.2 }}>{log.target}</div>
                    </td>

                    {/* Col 5: 2-Line Clamped Description (Synchronized with all 2-row columns) */}
                    <td style={{ padding: '12px 12px', maxWidth: '220px' }}>
                      <div 
                        title={log.details}
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: t.textSecondary,
                          fontSize: '12px',
                          lineHeight: '1.35',
                          maxHeight: '34px',
                          cursor: 'help'
                        }}
                      >
                        {log.details}
                      </div>
                    </td>

                    {/* Col 6: IP Address */}
                    <td style={{ padding: '12px 12px', fontSize: '12px', fontFamily: 'monospace', color: t.textSecondary, whiteSpace: 'nowrap' }}>
                      {log.ipAddress}
                    </td>

                    {/* Col 7: Status Badge */}
                    <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                      <span 
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '4px 9px',
                          borderRadius: '12px',
                          backgroundColor: log.status === 'Success' ? t.aquaBg : log.status === 'Warning' ? t.warningBg : t.dangerBg,
                          color: log.status === 'Success' ? t.aquaText : log.status === 'Warning' ? t.warning : t.danger,
                          border: `1px solid ${log.status === 'Success' ? t.aquaBorder : log.status === 'Warning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: log.status === 'Success' ? t.primary : log.status === 'Warning' ? '#D97706' : '#DC2626', flexShrink: 0 }}></span>
                        {log.status}
                      </span>
                    </td>

                    {/* Col 8: Action Button with Hover micro-animation */}
                    <td style={{ padding: '12px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        title="Xem toàn bộ payload chi tiết"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '9px',
                          border: `1px solid ${t.border}`,
                          backgroundColor: t.bgInput,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: t.textPrimary,
                          flexShrink: 0,
                          transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = t.aquaBg;
                          e.currentTarget.style.color = t.aquaText;
                          e.currentTarget.style.borderColor = t.aquaBorder;
                          e.currentTarget.style.transform = 'scale(1.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = t.bgInput;
                          e.currentTarget.style.color = t.textPrimary;
                          e.currentTarget.style.borderColor = t.border;
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =============================================================
          MODAL: PREMIUM LOG DETAILS INSPECTOR
          ============================================================= */}
      {selectedLog && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: t.bgModalBackdrop,
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}
        >
          <div 
            style={{
              backgroundColor: t.bgSurface,
              borderRadius: '24px',
              width: '100%',
              maxWidth: '680px',
              padding: '28px 32px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              border: `1px solid ${t.border}`,
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Modal Top Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div 
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #2870EA 0%, #1D5BD8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
                    flexShrink: 0
                  }}
                >
                  <Activity size={22} strokeWidth={2.3} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: t.textPrimary, margin: 0, letterSpacing: '-0.01em' }}>
                      Chi tiết sự kiện audit
                    </h3>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '800', backgroundColor: t.bgInput, color: t.textSecondary, padding: '2px 8px', borderRadius: '6px', border: `1px solid ${t.border}` }}>
                      #{selectedLog.id}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: t.textSecondary, margin: '2px 0 0 0' }}>
                    Nhật ký giám sát can thiệp hệ thống và bảo mật backoffice
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => {
                  setSelectedLog(null);
                  setLogViewMode('overview');
                  setCopiedJson(false);
                }}
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '10px', 
                  backgroundColor: t.bgInput, 
                  border: `1px solid ${t.border}`, 
                  cursor: 'pointer', 
                  color: t.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Status & Severity Badges Header Ribbon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', backgroundColor: t.bgInput, borderRadius: '14px', border: `1px solid ${t.border}`, marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: t.textSecondary }}>Trạng thái:</span>
                <span 
                  style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: selectedLog.status === 'Success' ? t.aquaBg : selectedLog.status === 'Warning' ? t.warningBg : t.dangerBg,
                    color: selectedLog.status === 'Success' ? t.aquaText : selectedLog.status === 'Warning' ? t.warning : t.danger,
                    border: `1px solid ${selectedLog.status === 'Success' ? t.aquaBorder : selectedLog.status === 'Warning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: selectedLog.status === 'Success' ? t.primary : selectedLog.status === 'Warning' ? '#D97706' : '#DC2626' }}></span>
                  {selectedLog.status === 'Success' ? 'Thành công (Success)' : selectedLog.status === 'Warning' ? 'Cảnh báo (Warning)' : 'Thất bại / bị chặn'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: t.textSecondary }}>Mức độ:</span>
                <span 
                  style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: selectedLog.severity === 'High' ? t.dangerBg : selectedLog.severity === 'Medium' ? t.warningBg : t.aquaBg,
                    color: selectedLog.severity === 'High' ? t.danger : selectedLog.severity === 'Medium' ? t.warning : t.aquaText,
                    border: `1px solid ${selectedLog.severity === 'High' ? 'rgba(239, 68, 68, 0.3)' : selectedLog.severity === 'Medium' ? 'rgba(245, 158, 11, 0.3)' : t.aquaBorder}`
                  }}
                >
                  {selectedLog.severity} Severity
                </span>
              </div>
            </div>

            {/* View Mode Tabs (Overview vs Raw JSON) */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', borderBottom: `1px solid ${t.borderSubtle}`, paddingBottom: '12px' }}>
              <button
                onClick={() => setLogViewMode('overview')}
                style={{
                  padding: '7px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: logViewMode === 'overview' ? t.primary : t.bgInput,
                  color: logViewMode === 'overview' ? '#FFFFFF' : t.textSecondary,
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <Shield size={14} />
                <span>Tổng quan sự kiện</span>
              </button>
              <button
                onClick={() => setLogViewMode('json')}
                style={{
                  padding: '7px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: logViewMode === 'json' ? t.primary : t.bgInput,
                  color: logViewMode === 'json' ? '#FFFFFF' : t.textSecondary,
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <FileCode size={14} />
                <span>Raw JSON payload</span>
              </button>
            </div>

            {/* TAB 1: STRUCTURED OVERVIEW */}
            {logViewMode === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 4 Metadata Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  
                  {/* Card 1: Time */}
                  <div style={{ backgroundColor: t.isDark ? '#1F242D' : '#F8FAFC', padding: '14px 16px', borderRadius: '16px', border: `1px solid ${t.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textSecondary, fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                      <Clock size={13} color={t.primary} />
                      <span>Thời gian thực thi</span>
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: '800', color: t.textPrimary }}>
                      {selectedLog.timestamp}
                    </div>
                  </div>

                  {/* Card 2: Operator */}
                  <div style={{ backgroundColor: t.isDark ? '#1F242D' : '#F8FAFC', padding: '14px 16px', borderRadius: '16px', border: `1px solid ${t.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textSecondary, fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                      <User size={13} color={t.primary} />
                      <span>Người thực hiện</span>
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: '800', color: t.textPrimary }}>
                      {selectedLog.operator}
                    </div>
                    <span style={{ fontSize: '10.5px', color: t.aquaText, fontWeight: '700' }}>
                      {selectedLog.operatorRole}
                    </span>
                  </div>

                  {/* Card 3: Tenant */}
                  <div style={{ backgroundColor: t.isDark ? '#1F242D' : '#F8FAFC', padding: '14px 16px', borderRadius: '16px', border: `1px solid ${t.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textSecondary, fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                      <Building2 size={13} color={t.primary} />
                      <span>Khách sạn / cơ sở</span>
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: '800', color: t.textPrimary }}>
                      {selectedLog.tenantName}
                    </div>
                    <span style={{ fontSize: '11px', color: t.textSecondary }}>
                      Target: {selectedLog.target}
                    </span>
                  </div>

                  {/* Card 4: IP Address */}
                  <div style={{ backgroundColor: t.isDark ? '#1F242D' : '#F8FAFC', padding: '14px 16px', borderRadius: '16px', border: `1px solid ${t.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textSecondary, fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                      <Globe size={13} color={t.primary} />
                      <span>Địa chỉ IP & cụm</span>
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: '800', fontFamily: 'monospace', color: t.textPrimary }}>
                      {selectedLog.ipAddress}
                    </div>
                    <span style={{ fontSize: '10.5px', color: t.textMuted }}>
                      Cloud Gateway v2
                    </span>
                  </div>

                </div>

                {/* Action Code Box */}
                <div style={{ backgroundColor: t.bgInput, padding: '12px 16px', borderRadius: '14px', border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: t.textSecondary }}>Mã hành động can thiệp:</span>
                  <span style={{ fontSize: '12px', fontWeight: '800', fontFamily: 'monospace', backgroundColor: t.aquaBg, color: t.aquaText, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${t.aquaBorder}` }}>
                    {selectedLog.action}
                  </span>
                </div>

                {/* Full Message Details */}
                <div style={{ backgroundColor: t.isDark ? '#191D24' : '#F0FDFA', padding: '16px', borderRadius: '16px', border: `1px solid ${t.isDark ? '#282F3D' : '#CCFBF1'}` }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: t.aquaText, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                    Nội dung can thiệp ghi nhận:
                  </span>
                  <p style={{ fontSize: '13px', color: t.textPrimary, margin: 0, lineHeight: 1.5, fontWeight: '500' }}>
                    {selectedLog.details}
                  </p>
                </div>

              </div>
            )}

            {/* TAB 2: RAW JSON PAYLOAD */}
            {logViewMode === 'json' && (
              <div style={{ position: 'relative' }}>
                <div 
                  style={{ 
                    backgroundColor: t.isDark ? '#11141A' : '#1E242B', 
                    color: '#E2E8F0', 
                    padding: '20px', 
                    borderRadius: '16px', 
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace', 
                    fontSize: '12px', 
                    lineHeight: 1.6, 
                    border: '1px solid #333842',
                    maxHeight: '280px',
                    overflowY: 'auto'
                  }}
                >
                  <pre style={{ margin: 0 }}>
{JSON.stringify({
  id: selectedLog.id,
  timestamp: selectedLog.timestamp,
  operator: {
    name: selectedLog.operator,
    role: selectedLog.operatorRole
  },
  action: selectedLog.action,
  target: selectedLog.target,
  tenant: selectedLog.tenantName,
  network: {
    ip: selectedLog.ipAddress,
    protocol: 'HTTPS/TLSv1.3'
  },
  severity: selectedLog.severity,
  status: selectedLog.status,
  message: selectedLog.details
}, null, 2)}
                  </pre>
                </div>

                {/* Copy Button on Top Right of JSON */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
                    setCopiedJson(true);
                    setTimeout(() => setCopiedJson(false), 2000);
                  }}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: copiedJson ? '#10B981' : 'rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s'
                  }}
                >
                  {copiedJson ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedJson ? 'Đã sao chép!' : 'Sao chép JSON'}</span>
                </button>
              </div>
            )}

            {/* Modal Bottom Actions Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: `1px solid ${t.borderSubtle}` }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedLog.id);
                  showToast(`Đã sao chép mã sự kiện #${selectedLog.id}`);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.bgInput,
                  color: t.textSecondary,
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <Copy size={14} />
                <span>Sao chép ID</span>
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedLog, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `audit_log_${selectedLog.id}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                    showToast(`Đã tải xuống file audit_log_${selectedLog.id}.json`);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: `1px solid ${t.border}`,
                    backgroundColor: t.bgInput,
                    color: t.textPrimary,
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} />
                  <span>Xuất JSON</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedLog(null);
                    setLogViewMode('overview');
                  }}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: t.primary,
                    color: '#FFFFFF',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
                    transition: 'filter 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
