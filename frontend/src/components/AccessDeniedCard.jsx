import React from 'react';
import { Lock, ShieldAlert, ArrowLeft, Users } from 'lucide-react';
import { ROLE_LABELS } from '../mockData/usersData';

export default function AccessDeniedCard({ user, tabName, onGoDashboard, onGoUserManagement }) {
  const roleMeta = user ? (ROLE_LABELS[user.role] || ROLE_LABELS.user) : ROLE_LABELS.user;

  return (
    <div style={{ maxWidth: '640px', margin: '40px auto 0', textAlign: 'center' }}>
      <div className="ez-card" style={{ padding: '40px 32px' }}>
        <div style={{ 
          width: '72px', 
          height: '72px', 
          borderRadius: '50%', 
          background: 'rgba(239, 68, 68, 0.1)', 
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <ShieldAlert size={40} />
        </div>

        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ez-text-main)', marginBottom: '8px' }}>
          Không Có Quyền Truy Cập (Access Denied)
        </h3>

        <p style={{ fontSize: '14px', color: 'var(--ez-text-muted)', marginBottom: '20px', lineHeight: '1.6' }}>
          Tài khoản của bạn <strong>{user ? user.email : 'Nhân viên'}</strong> (Vai trò: <span className={`badge ${roleMeta.badgeClass}`}>{roleMeta.label}</span>) 
          chưa được cấp quyền sử dụng chức năng <strong>"{tabName}"</strong>.
        </p>

        <div style={{ padding: '14px', background: 'var(--ez-bg-subtle)', borderRadius: '10px', fontSize: '12px', color: 'var(--ez-text-muted)', marginBottom: '24px', textAlign: 'left' }}>
          💡 <strong>Hướng dẫn:</strong> Liên hệ với <strong>Admin Manager</strong> hoặc <strong>Admin System</strong> để tích chọn cấp quyền truy cập tính năng này trong màn hình <i>Quản lý người dùng & Phân quyền</i>.
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button className="btn btn-primary" onClick={onGoDashboard}>
            <ArrowLeft size={16} /> Quay Về Trang Tổng Quan
          </button>
          
          {(user?.role === 'admin_manager' || user?.role === 'admin_system') && (
            <button className="btn btn-outline" onClick={onGoUserManagement}>
              <Users size={16} /> Mở Trang Phân Quyền
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
