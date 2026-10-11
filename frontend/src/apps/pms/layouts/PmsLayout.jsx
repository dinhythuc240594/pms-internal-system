import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { usePms } from '../data/usePms';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import './PmsLayout.css';

export default function PmsLayout() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { storageWarning, tenantId, tenant, accessDialog } = usePms();
  const { pathname } = useLocation();
  const menuRef = useRef(null);
  useEffect(() => {
    if (mobileMenu && !accessDialog) menuRef.current?.showModal();
    else menuRef.current?.close();
  }, [mobileMenu, accessDialog]);
  return (
    <div className={`app-theme pms-shell${isCollapsed ? ' pms-shell-collapsed' : ''}`}>
      <a className="pms-skip-link" href="#pms-main-content">Đến nội dung chính</a>
      <div className="pms-desktop-navigation"><Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} /></div>
      <dialog id="pms-mobile-navigation" className="pms-mobile-navigation" ref={menuRef} aria-label="Menu khách sạn" onClick={event => { if (event.target === event.currentTarget) setMobileMenu(false); }} onCancel={() => setMobileMenu(false)} onClose={() => setMobileMenu(false)}><Sidebar onClose={() => setMobileMenu(false)} /></dialog>
      <div className="pms-workspace">
        <Header onOpenNavigation={() => setMobileMenu(true)} />
        <main id="pms-main-content" className="pms-main" tabIndex={-1}>
          <div className="pms-content">
            {storageWarning && <p className="pms-shell-notice" role="alert">{storageWarning}</p>}
            {tenant && tenant.status?.toUpperCase() !== 'ACTIVE' && <p className="pms-shell-notice" role="status">Khách sạn đang tạm ngưng. Dữ liệu chỉ được xem.</p>}
            <Outlet key={tenantId + pathname} />
          </div>
        </main>
      </div>
    </div>
  );
}
