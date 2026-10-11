import { useEffect, useRef, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Search, LogOut, UserRound, ExternalLink, ChevronDown, Sun, Moon, Menu } from 'lucide-react';
import { usePms } from '../../pms/data/usePms';

const PAGE_TITLES = {
  dashboard: ['Tổng quan hệ thống', 'Theo dõi khách sạn và hoạt động quản trị.'],
  tenants: ['Khách hàng & khách sạn', 'Hồ sơ liên hệ, tài khoản và dịch vụ SaaS.'],
  billing: ['Gói cước & hóa đơn', 'Quản lý thuê bao và lịch sử thay đổi gói.'],
  features: ['Tính năng hệ thống', 'Theo dõi tính năng và quyền sử dụng của khách sạn.'],
  users: ['Nhân sự nội bộ', 'Tài khoản và vai trò quản trị hệ thống.'],
  logs: ['Nhật ký hệ thống', 'Tra cứu các thao tác được ghi nhận từ máy chủ.'],
  profile: ['Hồ sơ cá nhân', 'Thông tin tài khoản quản trị của bạn.'],
};

export default function ManagerHeader({ searchQuery, setSearchQuery, isDarkMode, toggleDarkMode, currentRole, onOpenNavigation }) {
  const { logout, user } = usePms();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileRef = useRef(null);
  const profileButton = useRef(null);
  const route = location.pathname.split('/').at(-1);
  const [title, subtitle] = PAGE_TITLES[route] || PAGE_TITLES.dashboard;
  const searchable = ['tenants', 'features', 'users', 'logs'].includes(route);
  const roleName = currentRole === 'SUPER_ADMIN' ? 'Super Admin' : 'System Manager';
  const initials = (user?.name || user?.email || 'LOHA').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  useEffect(() => {
    if (!profileOpen) return;
    const closeOutside = event => { if (!profileRef.current?.contains(event.target)) setProfileOpen(false); };
    const closeEscape = event => { if (event.key === 'Escape') { setProfileOpen(false); profileButton.current?.focus(); } };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeEscape); };
  }, [profileOpen]);

  async function signOut() {
    setSigningOut(true);
    try { await logout(); navigate('/id/login'); }
    catch { /* Provider displays the request error and keeps the session. */ }
    finally { setSigningOut(false); }
  }

  return (
    <header className="manager-header">
      <div className="manager-header-title">
        <button className="manager-icon-button manager-mobile-toggle" type="button" aria-label="Mở menu quản trị" aria-haspopup="dialog" aria-controls="manager-mobile-nav" onClick={onOpenNavigation}><Menu size={20} /></button>
        <div><span className="manager-header-breadcrumb">Quản trị <span>/</span> {title}</span><h1>{title}</h1><p>{subtitle}</p></div>
      </div>
      <div className="manager-header-actions">
        {searchable && <label className="manager-header-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label="Tìm trong trang hiện tại" placeholder="Tìm trong trang…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} /></label>}
        <button className="manager-icon-button" type="button" onClick={toggleDarkMode} aria-label={isDarkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} title={isDarkMode ? 'Giao diện sáng' : 'Giao diện tối'}>{isDarkMode ? <Sun size={19} /> : <Moon size={19} />}</button>
        <div className="manager-profile" ref={profileRef}>
          <button type="button" className="manager-profile-trigger" ref={profileButton} aria-label="Menu tài khoản" aria-expanded={profileOpen} aria-controls="manager-profile-menu" onClick={() => setProfileOpen(!profileOpen)}>
            <span className="manager-avatar">{initials}</span><span className="manager-profile-copy"><strong>{user?.name || roleName}</strong><small>{roleName}</small></span><ChevronDown size={15} aria-hidden="true" />
          </button>
          {profileOpen && <div id="manager-profile-menu" className="manager-profile-menu">
            <div className="manager-profile-identity"><strong>{user?.name}</strong><span>{user?.email}</span><small>{roleName}</small></div>
            <Link to="/manager/profile" onClick={() => setProfileOpen(false)}><UserRound size={17} />Hồ sơ cá nhân</Link>
            <Link to="/id/dashboard" onClick={() => setProfileOpen(false)}><ExternalLink size={17} />Mở ứng dụng PMS</Link>
            <button type="button" onClick={signOut} disabled={signingOut}><LogOut size={17} />{signingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</button>
          </div>}
        </div>
      </div>
    </header>
  );
}
