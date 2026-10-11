import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import LohaBrand from '../../../shared/components/LohaBrand';
import './MarketingLayout.css';
import '../Marketing.css';

const navigation = [
  ['/', 'Trang chủ'],
  ['/pricing', 'Bảng giá'],
  ['/blog', 'Blog'],
  ['/contact', 'Liên hệ'],
];

export default function MarketingLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function closeMobileMenu() {
    closeMenu();
    menuButtonRef.current?.focus();
  }

  function handleHeaderKey(event) {
    if (event.key === 'Escape' && menuOpen) {
      closeMenu();
      menuButtonRef.current?.focus();
    }
  }

  return (
    <div className="loha-home">
      <a className="loha-skip-link" href="#loha-main">Đến nội dung chính</a>
      <header className="loha-header" onKeyDown={handleHeaderKey}>
        <div className="loha-container loha-header-inner">
          <LohaBrand />
          <nav className="loha-desktop-nav" aria-label="Điều hướng chính">
            {navigation.map(([to, name]) => <NavLink key={to} to={to} end onClick={closeMenu}>{name}</NavLink>)}
          </nav>
          <Link className="loha-header-login" to="/id/login">Đăng nhập <ArrowUpRight size={16} aria-hidden="true" /></Link>
          <button ref={menuButtonRef} className="loha-menu-button" type="button" aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen} aria-controls="loha-mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
        <nav id="loha-mobile-nav" className="loha-mobile-nav" aria-label="Điều hướng trên điện thoại" hidden={!menuOpen} onClick={closeMobileMenu}>
          {navigation.map(([to, name]) => <NavLink key={to} to={to} end>{name}</NavLink>)}
          <Link to="/id/login">Đăng nhập LOHA <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </nav>
      </header>

      <main id="loha-main" tabIndex={-1}>
        <Outlet />
        <section className="loha-start">
          <div className="loha-container loha-start-inner">
            <div><span className="loha-kicker">MỘT NGÀY LÀM VIỆC NHẸ NHÀNG HƠN</span><h2>Chào ngày mới.<br />Chào LOHA.</h2></div>
            <div><p>Đưa những công việc hằng ngày<br />về cùng một không gian.</p><Link className="loha-button loha-button-light" to="/id/login">Mở không gian làm việc <ArrowUpRight size={19} aria-hidden="true" /></Link></div>
          </div>
          <span className="loha-start-decoration" aria-hidden="true">L</span>
        </section>
      </main>

      <footer className="loha-footer">
        <div className="loha-container">
          <div className="loha-footer-top">
            <div><LohaBrand /><p>Vận hành gọn. Đón khách trọn vẹn.</p></div>
            <nav aria-label="Liên kết cuối trang">
              {navigation.map(([to, name]) => <Link key={to} to={to}>{name}</Link>)}
            </nav>
            <a className="loha-text-link" href="#loha-main">Về đầu trang <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
          <div className="loha-footer-bottom"><span>© {new Date().getFullYear()} LOHA PMS.</span><span>Được xây dựng cho ngành hiếu khách.</span></div>
        </div>
      </footer>
    </div>
  );
}
