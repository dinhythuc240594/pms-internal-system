export const ROLES = {
  ADMIN_SYSTEM: 'admin_system', // Dev level (Full root permissions)
  ADMIN_MANAGER: 'admin_manager', // Manager level (CRUD user, assign permissions)
  USER: 'user' // Staff level (Granted specific permissions by manager)
};

export const ROLE_LABELS = {
  admin_system: { label: 'Admin System (Dev)', badgeClass: 'badge-amber', color: '#f59e0b' },
  admin_manager: { label: 'Admin Manager', badgeClass: 'badge-primary', color: '#1b49a6' },
  user: { label: 'Nhân viên (User)', badgeClass: 'badge-secondary', color: '#64748b' }
};

export const ALL_PERMISSIONS = [
  { id: 'dashboard', label: 'Trang Tổng Quan (Dashboard)', desc: 'Xem thống kê doanh thu, tỷ lệ lấp đầy, thông tin phòng' },
  { id: 'matrix', label: 'Sơ Đồ Phòng (Room Matrix)', desc: 'Xem trang trí phòng, nhận/trả phòng, đổi trạng thái phòng' },
  { id: 'pos', label: 'Điểm Bán Hàng ezPos', desc: 'Tạo đơn hàng dịch vụ nhà hàng, spa, mini bar' },
  { id: 'cms', label: 'Quản Lý Kênh ezCms', desc: 'Đồng bộ kết nối OTA Booking.com, Agoda, Traveloka' },
  { id: 'invoice', label: 'Hóa Đơn & Thanh Toán', desc: 'Quản lý hóa đơn xuất kho, thanh toán khách hàng' },
  { id: 'users', label: 'Quản Lý Người Dùng', desc: 'Thêm, sửa, xóa user và phân quyền sử dụng hệ thống' },
  { id: 'settings', label: 'Cấu Hình Hệ Thống', desc: 'Cấu hình thông tin doanh nghiệp, Passkey, kết nối' },
  { id: 'system_logs', label: 'Dev System Logs', desc: 'Xem nhật ký hệ thống, console debug dành riêng cho Dev' }
];

export const initialUsers = [
  {
    id: 'usr-1',
    email: 'dev.admin@hms.vn',
    name: 'Nguyễn Văn Dev',
    role: 'admin_system',
    status: 'active',
    avatarBg: '#f59e0b',
    permissions: ['dashboard', 'matrix', 'pos', 'cms', 'invoice', 'users', 'settings', 'system_logs']
  },
  {
    id: 'usr-2',
    email: 'manager.admin@hms.vn',
    name: 'Trần Thị Quản Lý',
    role: 'admin_manager',
    status: 'active',
    avatarBg: '#1b49a6',
    permissions: ['dashboard', 'matrix', 'pos', 'cms', 'invoice', 'users', 'settings']
  },
  {
    id: 'usr-3',
    email: 'staff.user@hms.vn',
    name: 'Lê Văn Nhân Viên',
    role: 'user',
    status: 'active',
    avatarBg: '#0284c7',
    permissions: ['dashboard', 'matrix']
  }
];
