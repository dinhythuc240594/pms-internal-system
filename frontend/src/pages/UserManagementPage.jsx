import React, { useState } from 'react';
import { Users, UserPlus, Search, Edit3, Trash2, ShieldCheck, Key, Lock, CheckCircle2, XCircle, Sparkles, Filter } from 'lucide-react';
import { ALL_PERMISSIONS, ROLE_LABELS, ROLES } from '../mockData/usersData';
import UserModal from '../components/UserModal';

export default function UserManagementPage({ users, onSaveUser, onDeleteUser, currentUser, onSwitchUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const currentUserRole = currentUser ? currentUser.role : ROLES.ADMIN_MANAGER;

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner Header */}
      <div className="ez-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              background: 'linear-gradient(135deg, #1b49a6 0%, #0284c7 100%)', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Users size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Quản Lý Người Dùng & Phân Quyền Hệ Thống</h2>
              <p style={{ fontSize: '13px', color: 'var(--ez-text-muted)' }}>
                Phân quyền 3 cấp độ: Admin System (Dev) | Admin Manager (Quản lý) | User (Nhân viên)
              </p>
            </div>
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <UserPlus size={18} />
          <span>Thêm Người Dùng Mới</span>
        </button>
      </div>

      {/* Role Level Cards Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div className="ez-card" style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-amber">Cấp 1: Admin System</span>
            <span style={{ fontWeight: 800, fontSize: '18px' }}>
              {users.filter(u => u.role === ROLES.ADMIN_SYSTEM).length} User
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--ez-text-muted)', marginTop: '6px' }}>
            Toàn quyền Root/Dev, xem logs hệ thống & cấu hình nâng cao.
          </p>
        </div>

        <div className="ez-card" style={{ padding: '16px', borderLeft: '4px solid #1b49a6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-primary">Cấp 2: Admin Manager</span>
            <span style={{ fontWeight: 800, fontSize: '18px' }}>
              {users.filter(u => u.role === ROLES.ADMIN_MANAGER).length} User
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--ez-text-muted)', marginTop: '6px' }}>
            Quản lý tài khoản, thêm/sửa/xóa user và cấp quyền sử dụng.
          </p>
        </div>

        <div className="ez-card" style={{ padding: '16px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-secondary">Cấp 3: User (Nhân viên)</span>
            <span style={{ fontWeight: 800, fontSize: '18px' }}>
              {users.filter(u => u.role === ROLES.USER).length} User
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--ez-text-muted)', marginTop: '6px' }}>
            Chỉ được truy cập các tab & tính năng do Manager tích chọn.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="ez-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn ${filterRole === 'all' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => setFilterRole('all')}
          >
            Tất cả ({users.length})
          </button>
          <button 
            className={`btn ${filterRole === ROLES.ADMIN_SYSTEM ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => setFilterRole(ROLES.ADMIN_SYSTEM)}
          >
            Admin System
          </button>
          <button 
            className={`btn ${filterRole === ROLES.ADMIN_MANAGER ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => setFilterRole(ROLES.ADMIN_MANAGER)}
          >
            Admin Manager
          </button>
          <button 
            className={`btn ${filterRole === ROLES.USER ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => setFilterRole(ROLES.USER)}
          >
            User (Nhân viên)
          </button>
        </div>

        <div className="input-wrapper" style={{ width: '280px' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Tìm theo tên hoặc email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={16} className="input-icon-right" style={{ color: 'var(--ez-text-muted)' }} />
        </div>
      </div>

      {/* User Table */}
      <div className="ez-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--ez-bg-subtle)', borderBottom: '1px solid var(--ez-border)', color: 'var(--ez-text-muted)' }}>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>Tài Khoản / Email</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>Vai Trò (Role)</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>Quyền Hạn Được Cấp</th>
              <th style={{ padding: '14px 16px', fontWeight: 700 }}>Trạng Thái</th>
              <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--ez-text-muted)' }}>
                  Không tìm thấy người dùng nào phù hợp.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const roleMeta = ROLE_LABELS[user.role] || ROLE_LABELS.user;
                const isCurrentLoggedIn = currentUser && currentUser.email === user.email;

                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--ez-border)' }}>
                    {/* User info */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '50%', 
                          background: user.avatarBg || '#1b49a6', 
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '14px'
                        }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--ez-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {user.name}
                            {isCurrentLoggedIn && <span className="badge badge-success" style={{ fontSize: '9px' }}>Đang đăng nhập</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--ez-text-muted)' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${roleMeta.badgeClass}`}>
                        {roleMeta.label}
                      </span>
                    </td>

                    {/* Permissions List Badges */}
                    <td style={{ padding: '14px 16px', maxWidth: '340px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {user.role === ROLES.ADMIN_SYSTEM ? (
                          <span className="badge badge-amber" style={{ fontSize: '10px' }}>⚡ Toàn quyền Root</span>
                        ) : (
                          user.permissions && user.permissions.map(pId => {
                            const pObj = ALL_PERMISSIONS.find(ap => ap.id === pId);
                            return (
                              <span key={pId} style={{ 
                                fontSize: '10px', 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                background: 'var(--ez-bg-subtle)', 
                                border: '1px solid var(--ez-border)',
                                color: 'var(--ez-text-main)' 
                              }}>
                                {pObj ? pObj.label.split(' ')[0] : pId}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-amber'}`}>
                        {user.status === 'active' ? 'Hoạt động' : 'Tạm khóa'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {/* Quick switch account button */}
                        <button 
                          className="btn btn-outline" 
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          title="Đăng nhập thử tài khoản này"
                          onClick={() => onSwitchUser(user)}
                        >
                          <Sparkles size={13} color="var(--ez-primary)" /> Switch User
                        </button>

                        {/* Edit User */}
                        <button 
                          className="login-icon-btn"
                          title="Sửa thông tin & Phân quyền"
                          onClick={() => handleOpenEditModal(user)}
                        >
                          <Edit3 size={15} color="var(--ez-primary)" />
                        </button>

                        {/* Delete User */}
                        {user.role !== ROLES.ADMIN_SYSTEM && (
                          <button 
                            className="login-icon-btn"
                            title="Xóa người dùng"
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc chắn muốn xóa user ${user.name} (${user.email})?`)) {
                                onDeleteUser(user.id);
                              }
                            }}
                          >
                            <Trash2 size={15} color="#ef4444" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* User Modal */}
      <UserModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSaveUser={onSaveUser}
        editingUser={editingUser}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
