import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Building2, CreditCard, SlidersHorizontal, Users, ScrollText, UserRound, PanelLeftClose, PanelLeftOpen, ArrowUpRight, X } from 'lucide-react';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Tổng quan', path: 'dashboard' },
  { icon: Building2, label: 'Khách hàng & khách sạn', path: 'tenants' },
  { icon: CreditCard, label: 'Gói cước & hóa đơn', path: 'billing' },
  { icon: SlidersHorizontal, label: 'Tính năng', path: 'features' },
  { icon: Users, label: 'Nhân sự nội bộ', path: 'users', superOnly: true },
  { icon: ScrollText, label: 'Nhật ký hệ thống', path: 'logs', superOnly: true },
];

export default function ManagerSidebar({ isCollapsed = false, setIsCollapsed, currentRole, onClose }) {
  const isSuperAdmin = currentRole === 'SUPER_ADMIN';
  return (
    <aside className={`manager-sidebar${isCollapsed ? ' is-collapsed' : ''}`} aria-label="Điều hướng quản trị">
      <div className="manager-brand-row">
        <Link to="/manager/dashboard" className="manager-brand" aria-label="LOHA — Tổng quan quản trị" onClick={onClose}>
          <span className="manager-brand-mark" aria-hidden="true">L<span /></span>
          <span className="manager-brand-copy"><strong>LOHA</strong><small>PMS SYSTEM</small></span>
        </Link>
        {onClose && <button className="manager-sidebar-icon" type="button" onClick={onClose} aria-label="Đóng menu"><X size={20} /></button>}
      </div>
      <div className="manager-sidebar-body">
        <p className="manager-nav-label">KHÔNG GIAN QUẢN TRỊ</p>
        <nav className="manager-nav">
          {NAV_ITEMS.filter(item => !item.superOnly || isSuperAdmin).map(({ icon: Icon, label, path }) => (
            <NavLink key={path} to={`/manager/${path}`} className={({ isActive }) => `manager-nav-link${isActive ? ' is-active' : ''}`} title={isCollapsed ? label : undefined} aria-label={label} onClick={onClose}>
              <Icon size={19} aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="manager-sidebar-note"><span>LOHA Manager</span><p>Quản lý khách sạn, dịch vụ và quyền truy cập tại một nơi.</p></div>
      </div>
      <div className="manager-sidebar-footer">
        <NavLink to="/manager/profile" className={({ isActive }) => `manager-nav-link${isActive ? ' is-active' : ''}`} aria-label="Hồ sơ cá nhân" title={isCollapsed ? 'Hồ sơ cá nhân' : undefined} onClick={onClose}><UserRound size={19} /><span>Hồ sơ cá nhân</span></NavLink>
        <Link to="/id/dashboard" className="manager-nav-link" aria-label="Mở ứng dụng PMS" title={isCollapsed ? 'Mở ứng dụng PMS' : undefined} onClick={onClose}><ArrowUpRight size={19} /><span>Mở ứng dụng PMS</span></Link>
        {!onClose && <button type="button" className="manager-nav-link manager-collapse" onClick={() => setIsCollapsed(!isCollapsed)} aria-label={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'} title={isCollapsed ? 'Mở rộng thanh điều hướng' : undefined}>{isCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}<span>Thu gọn menu</span></button>}
      </div>
    </aside>
  );
}
