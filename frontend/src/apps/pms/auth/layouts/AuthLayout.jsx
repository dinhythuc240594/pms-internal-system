import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft, BedDouble } from 'lucide-react';
import LohaBrand from '../../../../shared/components/LohaBrand';
import './AuthLayout.css';

export default function AuthLayout() {
  return (
    <div className="loha-home loha-auth">
      <aside className="loha-auth-aside" aria-label="LOHA">
        <div className="loha-auth-brand-row">
          <LohaBrand />
          <Link className="loha-auth-back" to="/"><ArrowLeft size={15} aria-hidden="true" />Về trang chủ</Link>
        </div>
        <div className="loha-auth-story">
          <span className="loha-auth-kicker">DÀNH CHỖ CHO SỰ HIẾU KHÁCH</span>
          <p className="loha-auth-story-title">Vận hành gọn.<br />Đón khách<br /><em>trọn vẹn.</em></p>
          <p className="loha-auth-story-copy">Phòng, đặt chỗ và thanh toán về cùng một không gian. Để đội ngũ của bạn có thêm thời gian dành cho mỗi vị khách.</p>
          <div className="loha-auth-photo">
            <img src="https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1000&q=80" alt="Không gian lưu trú thoáng mở bên cây xanh" width="1000" height="750" />
            <div><span>LOHA PMS SYSTEM</span>Phần mềm đứng sau. Trải nghiệm ở phía trước.</div>
          </div>
        </div>
        <p className="loha-auth-aside-footer"><BedDouble size={18} aria-hidden="true" />Được xây dựng cho những người làm khách sạn mỗi ngày.</p>
      </aside>
      <main className="loha-auth-panel">
        <div className="loha-auth-form-wrap"><Outlet /></div>
        <footer className="loha-auth-panel-footer">
          <span>© {new Date().getFullYear()} LOHA PMS.</span>
          <nav aria-label="Thông tin LOHA"><Link to="/pricing">Bảng giá</Link><Link to="/contact">Liên hệ</Link></nav>
        </footer>
      </main>
    </div>
  );
}
