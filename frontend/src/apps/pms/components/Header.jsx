import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Info, KeyRound, LogOut, Menu, Network, History, Settings, ShieldCheck, UserRound, Users } from 'lucide-react';
import { AccessLink as Link } from '../../../shared/components/AccessControl';
import LegacyOverlay from './LegacyOverlay';
import UsageInfoModal from './UsageInfoModal';
import NotificationBell from './NotificationBell';
import { usePms } from '../data/usePms';
import { ROLE_NAMES } from '../data/access';

export default function Header({ onOpenNavigation }) {
  const { logout, user, role, tenant, isManager, subscription } = usePms();
  const [profileOpen, setProfileOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileRef = useRef(null);
  const triggerRef = useRef(null);
  const navigate = useNavigate();
  const initials = (user?.name || user?.email || 'L').trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  useEffect(() => {
    if (!profileOpen) return;
    const closeOutside = event => { if (!profileRef.current?.contains(event.target)) setProfileOpen(false); };
    const closeEscape = event => { if (event.key === 'Escape') { setProfileOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeEscape); };
  }, [profileOpen]);
  async function handleLogout() {
    setSigningOut(true);
    try { await logout(); navigate('/id/login'); }
    catch { /* Provider displays the server error and keeps the session. */ }
    finally { setSigningOut(false); }
  }
  function openUsage() { setProfileOpen(false); setUsageOpen(true); }
  const links = [
    { to: '/id/profile', label: 'Hồ sơ cá nhân', icon: UserRound },
    { to: '/id/profile?tab=security', label: 'Đổi mật khẩu', icon: KeyRound },
    { to: '/id/settings', label: 'Cài đặt hệ thống', icon: Settings },
    { to: '/id/users', label: 'Quản lý người dùng', icon: Users },
    { to: '/id/ota', label: 'Kênh phân phối OTA', icon: Network },
    { to: '/id/ota-history', label: 'Lịch sử kênh phân phối', icon: History },
  ];
  return (
    <header className="pms-topbar">
      <div className="pms-topbar-context"><button type="button" className="pms-topbar-icon pms-menu-trigger" aria-label="Mở menu khách sạn" aria-haspopup="dialog" aria-controls="pms-mobile-navigation" onClick={onOpenNavigation}><Menu size={20} /></button><Building2 className="pms-context-icon" size={20} aria-hidden="true" /><div><span>KHÔNG GIAN KHÁCH SẠN</span><strong title={tenant?.name}>{tenant?.name || 'LOHA PMS'}</strong></div></div>
      <div className="pms-topbar-actions">
        <NotificationBell />
        <button type="button" className="pms-plan-button" onClick={openUsage} aria-label="Thông tin gói dịch vụ và hạn mức"><ShieldCheck size={16} /><span>{subscription?.planName || 'Gói dịch vụ'}</span><ChevronDown size={14} /></button>
        <div className="pms-account" ref={profileRef}>
          <button type="button" className="pms-account-trigger" ref={triggerRef} aria-label="Menu tài khoản" aria-expanded={profileOpen} aria-controls={profileOpen ? 'pms-account-menu' : undefined} onClick={() => setProfileOpen(!profileOpen)}><span className="pms-account-avatar">{initials}</span><span className="pms-account-copy"><strong>{user?.name}</strong><small>{ROLE_NAMES[role]}</small></span><ChevronDown size={15} aria-hidden="true" /></button>
          {profileOpen && <div id="pms-account-menu" className="pms-account-menu"><div className="pms-account-identity"><strong>{user?.name}</strong><span>{user?.email}</span><small>{ROLE_NAMES[role]}</small></div>
            {isManager && <Link to="/manager/tenants" onClick={() => setProfileOpen(false)}><ShieldCheck size={17} />Quản trị hệ thống</Link>}
            {links.map(({ to, label, icon: Icon }) => <Link key={to} to={to} onClick={() => setProfileOpen(false)}><Icon size={17} aria-hidden="true" />{label}</Link>)}
            <button type="button" onClick={openUsage}><Info size={17} />Thông tin sử dụng</button><button type="button" className="pms-account-logout" onClick={handleLogout} disabled={signingOut}><LogOut size={17} />{signingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</button>
          </div>}
        </div>
      </div>
      {usageOpen && <LegacyOverlay title="Thông tin sử dụng" onClose={() => setUsageOpen(false)}><UsageInfoModal isOpen onClose={() => setUsageOpen(false)} /></LegacyOverlay>}
    </header>
  );
}
