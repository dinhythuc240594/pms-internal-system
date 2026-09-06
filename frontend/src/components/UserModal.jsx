import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, UserCheck, Key, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { ALL_PERMISSIONS, ROLE_LABELS, ROLES } from '../mockData/usersData';

export default function UserModal({ isOpen, onClose, onSaveUser, editingUser, currentUserRole }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLES.USER);
  const [status, setStatus] = useState('active');
  const [selectedPermissions, setSelectedPermissions] = useState(['dashboard', 'matrix']);

  useEffect(() => {
    if (editingUser) {
      setName(editingUser.name || '');
      setEmail(editingUser.email || '');
      setRole(editingUser.role || ROLES.USER);
      setStatus(editingUser.status || 'active');
      setSelectedPermissions(editingUser.permissions || ['dashboard', 'matrix']);
    } else {
      setName('');
      setEmail('');
      setRole(ROLES.USER);
      setStatus('active');
      setSelectedPermissions(['dashboard', 'matrix']);
    }
  }, [editingUser, isOpen]);

  if (!isOpen) return null;

  // When role changes to admin_system, auto select all
  const handleRoleChange = (newRole) => {
    setRole(newRole);
    if (newRole === ROLES.ADMIN_SYSTEM) {
      setSelectedPermissions(ALL_PERMISSIONS.map(p => p.id));
    } else if (newRole === ROLES.ADMIN_MANAGER) {
      setSelectedPermissions(ALL_PERMISSIONS.filter(p => p.id !== 'system_logs').map(p => p.id));
    }
  };

  const togglePermission = (permId) => {
    if (role === ROLES.ADMIN_SYSTEM && permId === 'system_logs') {
      return; // Locked for system admin
    }
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter(id => id !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const handleSelectAll = () => {
    const availablePerms = role === ROLES.ADMIN_MANAGER 
      ? ALL_PERMISSIONS.filter(p => p.id !== 'system_logs').map(p => p.id)
      : ALL_PERMISSIONS.map(p => p.id);
    setSelectedPermissions(availablePerms);
  };

  const handleClearAll = () => {
    setSelectedPermissions(['dashboard']); // Always keep dashboard at minimum
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !name) {
      return alert('Vui lòng điền đầy đủ Email và Họ tên!');
    }

    onSaveUser({
      id: editingUser ? editingUser.id : `usr-${Date.now()}`,
      name,
      email,
      role,
      status,
      avatarBg: editingUser ? editingUser.avatarBg : (role === ROLES.ADMIN_SYSTEM ? '#f59e0b' : role === ROLES.ADMIN_MANAGER ? '#1b49a6' : '#0284c7'),
      permissions: role === ROLES.ADMIN_SYSTEM ? ALL_PERMISSIONS.map(p => p.id) : selectedPermissions
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '680px', width: '90%' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '10px', 
              background: 'var(--ez-primary-light)', 
              color: 'var(--ez-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
                {editingUser ? 'Cập Nhật Người Dùng & Phân Quyền' : 'Thêm Người Dùng Mới'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--ez-text-muted)' }}>
                Hệ thống phân quyền truy cập 3 cấp độ (Admin System, Admin Manager, User)
              </p>
            </div>
          </div>
          <button className="login-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* User basic info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Họ và Tên (*)</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Đăng Nhập (*)</label>
                <input 
                  type="email" 
                  className="form-input"
                  placeholder="user@hms.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vai Trò Hệ Thống (Role)</label>
                <select 
                  className="form-input"
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  {currentUserRole === ROLES.ADMIN_SYSTEM && (
                    <option value={ROLES.ADMIN_SYSTEM}>Admin System (Dev - Toàn quyền Root)</option>
                  )}
                  <option value={ROLES.ADMIN_MANAGER}>Admin Manager (Quản lý user & Phân quyền)</option>
                  <option value={ROLES.USER}>User (Nhân viên - Giới hạn theo phân quyền)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Trạng Thái Tài Khoản</label>
                <select 
                  className="form-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">🟢 Đang hoạt động (Active)</option>
                  <option value="inactive">🔴 Tạm khóa (Inactive)</option>
                </select>
              </div>
            </div>

            {/* Role Notice Banner */}
            {role === ROLES.ADMIN_SYSTEM && (
              <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', color: '#b45309', fontSize: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} />
                <span><strong>Admin System (Dev):</strong> Tự động được cấp toàn bộ quyền truy cập và công cụ Developer.</span>
              </div>
            )}

            {/* Permissions Section */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ez-text-main)' }}>
                    Cấp Quyền Sử Dụng Chức Năng (Feature Permissions)
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--ez-text-muted)' }}>
                    Tích chọn các chức năng/tab mà tài khoản này được phép truy cập
                  </p>
                </div>
                {role !== ROLES.ADMIN_SYSTEM && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-outline" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={handleSelectAll}>
                      Chọn tất cả
                    </button>
                    <button type="button" className="btn btn-outline" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={handleClearAll}>
                      Bỏ chọn
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {ALL_PERMISSIONS.map((perm) => {
                  const isChecked = role === ROLES.ADMIN_SYSTEM || selectedPermissions.includes(perm.id);
                  const isDevOnly = perm.id === 'system_logs';
                  const isDisabled = role === ROLES.ADMIN_SYSTEM || (isDevOnly && currentUserRole !== ROLES.ADMIN_SYSTEM);

                  return (
                    <div 
                      key={perm.id}
                      onClick={() => !isDisabled && togglePermission(perm.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${isChecked ? 'var(--ez-primary)' : 'var(--ez-border)'}`,
                        background: isChecked ? 'var(--ez-primary-light)' : '#ffffff',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled && !isChecked ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ marginTop: '2px', color: isChecked ? 'var(--ez-primary)' : 'var(--ez-text-muted)' }}>
                        {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ez-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {perm.label}
                          {isDevOnly && <span className="badge badge-amber" style={{ fontSize: '9px' }}>Dev Only</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--ez-text-muted)', marginTop: '2px' }}>
                          {perm.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary">
              <ShieldCheck size={16} /> {editingUser ? 'Lưu Phân Quyền' : 'Tạo Người Dùng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
