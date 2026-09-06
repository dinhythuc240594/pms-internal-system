import React, { useState } from 'react';
import LoginPage from './pages/LoginPage';
import PortalPage from './pages/PortalPage';
import PMSDashboardPage from './pages/PMSDashboardPage';
import RoomMatrixPage from './pages/RoomMatrixPage';
import PosPage from './pages/PosPage';
import ChannelManagerPage from './pages/ChannelManagerPage';
import SettingsPage from './pages/SettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import DevSystemPage from './pages/DevSystemPage';
import AccessDeniedCard from './components/AccessDeniedCard';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AppSwitcherModal from './components/AppSwitcherModal';
import BookingModal from './components/BookingModal';
import { mockRooms as initialRooms } from './mockData/roomsData';
import { initialUsers, ROLES } from './mockData/usersData';

export default function App() {
  const [users, setUsers] = useState(initialUsers);
  // Default logged in user (starts with Dev Admin user for demo)
  const [user, setUser] = useState(initialUsers[0]); // null = show LoginPage
  const [currentApp, setCurrentApp] = useState('portal'); // 'portal' | 'ezCloudhotel' | 'ezPos' | 'ezCms' | etc.
  const [currentTab, setCurrentTab] = useState('dashboard'); // 'dashboard' | 'matrix' | 'pos' | 'invoice' | 'cms' | 'users' | 'settings' | 'system_logs' | 'portal'
  const [lang, setLang] = useState('vi');
  const [rooms, setRooms] = useState(initialRooms);
  
  // Modals state
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Handle User Management CRUD
  const handleSaveUser = (userData) => {
    const existingIndex = users.findIndex(u => u.id === userData.id);
    if (existingIndex >= 0) {
      const updated = [...users];
      updated[existingIndex] = userData;
      setUsers(updated);
      // If updating current logged in user, refresh current user state
      if (user && user.id === userData.id) {
        setUser(userData);
      }
    } else {
      setUsers([...users, userData]);
    }
  };

  const handleDeleteUser = (userId) => {
    setUsers(users.filter(u => u.id !== userId));
  };

  const handleSwitchUser = (targetUser) => {
    setUser(targetUser);
    alert(`Đã chuyển phiên làm việc sang tài khoản: ${targetUser.name} (${targetUser.email}) - Role: ${targetUser.role.toUpperCase()}`);
  };

  // Handle Login
  const handleLogin = (userData) => {
    // Check if email matches existing mock users
    const matchedUser = users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (matchedUser) {
      setUser(matchedUser);
    } else {
      // Default new login as staff user
      setUser({
        id: `usr-${Date.now()}`,
        email: userData.email,
        name: userData.email.split('@')[0],
        role: ROLES.USER,
        status: 'active',
        avatarBg: '#0284c7',
        permissions: ['dashboard', 'matrix']
      });
    }
    setCurrentApp('portal'); // Go to portal page first after login
  };

  // Handle Logout
  const handleLogout = () => {
    setUser(null);
    setCurrentApp('portal');
  };

  // Handle App Selection from Portal or Switcher
  const handleSelectApp = (appId) => {
    setCurrentApp(appId);
    if (appId === 'portal') {
      setCurrentTab('portal');
    } else if (appId === 'ezPos') {
      setCurrentTab('pos');
    } else if (appId === 'ezCms') {
      setCurrentTab('cms');
    } else if (appId === 'ezInvoice') {
      setCurrentTab('invoice');
    } else if (appId === 'settings') {
      setCurrentTab('settings');
    } else if (appId === 'users') {
      setCurrentTab('users');
    } else {
      // Default PMS apps like ezCloudhotel, ezFolio
      setCurrentTab('dashboard');
    }
  };

  // Update room status
  const handleUpdateRoomStatus = (roomId, newStatus, newCleanStatus) => {
    setRooms(rooms.map(r => r.id === roomId ? { 
      ...r, 
      status: newStatus, 
      cleanStatus: newCleanStatus || r.cleanStatus,
      guest: newStatus === 'available' ? null : r.guest,
      checkIn: newStatus === 'available' ? null : r.checkIn,
      checkOut: newStatus === 'available' ? null : r.checkOut
    } : r));
  };

  // Check out guest
  const handleCheckOut = (roomId) => {
    const targetRoom = rooms.find(r => r.id === roomId);
    if (targetRoom) {
      alert(`Đã hoàn tất thủ tục Check-out cho phòng ${targetRoom.number} (${targetRoom.guest}). Trạng thái phòng chuyển thành BẨN (Cần dọn).`);
      handleUpdateRoomStatus(roomId, 'dirty', 'dirty');
    }
  };

  // Add new booking / quick check-in
  const handleAddBooking = (bookingData) => {
    setRooms(rooms.map(r => r.number === bookingData.roomNumber ? {
      ...r,
      status: 'occupied',
      cleanStatus: 'clean',
      guest: bookingData.guestName,
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut
    } : r));
    alert(`Xác nhận Check-in thành công cho khách ${bookingData.guestName} tại phòng ${bookingData.roomNumber}!`);
  };

  // Permission Guard Helper
  const hasTabPermission = (tabId) => {
    if (!user) return false;
    if (user.role === ROLES.ADMIN_SYSTEM) return true;
    if (tabId === 'users') {
      return user.role === ROLES.ADMIN_MANAGER || (user.permissions && user.permissions.includes('users'));
    }
    if (tabId === 'system_logs') {
      return user.role === ROLES.ADMIN_SYSTEM;
    }
    return user.permissions && user.permissions.includes(tabId);
  };

  // Tab Name Map for Access Denied Card
  const TAB_NAMES = {
    dashboard: 'Trang Tổng Quan',
    matrix: 'Sơ Đồ Phòng',
    pos: 'Điểm Bán Hàng ezPos',
    invoice: 'Hóa Đơn & Thanh Toán',
    cms: 'Quản Lý Kênh OTA',
    users: 'Quản Lý Người Dùng & Phân Quyền',
    settings: 'Cấu Hình Hệ Thống',
    system_logs: 'Dev System Logs'
  };

  // If user is not logged in, render LoginPage
  if (!user) {
    return (
      <LoginPage 
        onLogin={handleLogin}
        lang={lang}
        onChangeLang={setLang}
      />
    );
  }

  // If user chooses Portal Launcher
  if (currentApp === 'portal') {
    return (
      <>
        <PortalPage 
          user={user}
          onSelectApp={handleSelectApp}
          onLogout={handleLogout}
          lang={lang}
          onChangeLang={setLang}
          onOpenAppSwitcher={() => setShowAppSwitcher(true)}
        />
        <AppSwitcherModal 
          isOpen={showAppSwitcher}
          onClose={() => setShowAppSwitcher(false)}
          onSelectApp={handleSelectApp}
        />
      </>
    );
  }

  // Otherwise, render full PMS Application Layout with Header & Sidebar
  return (
    <div className="pms-layout">
      {/* Sidebar */}
      <Sidebar 
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'portal') handleSelectApp('portal');
          else setCurrentTab(tab);
        }}
        onOpenBookingModal={() => setShowBookingModal(true)}
        onOpenAppSwitcher={() => setShowAppSwitcher(true)}
        currentUser={user}
      />

      {/* Main Content Body */}
      <div className="pms-content-area">
        <Header 
          user={user}
          currentApp={currentApp}
          onSwitchApp={handleSelectApp}
          onLogout={handleLogout}
          lang={lang}
          onChangeLang={setLang}
          onOpenAppSwitcher={() => setShowAppSwitcher(true)}
          users={users}
          onSwitchUser={handleSwitchUser}
        />

        <div className="pms-page-body">
          {/* Permission Guarding Render */}
          {!hasTabPermission(currentTab) ? (
            <AccessDeniedCard 
              user={user}
              tabName={TAB_NAMES[currentTab] || currentTab}
              onGoDashboard={() => setCurrentTab('dashboard')}
              onGoUserManagement={() => setCurrentTab('users')}
            />
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <PMSDashboardPage 
                  onNavigateTab={setCurrentTab}
                  onOpenBookingModal={() => setShowBookingModal(true)}
                />
              )}

              {currentTab === 'matrix' && (
                <RoomMatrixPage 
                  rooms={rooms}
                  onUpdateRoomStatus={handleUpdateRoomStatus}
                  onCheckOut={handleCheckOut}
                  onAddBooking={handleAddBooking}
                />
              )}

              {currentTab === 'pos' && <PosPage />}

              {currentTab === 'invoice' && (
                <div className="ez-card" style={{ padding: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>ezInvoice™ Hóa Đơn Điện Tử</h2>
                  <p style={{ fontSize: '13px', color: 'var(--ez-text-muted)', marginBottom: '20px' }}>Lịch sử hóa đơn GTGT đã xuất cho khách lưu trú</p>
                  
                  <div style={{ border: '1px solid var(--ez-border)', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead style={{ background: 'var(--ez-bg-subtle)', fontWeight: 700 }}>
                        <tr>
                          <th style={{ padding: '12px 16px' }}>Mã HD</th>
                          <th style={{ padding: '12px 16px' }}>Phòng</th>
                          <th style={{ padding: '12px 16px' }}>Khách hàng</th>
                          <th style={{ padding: '12px 16px' }}>Số tiền (VNĐ)</th>
                          <th style={{ padding: '12px 16px' }}>Trạng thái</th>
                          <th style={{ padding: '12px 16px' }}>Ngày phát hành</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { id: 'HD-20260901', room: '102', guest: 'Nguyễn Văn An', amount: '2,550,000', status: 'Đã phát hành', date: '05/09/2026' },
                          { id: 'HD-20260902', room: '203', guest: 'Phạm Minh Tuấn', amount: '3,800,000', status: 'Đã phát hành', date: '06/09/2026' },
                          { id: 'HD-20260903', room: '304', guest: 'Hoàng Gia Bảo', amount: '17,500,000', status: 'Chờ ký số', date: '06/09/2026' }
                        ].map(row => (
                          <tr key={row.id} style={{ borderTop: '1px solid var(--ez-border)' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ez-primary)' }}>{row.id}</td>
                            <td style={{ padding: '12px 16px' }}>Phòng {row.room}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>{row.guest}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 800 }}>{row.amount} đ</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span className={`badge ${row.status === 'Đã phát hành' ? 'badge-success' : 'badge-amber'}`}>
                                {row.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--ez-text-muted)' }}>{row.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {currentTab === 'cms' && <ChannelManagerPage />}

              {currentTab === 'users' && (
                <UserManagementPage 
                  users={users}
                  onSaveUser={handleSaveUser}
                  onDeleteUser={handleDeleteUser}
                  currentUser={user}
                  onSwitchUser={handleSwitchUser}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsPage 
                  user={user}
                  lang={lang}
                  onChangeLang={setLang}
                />
              )}

              {currentTab === 'system_logs' && (
                <DevSystemPage user={user} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Global Modals */}
      <AppSwitcherModal 
        isOpen={showAppSwitcher}
        onClose={() => setShowAppSwitcher(false)}
        onSelectApp={handleSelectApp}
      />

      <BookingModal 
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onAddBooking={handleAddBooking}
      />
    </div>
  );
}
