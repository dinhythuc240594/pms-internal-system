import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AccessLink as Link } from '../../../shared/components/AccessControl';
import LohaBrand from '../../../shared/components/LohaBrand';
import { usePms } from '../data/usePms';
import { ROLE_NAMES } from '../data/access';
import { LayoutDashboard, CalendarCheck, BedDouble, Tags, Database, Settings, ChevronDown, ChevronRight, ClipboardList, Store, Sparkles, Box, BarChart3, PanelLeftClose, PanelLeftOpen, Building2, RefreshCw, X } from 'lucide-react';
const navItems = [
  { icon: LayoutDashboard, label: 'Tổng quan', path: '/id/dashboard' },
  { icon: CalendarCheck, label: 'Lịch đặt phòng', path: '/id/ari' },
  { icon: BedDouble, label: 'Sơ đồ phòng', path: '/id/room-diagram' },
  { icon: ClipboardList, label: 'Đặt phòng', path: '/id/reservations' },
  { icon: Store, label: 'Dịch vụ & POS', path: '/id/sales' },
  { icon: RefreshCw, label: 'Kênh OTA', path: '/id/ota' },
  { 
    icon: Database, label: 'Tài chính & thu chi', path: '/id/cashflow',
    subItems: [
      { label: 'Quỹ tiền mặt', path: '/id/cashflow/cash' },
      { label: 'Quỹ tiền gửi', path: '/id/cashflow/bank' }
    ]
  },
  { 
    icon: Tags, label: 'Giá & Phòng trống', path: '/id/gia',
    subItems: [
      { label: 'Giá cơ bản', path: '/id/gia/basic' },
      { label: 'Giá nâng cao', path: '/id/gia/advanced' },
      { label: 'Giá & Phòng trống hàng ngày', path: '/id/matrix-rate' },
      { label: 'Vouchers', path: '/id/gia/vouchers' },
      { label: 'Giá cho lịch đặt phòng', path: '/id/gia/ari' },
      { label: 'Khuyến mãi', path: '/id/gia/promotions' },
      { label: 'Tỷ giá', path: '/id/gia/exchange-rates' }
    ]
  },
  { 
    icon: Sparkles, label: 'Buồng phòng', path: '/id/housekeeping',
    subItems: [
      { label: 'Buồng phòng', path: '/id/housekeeping/status' },
      { label: 'Nhân viên buồng phòng', path: '/id/housekeeping/staff' },
      { label: 'Kế hoạch dọn phòng', path: '/id/housekeeping/plan' }
    ]
  },
  { 
    icon: Box, label: 'Kho hàng', path: '/id/inventory',
    subItems: [
      { label: 'Phiếu nhập kho', path: '/id/inventory/in' },
      { label: 'Phiếu xuất kho', path: '/id/inventory/out' },
      { label: 'Phiếu chuyển kho', path: '/id/inventory/transfer' },
      { label: 'Phiếu kiểm kê', path: '/id/inventory/check' },
      { label: 'Tồn kho & biến động', path: '/id/inventory/stock' }
    ]
  },
  { 
    icon: BarChart3, label: 'Báo cáo', path: '/id/reports',
    subItems: [
      { label: 'Báo cáo doanh thu', path: '/id/reports/revenue' },
      { label: 'Hiệu suất phòng', path: '/id/reports/occupancy' }
    ]
  },
];

export default function Sidebar({ isCollapsed = false, setIsCollapsed, onClose }) {
  const { pathname } = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});
  const { hotels, tenant, selectTenant, role, routeAccess } = usePms();
  const isActive = path => pathname === path || pathname.startsWith(path + '/');
  const collapsed = isCollapsed && !onClose;

  function toggleSubmenu(item) {
    if (collapsed) setIsCollapsed(false);
    setExpandedMenus(previous => ({ ...previous, [item.path]: collapsed || !(previous[item.path] ?? isActive(item.path)) }));
  }

  return (
    <aside className={`pms-sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Điều hướng khách sạn">
      <div className="pms-sidebar-brand"><LohaBrand />{onClose && <button type="button" className="pms-sidebar-close" aria-label="Đóng menu" onClick={onClose}><X size={20} /></button>}</div>
      <div className="pms-hotel-selector">
        <Building2 size={19} aria-hidden="true" />
        {collapsed ? <button type="button" aria-label="Mở lựa chọn khách sạn" title={tenant?.name} onClick={() => setIsCollapsed(false)}><Building2 size={19} /></button> : <div><label htmlFor={onClose ? 'pms-mobile-hotel' : 'pms-desktop-hotel'}>KHÁCH SẠN ĐANG CHỌN</label><select id={onClose ? 'pms-mobile-hotel' : 'pms-desktop-hotel'} value={tenant?.id || ''} onChange={event => { selectTenant(event.target.value); onClose?.(); }} disabled={!hotels.length}>{!hotels.length && <option value="">Chưa có khách sạn</option>}{hotels.map(hotel => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}</select><small>{ROLE_NAMES[role] || 'Tài khoản khách sạn'}</small></div>}
      </div>
      <nav className="pms-sidebar-nav" aria-label="Nghiệp vụ PMS">
        {!collapsed && <p className="pms-nav-caption">VẬN HÀNH KHÁCH SẠN</p>}
        {navItems.map(item => {
          const active = isActive(item.path) || (item.path === '/id/ota' && pathname === '/id/ota-history') || item.subItems?.some(sub => pathname === sub.path);
          const expanded = expandedMenus[item.path] ?? active;
          const hasAccess = routeAccess(item.path).allowed || item.subItems?.some(sub => routeAccess(sub.path).allowed);
          const Icon = item.icon;
          return <div key={item.path} className="pms-nav-group">
            {item.subItems ? <button type="button" className={`pms-nav-link${active ? ' is-active' : ''}`} aria-label={item.label} aria-expanded={!collapsed && expanded} aria-controls={!collapsed && expanded ? `pms-submenu-${onClose ? 'mobile-' : ''}${item.path.split('/').at(-1)}` : undefined} title={collapsed ? item.label : undefined} onClick={() => toggleSubmenu(item)}><Icon size={19} aria-hidden="true" /><span>{item.label}</span>{!collapsed && (expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />)}{!hasAccess && <span className="pms-nav-lock" aria-label="Bị khóa">🔒</span>}</button> : <Link to={item.path} className={`pms-nav-link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined} aria-label={item.label} title={collapsed ? item.label : undefined} onClick={onClose}><Icon size={19} aria-hidden="true" /><span>{item.label}</span></Link>}
            {item.subItems && expanded && !collapsed && <div className="pms-submenu" id={`pms-submenu-${onClose ? 'mobile-' : ''}${item.path.split('/').at(-1)}`}>{item.subItems.map(sub => <Link key={sub.path} to={sub.path} className={`pms-submenu-link${pathname === sub.path ? ' is-active' : ''}`} aria-current={pathname === sub.path ? 'page' : undefined} onClick={onClose}>{sub.label}</Link>)}</div>}
          </div>;
        })}
      </nav>
      <div className="pms-sidebar-footer">
        <Link to="/id/settings" className={`pms-nav-link${isActive('/id/settings') ? ' is-active' : ''}`} aria-label="Cài đặt hệ thống" title={collapsed ? 'Cài đặt hệ thống' : undefined} onClick={onClose}><Settings size={19} /><span>Cài đặt hệ thống</span></Link>
        {!onClose && <button type="button" className="pms-nav-link pms-collapse-toggle" aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'} title={collapsed ? 'Mở rộng thanh điều hướng' : undefined} onClick={() => setIsCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}<span>Thu gọn menu</span></button>}
      </div>
    </aside>
  );
}
