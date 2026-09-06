import React from 'react';
import { 
  LayoutDashboard, 
  BedDouble, 
  PlusCircle, 
  UtensilsCrossed, 
  FileText, 
  RefreshCw, 
  Settings, 
  Building2, 
  Grid,
  ChevronRight,
  ShieldCheck,
  Users,
  Terminal,
  Lock
} from 'lucide-react';
import { ROLES, ROLE_LABELS } from '../mockData/usersData';

export default function Sidebar({ currentTab, onSelectTab, onOpenBookingModal, onOpenAppSwitcher, currentUser }) {
  const userRole = currentUser ? currentUser.role : ROLES.USER;
  const userPermissions = currentUser?.permissions || ['dashboard', 'matrix'];

  const allMenuItems = [
    { id: 'dashboard', label: 'Tổng quan (Dashboard)', icon: LayoutDashboard },
    { id: 'matrix', label: 'Sơ đồ phòng (Room Matrix)', icon: BedDouble, badge: '17 phòng' },
    { id: 'pos', label: 'Điểm bán ezPos (F&B / Spa)', icon: UtensilsCrossed },
    { id: 'invoice', label: 'Hóa đơn ezInvoice', icon: FileText },
    { id: 'cms', label: 'Kênh OTA (ezCms)', icon: RefreshCw, badge: '5 OTA' },
    { id: 'users', label: 'Quản lý Người dùng & Phân quyền', icon: Users, badge: 'RBAC' },
    { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings }
  ];

  // Dev System item
  if (userRole === ROLES.ADMIN_SYSTEM) {
    allMenuItems.push({ id: 'system_logs', label: 'Dev System Tools & Logs', icon: Terminal, badge: 'DEV ROOT' });
  }

  // Helper to check if item is allowed
  const isAllowed = (tabId) => {
    if (userRole === ROLES.ADMIN_SYSTEM) return true;
    return userPermissions.includes(tabId);
  };

  const roleMeta = ROLE_LABELS[userRole] || ROLE_LABELS.user;

  return (
    <aside className="pms-sidebar">
      {/* Sidebar Top App Label */}
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, #0284c7 0%, #1b49a6 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white'
          }}>
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'white' }}>HMS system™</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>PMS Property System</div>
          </div>
        </div>

        <button 
          onClick={onOpenAppSwitcher}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          title="Tất cả ứng dụng"
        >
          <Grid size={18} />
        </button>
      </div>

      {/* Quick Action Button */}
      <div style={{ padding: '16px 12px 8px' }}>
        <button 
          onClick={onOpenBookingModal}
          className="btn btn-primary btn-block"
          style={{ 
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
            border: 'none', 
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
            borderRadius: '10px'
          }}
        >
          <PlusCircle size={18} />
          <span>Tạo Đặt Phòng Mới</span>
        </button>
      </div>

      {/* Main Menu List */}
      <nav className="sidebar-menu">
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', padding: '8px 14px 4px', letterSpacing: '0.05em' }}>
          Quản Lý Khách Sạn
        </div>

        {allMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const hasAccess = isAllowed(item.id);

          return (
            <a
              key={item.id}
              onClick={(e) => { e.preventDefault(); onSelectTab(item.id); }}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={{
                opacity: hasAccess ? 1 : 0.45,
                position: 'relative'
              }}
              title={hasAccess ? item.label : `Chưa cấp quyền (${item.label})`}
            >
              <Icon size={18} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {!hasAccess && (
                <Lock size={13} style={{ color: '#f59e0b' }} />
              )}
              {hasAccess && item.badge && (
                <span style={{ 
                  fontSize: '11px', 
                  padding: '2px 6px', 
                  borderRadius: '10px', 
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', 
                  color: isActive ? 'white' : '#94a3b8' 
                }}>
                  {item.badge}
                </span>
              )}
            </a>
          );
        })}

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '16px 8px' }} />

        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', padding: '0 14px 4px', letterSpacing: '0.05em' }}>
          Cổng Ứng Dụng HMS
        </div>

        <a 
          onClick={(e) => { e.preventDefault(); onSelectTab('portal'); }} 
          className={`nav-item ${currentTab === 'portal' ? 'active' : ''}`}
        >
          <Grid size={18} />
          <span style={{ flex: 1 }}>id.hms.vn Launcher</span>
          <ChevronRight size={14} />
        </a>
      </nav>

      {/* Sidebar Footer Security Status */}
      <div style={{ 
        padding: '14px 16px', 
        borderTop: '1px solid rgba(255,255,255,0.08)', 
        background: 'rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <ShieldCheck size={20} color={userRole === ROLES.ADMIN_SYSTEM ? '#f59e0b' : userRole === ROLES.ADMIN_MANAGER ? '#38bdf8' : '#34d399'} />
        <div style={{ fontSize: '12px', color: '#cbd5e1', flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentUser ? currentUser.name : 'Passkey Authenticated'}
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
            Role: <span style={{ color: roleMeta.color, fontWeight: 700 }}>{roleMeta.label}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
