import React, { useState } from 'react';
import { ShieldCheck, KeyRound, Building, User, Globe, Save, CheckCircle2 } from 'lucide-react';
import PasskeyModal from '../components/PasskeyModal';

export default function SettingsPage({ user, lang, onChangeLang }) {
  const [hotelName, setHotelName] = useState('HMS Hotel Resort & Spa');
  const [taxCode, setTaxCode] = useState('0106889412');
  const [address, setAddress] = useState('Tầng 3, Tòa nhà Machinco, 444 Hoàng Hoa Thám, Ba Đình, Hà Nội');
  const [passkeyRegistered, setPasskeyRegistered] = useState(true);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="ez-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>Cấu Hình Hệ Thống PMS & Tài Khoản HMS ID</h2>
        <p style={{ fontSize: '13px', color: 'var(--ez-text-muted)' }}>Quản lý thông tin doanh nghiệp, sinh trắc học Passkey và bảo mật phiên đăng nhập</p>
      </div>

      {savedSuccess && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '10px', color: '#047857', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} /> Đã lưu cấu hình hệ thống thành công!
        </div>
      )}

      {/* Security Passkey Card */}
      <div className="ez-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <KeyRound size={22} color="var(--ez-primary)" />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Xác thực không mật khẩu (Passkey)</h3>
              <p style={{ fontSize: '12px', color: 'var(--ez-text-muted)' }}>Đăng nhập bằng Vân tay / FaceID trên iPhone, Android hoặc Windows Hello</p>
            </div>
          </div>
          <span className={`badge ${passkeyRegistered ? 'badge-success' : 'badge-amber'}`}>
            {passkeyRegistered ? 'Đã kích hoạt' : 'Chưa đăng ký'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button" 
            className="btn btn-outline"
            onClick={() => setShowPasskeyModal(true)}
          >
            Đăng ký Khóa Passkey Mới
          </button>
        </div>
      </div>

      {/* Hotel Property Form */}
      <form onSubmit={handleSave} className="ez-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building size={18} color="var(--ez-primary)" /> Thông Tin Doanh Nghiệp & Khách Sạn
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Tên cơ sở kinh doanh</label>
            <input 
              type="text" 
              className="form-input" 
              value={hotelName} 
              onChange={(e) => setHotelName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mã số thuế (MST)</label>
            <input 
              type="text" 
              className="form-input" 
              value={taxCode} 
              onChange={(e) => setTaxCode(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Địa chỉ trụ sở</label>
            <input 
              type="text" 
              className="form-input" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ngôn ngữ hiển thị hệ thống</label>
            <select 
              className="form-input"
              value={lang}
              onChange={(e) => onChangeLang(e.target.value)}
            >
              <option value="vi">Tiếng Việt (Mặc định)</option>
              <option value="en">English (US)</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary">
            <Save size={16} /> Lưu Thay Đổi
          </button>
        </div>
      </form>

      <PasskeyModal 
        isOpen={showPasskeyModal}
        onClose={() => setShowPasskeyModal(false)}
        onPasskeySuccess={() => {
          setPasskeyRegistered(true);
          setShowPasskeyModal(false);
        }}
      />
    </div>
  );
}
