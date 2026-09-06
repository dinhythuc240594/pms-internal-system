import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Globe, ChevronDown, Building2, HelpCircle } from 'lucide-react';
import PasskeyModal from '../components/PasskeyModal';

export default function LoginPage({ onLogin, lang, onChangeLang }) {
  const [email, setEmail] = useState('nguyendung150000@gmail.com');
  const [password, setPassword] = useState('Pd271127@');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return alert('Vui lòng nhập đầy đủ Email và Mật khẩu!');
    onLogin({ email });
  };

  return (
    <div className="login-page-bg">
      {/* Top Header Logo */}
      <div style={{ width: '100%', maxWidth: '440px', paddingTop: '10px' }}>
        {/* Empty placeholder or small ezCloud watermark */}
      </div>

      {/* Center White Login Box (Match Image 1) */}
      <div className="login-card-container">
        {/* Brand Logo Header */}
        <div className="ezcloud-brand-header">
          <div className="ezcloud-logo-graphic">
            <div className="ezcloud-cloud-icon">
              <Building2 size={22} />
            </div>
            <div className="ezcloud-logo-text">
              HMS<span> System</span>
            </div>
          </div>
          <h2 className="login-title">Đăng nhập</h2>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-wrapper">
              <input 
                type="email" 
                className="form-input" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email của bạn"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Mật khẩu</label>
              <a 
                href="#forgot" 
                onClick={(e) => { e.preventDefault(); alert('Link đặt lại mật khẩu đã được gửi đến email ' + email); }}
                style={{ fontSize: '13px', color: 'var(--ez-primary)', fontWeight: 600, textDecoration: 'none' }}
              >
                Quên mật khẩu
              </a>
            </div>
            <div className="input-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                className="form-input" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
              />
              <button 
                type="button"
                className="input-icon-right"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="form-group" style={{ marginBottom: '22px' }}>
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                className="checkbox-input"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Nhớ đăng nhập</span>
            </label>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn btn-primary btn-block btn-lg"
            style={{ fontSize: '16px', borderRadius: '12px' }}
          >
            Đăng nhập
          </button>
        </form>

        {/* Or Divider */}
        <div className="or-divider">Hoặc</div>

        {/* Passkey Login Button (Match Image 1) */}
        <button 
          type="button" 
          className="btn btn-secondary btn-block btn-lg"
          onClick={() => setShowPasskeyModal(true)}
          style={{ 
            borderRadius: '12px', 
            fontWeight: 600, 
            fontSize: '14px',
            color: 'var(--ez-text-main)',
            border: '1px solid var(--ez-border)'
          }}
        >
          <KeyRound size={18} color="var(--ez-primary)" />
          <span>Đăng nhập bằng Passkey</span>
        </button>

        {/* Register Link */}
        <div className="login-footer-links">
          <span>Chưa có tài khoản? </span>
          <a href="#register" onClick={(e) => { e.preventDefault(); alert('Chuyển hướng đến trang Đăng ký doanh nghiệp HMS'); }}>
            Đăng ký
          </a>
        </div>
      </div>

      {/* Bottom Footer Info (Match Image 1) */}
      <div className="login-bottom-info">
        {/* Language Picker */}
        <div style={{ position: 'relative' }}>
          <div 
            className="lang-selector"
            onClick={() => setShowLangMenu(!showLangMenu)}
          >
            <Globe size={15} />
            <span>{lang === 'vi' ? 'Tiếng Việt' : 'English'}</span>
            <ChevronDown size={14} />
          </div>

          {showLangMenu && (
            <div className="ez-card" style={{ 
              position: 'absolute', 
              bottom: '36px', 
              left: 0, 
              width: '130px', 
              padding: '4px',
              zIndex: 100,
              background: '#ffffff',
              color: 'var(--ez-text-main)'
            }}>
              <div 
                onClick={() => { onChangeLang('vi'); setShowLangMenu(false); }}
                style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '4px', cursor: 'pointer', background: lang === 'vi' ? 'var(--ez-primary-light)' : 'transparent', fontWeight: lang === 'vi' ? 700 : 400 }}
              >
                🇻🇳 Tiếng Việt
              </div>
              <div 
                onClick={() => { onChangeLang('en'); setShowLangMenu(false); }}
                style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '4px', cursor: 'pointer', background: lang === 'en' ? 'var(--ez-primary-light)' : 'transparent', fontWeight: lang === 'en' ? 700 : 400 }}
              >
                🇺🇸 English
              </div>
            </div>
          )}
        </div>

        {/* Support & Terms Links */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <a 
            href="#help" 
            onClick={(e) => { e.preventDefault(); alert('Trợ giúp HMS ID: Hotline 1900 6159'); }}
            style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}
          >
            Trợ giúp
          </a>
          <span>-</span>
          <a 
            href="#terms" 
            onClick={(e) => { e.preventDefault(); alert('Điều khoản sử dụng hệ thống HMS ID'); }}
            style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}
          >
            Điều khoản sử dụng
          </a>
        </div>
      </div>

      {/* Passkey Simulation Modal */}
      <PasskeyModal 
        isOpen={showPasskeyModal} 
        onClose={() => setShowPasskeyModal(false)}
        onPasskeySuccess={() => {
          setShowPasskeyModal(false);
          onLogin({ email: 'passkey.user@hms.vn' });
        }}
      />
    </div>
  );
}
