import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Bell, 
  Globe, 
  ChevronDown, 
  LogOut, 
  ShieldCheck, 
  Sparkles,
  Grid,
  Users,
  Terminal,
  UserCheck
} from 'lucide-react';
import { ROLE_LABELS, ROLES } from '../mockData/usersData';

export default function Header({ 
  user, 
  onLogout, 
  onOpenAppSwitcher, 
  onSwitchApp, 
  lang, 
  onChangeLang,
  users = [],
  onSwitchUser
}) {
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const roleMeta = user ? (ROLE_LABELS[user.role] || ROLE_LABELS.user) : ROLE_LABELS.user;

  return (
    <header className="pms-header">
      {/* Search Input */}
      <div style={{ flex: 1, maxWidth: '360px' }}>
        <div className="input-wrapper">
          <input 
            type="text" 
            className="form-input" 
            placeholder="Tìm theo tên khách, số phòng, mã đặt phòng..."
            style={{ borderRadius: '20px', paddingLeft: '38px', background: 'var(--ez-bg-subtle)' }}
          />
          <Search size={16} className="input-icon-right" style={{ left: '12px', color: 'var(--ez-text-muted)' }} />
        </div>
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Role Badge in Header */}
        <div 
          onClick={() => onSwitchApp('users')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: 'var(--ez-bg-subtle)', 
            padding: '6px 12px', 
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid var(--ez-border)'
          }}
          title="Bấm để xem danh sách Quản lý người dùng & Phân quyền"
        >
          <UserCheck size={14} color={roleMeta.color} />
          <span>Role: <strong style={{ color: roleMeta.color }}>{roleMeta.label}</strong></span>
        </div>

        {/* Hotel Branch Badge */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          background: 'var(--ez-bg-subtle)', 
          padding: '6px 12px', 
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--ez-text-main)'
        }}>
          <Building2 size={16} color="var(--ez-primary)" />
          <span>HMS Resort & Spa (Chi nhánh Hà Nội)</span>
        </div>

        {/* Notifications */}
        <button className="login-icon-btn" style={{ position: 'relative' }}>
          <Bell size={18} />
          <span style={{ 
            position: 'absolute', 
            top: '4px', 
            right: '4px', 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: '#ef4444' 
          }} />
        </button>

        {/* Language Switcher */}
        <div style={{ position: 'relative' }}>
          <button 
            className="login-icon-btn" 
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', width: 'auto' }}
          >
            <Globe size={16} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{lang.toUpperCase()}</span>
            <ChevronDown size={12} />
          </button>

          {showLangDropdown && (
            <div className="ez-card" style={{ 
              position: 'absolute', 
              top: '44px', 
              right: 0, 
              width: '140px', 
              padding: '6px', 
              zIndex: 200,
              boxShadow: 'var(--shadow-md)'
            }}>
              <div 
                onClick={() => { onChangeLang('vi'); setShowLangDropdown(false); }}
                style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', background: lang === 'vi' ? 'var(--ez-primary-light)' : 'transparent', color: lang === 'vi' ? 'var(--ez-primary)' : 'inherit', fontWeight: lang === 'vi' ? 700 : 500 }}
              >
                🇻🇳 Tiếng Việt
              </div>
              <div 
                onClick={() => { onChangeLang('en'); setShowLangDropdown(false); }}
                style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', background: lang === 'en' ? 'var(--ez-primary-light)' : 'transparent', color: lang === 'en' ? 'var(--ez-primary)' : 'inherit', fontWeight: lang === 'en' ? 700 : 500 }}
              >
                🇺🇸 English
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div style={{ position: 'relative' }}>
          <div 
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px' }}
          >
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '50%', 
              background: user?.avatarBg || 'linear-gradient(135deg, #1b49a6 0%, #0284c7 100%)', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '14px'
            }}>
              {user ? (user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()) : 'N'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ez-text-main)', lineHeight: 1.2 }}>
                {user ? (user.name || user.email.split('@')[0]) : 'User'}
              </span>
              <span style={{ fontSize: '11px', color: roleMeta.color, fontWeight: 600 }}>
                {roleMeta.label}
              </span>
            </div>
            <ChevronDown size={14} color="var(--ez-text-muted)" />
          </div>

          {showUserDropdown && (
            <div className="ez-card" style={{ 
              position: 'absolute', 
              top: '48px', 
              right: 0, 
              width: '260px', 
              padding: '8px', 
              zIndex: 200,
              boxShadow: 'var(--shadow-lg)'
            }}>
              <div style={{ padding: '10px', borderBottom: '1px solid var(--ez-border)', marginBottom: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{user ? user.name : 'Người dùng'}</div>
                <div style={{ fontSize: '12px', color: 'var(--ez-text-muted)' }}>{user ? user.email : 'user@hms.vn'}</div>
                <div style={{ marginTop: '4px' }}>
                  <span className={`badge ${roleMeta.badgeClass}`}>{roleMeta.label}</span>
                </div>
              </div>

              {/* Quick Switch Demo User */}
              {users.length > 0 && (
                <div style={{ padding: '6px 10px', background: 'var(--ez-bg-subtle)', borderRadius: '6px', marginBottom: '6px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ez-text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={12} color="var(--ez-primary)" /> TEST CHUYỂN ROLE NHANH:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {users.map(u => (
                      <div 
                        key={u.id}
                        onClick={() => {
                          if (onSwitchUser) onSwitchUser(u);
                          setShowUserDropdown(false);
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          background: user?.email === u.email ? 'var(--ez-primary-light)' : 'white',
                          fontWeight: user?.email === u.email ? 700 : 500,
                          display: 'flex',
                          justify: 'space-between',
                          alignItems: 'center',
                          border: '1px solid var(--ez-border)'
                        }}
                      >
                        <span>{u.name}</span>
                        <span style={{ fontSize: '9px', color: ROLE_LABELS[u.role]?.color, fontWeight: 700 }}>
                          {u.role === ROLES.ADMIN_SYSTEM ? 'Dev' : u.role === ROLES.ADMIN_MANAGER ? 'Manager' : 'User'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div 
                onClick={() => { onSwitchApp('users'); setShowUserDropdown(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
              >
                <Users size={16} color="var(--ez-primary)" /> Quản Lý Người Dùng & Phân Quyền
              </div>

              <div 
                onClick={() => { onSwitchApp('settings'); setShowUserDropdown(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
              >
                <ShieldCheck size={16} color="var(--ez-primary)" /> Cấu hình Passkey & Hệ thống
              </div>

              <div 
                onClick={onLogout}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#ef4444', marginTop: '6px', borderTop: '1px solid var(--ez-border)' }}
              >
                <LogOut size={16} /> Đăng xuất hệ thống
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
