import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePms } from '../../data/usePms';
import { User, Mail, Phone, Lock, Save, Camera, Shield, LogOut, Receipt, Building2 } from 'lucide-react';

export default function Profile() {
  const { user, tenant, logout, changePassword } = usePms();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'security' ? 'security' : 'info'); // info, security, orders
  const [isEditing, setIsEditing] = useState(false);
  const [passwords,setPasswords] = useState({currentPassword:'',newPassword:'',confirm:''}),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  async function savePassword(){if(busy)return;setBusy(true);try{if(passwords.newPassword!==passwords.confirm)throw new Error('Mật khẩu xác nhận không khớp.');await changePassword({currentPassword:passwords.currentPassword,newPassword:passwords.newPassword});setPasswords({currentPassword:'',newPassword:'',confirm:''});setMessage('Đã đổi mật khẩu.');}catch(err){setMessage(err.message);}finally{setBusy(false);}}

  const btnStyle = (bg, color) => ({
    padding: '10px 20px',
    borderRadius: '4px',
    border: '1px solid ' + (bg === '#fff' ? '#cbd5e1' : bg),
    fontWeight: 'bold',
    cursor: 'pointer',
    backgroundColor: bg,
    color: color,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  });

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#fff',
    fontSize: '14px',
    outline: 'none',
    color: '#0f172a'
  };

  const tabStyle = (isActive) => ({
    padding: '14px 24px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '15px',
    color: isActive ? '#4f46e5' : '#64748b',
    borderBottom: isActive ? '2px solid #4f46e5' : '2px solid transparent',
    marginBottom: '-1px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  });

  return (
    <div className="pms-original pms-profile" style={{ padding: '32px', width: '100%', margin: '0 auto', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>Hồ sơ cá nhân</h1>
          <p style={{ color: '#64748b', marginTop: '6px', fontSize: '15px', fontWeight: '500' }}>{tenant?.name} · {user?.name}</p>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        
        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 16px' }}>
          <button style={tabStyle(activeTab === 'info')} onClick={() => setActiveTab('info')}>
            <Building2 size={18} /> Thông tin cá nhân
          </button>
          <button style={tabStyle(activeTab === 'security')} onClick={() => setActiveTab('security')}>
            <Shield size={18} /> Đổi mật khẩu
          </button>
          <button style={tabStyle(activeTab === 'orders')} onClick={() => setActiveTab('orders')}>
            <Receipt size={18} /> Danh sách đơn hàng
          </button>
        </div>

        <div style={{ padding: '32px' }}>
          
          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          {activeTab === 'info' && (
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button 
                  disabled title="Sửa hồ sơ cá nhân chưa được triển khai" onClick={() => setIsEditing(!isEditing)}
                  style={btnStyle(isEditing ? '#f1f5f9' : '#3b82f6', isEditing ? '#475569' : '#fff')}
                >
                  {isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa hồ sơ'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Họ (*)</label>
                  <input 
                    type="text" 
                    defaultValue={user?.name.split(' ').slice(0, -1).join(' ') || ''}
                    disabled={!isEditing}
                    style={{ ...inputStyle, backgroundColor: isEditing ? '#fff' : '#f8fafc' }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Tên (*)</label>
                  <input 
                    type="text" 
                    defaultValue={user?.name.split(' ').slice(-1).join(' ') || ''}
                    disabled={!isEditing}
                    style={{ ...inputStyle, backgroundColor: isEditing ? '#fff' : '#f8fafc' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Email (*)</label>
                  <input 
                    type="email" 
                    defaultValue={user?.email}
                    disabled={true} /* Typically email is read-only or requires special verification */
                    style={{ ...inputStyle, backgroundColor: '#f1f5f9', color: '#94a3b8' }}
                  />
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Email không thể thay đổi trực tiếp. Vui lòng liên hệ CSKH.</p>
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button 
                  style={{ ...btnStyle('#10b981', '#fff'), opacity: isEditing ? 1 : 0.5, cursor: isEditing ? 'pointer' : 'not-allowed' }}
                  disabled={!isEditing}
                >
                  <Save size={18} /> Lưu thay đổi
                </button>
                
                <button onClick={() => logout().catch(() => {})} style={btnStyle('#fef2f2', '#ef4444')}>
                  <LogOut size={18} /> Đăng xuất phiên hiện tại
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ĐỔI MẬT KHẨU */}
          {activeTab === 'security' && (
            <div style={{ width: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>Mật khẩu hiện tại</label>
                  <input type="password" aria-label="Mật khẩu hiện tại" value={passwords.currentPassword} onChange={e=>setPasswords(p=>({...p,currentPassword:e.target.value}))} autoComplete="current-password" placeholder="Nhập mật khẩu hiện tại" style={inputStyle} />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>Mật khẩu mới</label>
                  <input type="password" minLength={12} aria-label="Mật khẩu mới" value={passwords.newPassword} onChange={e=>setPasswords(p=>({...p,newPassword:e.target.value}))} autoComplete="new-password" placeholder="Mật khẩu mới" style={inputStyle} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>Xác nhận mật khẩu mới</label>
                  <input type="password" aria-label="Xác nhận mật khẩu mới" value={passwords.confirm} onChange={e=>setPasswords(p=>({...p,confirm:e.target.value}))} autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" style={inputStyle} />
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                {message && <p role="status">{message}</p>}<button disabled={busy} onClick={savePassword} style={btnStyle('#0f172a', '#fff')}>
                  <Shield size={18} /> Cập nhật mật khẩu
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DANH SÁCH ĐƠN HÀNG */}
          {activeTab === 'orders' && (
            <div>
              <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <Receipt size={48} color="#94a3b8" style={{ margin: '0 auto 16px auto' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#475569', margin: '0 0 8px 0' }}>Chưa có đơn hàng nào</h3>
                <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Lịch sử giao dịch mua gói phần mềm của bạn sẽ hiển thị tại đây.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
