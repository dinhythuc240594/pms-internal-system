// =========================================================================
// MOCK DATA: PMS BACKOFFICE / INTERNAL ADMIN (SaaS Multi-Tenant HQ)
// Royal Blue & Indigo Design Theme - 2 Core Tiers (Free vs Pro + CMS)
// =========================================================================

export const INITIAL_STATS = {
  totalTenants: 128,
  tenantsGrowth: '+12.5%',
  mrr: 205000000, // 205M VND / month
  mrrGrowth: '+18.4%',
  activeUsers: 1420,
  usersGrowth: '+8.2%',
  pendingTenants: 4,
  clusterUptime: '99.98%',
  apiRequestsToday: '2,841,920 reqs',
};

export const REVENUE_CHART_DATA = [
  { month: 'T10/25', revenue: 145, tenants: 92, target: 140 },
  { month: 'T11/25', revenue: 160, tenants: 98, target: 155 },
  { month: 'T12/25', revenue: 175, tenants: 106, target: 170 },
  { month: 'T01/26', revenue: 188, tenants: 112, target: 180 },
  { month: 'T02/26', revenue: 195, tenants: 118, target: 190 },
  { month: 'T03/26', revenue: 205, tenants: 128, target: 200 },
];

export const PLAN_DISTRIBUTION_DATA = [
  { name: 'Chuyên Nghiệp (Pro + CMS)', value: 82, color: '#2870EA', percentage: '64%' },
  { name: 'Miễn Phí (Free Tier)', value: 46, color: '#94A3B8', percentage: '36%' },
];

export const INITIAL_TENANTS = [
  {
    id: 'TNT-1092',
    name: 'Grand Sunrise Luxury Resort Đà Nẵng',
    subdomain: 'sunrise-resort.pms.vn',
    customDomain: 'booking.sunriseresort.com',
    plan: 'Chuyên Nghiệp (Pro)',
    rooms: 240,
    contactName: 'Trần Văn Hoàng (GM)',
    contactEmail: 'gm@sunriseresort.com',
    contactPhone: '0905 123 456',
    status: 'Active',
    createdDate: '12/10/2025',
    lastActive: 'Vừa xong',
    mrr: '2,500,000 đ',
    city: 'Đà Nẵng'
  },
  {
    id: 'TNT-1088',
    name: 'Sài Gòn Pearl Boutique Hotel',
    subdomain: 'sgpearl.pms.vn',
    customDomain: 'hotel.saigonpearl.vn',
    plan: 'Chuyên Nghiệp (Pro)',
    rooms: 85,
    contactName: 'Nguyễn Thị Minh Thảo',
    contactEmail: 'thaonguyen@saigonpearl.vn',
    contactPhone: '0912 444 888',
    status: 'Active',
    createdDate: '05/11/2025',
    lastActive: '5 phút trước',
    mrr: '2,500,000 đ',
    city: 'Hồ Chí Minh'
  },
  {
    id: 'TNT-1085',
    name: 'Hanoi Emerald Suites & Spa',
    subdomain: 'emerald-hanoi.pms.vn',
    customDomain: 'res.emeraldhotel.vn',
    plan: 'Chuyên Nghiệp (Pro)',
    rooms: 110,
    contactName: 'Phạm Quốc Bảo',
    contactEmail: 'bao.pq@emeraldhotel.vn',
    contactPhone: '0983 777 222',
    status: 'Active',
    createdDate: '19/11/2025',
    lastActive: '12 phút trước',
    mrr: '2,500,000 đ',
    city: 'Hà Nội'
  },
  {
    id: 'TNT-1081',
    name: 'Phú Quốc Sunset Eco Glamping',
    subdomain: 'sunset-pq.pms.vn',
    customDomain: null,
    plan: 'Miễn Phí (Free)',
    rooms: 35,
    contactName: 'Lê Hoàng Nam',
    contactEmail: 'nam.le@sunsetpq.com',
    contactPhone: '0977 111 333',
    status: 'Active',
    createdDate: '02/12/2025',
    lastActive: '1 giờ trước',
    mrr: '0 đ',
    city: 'Kiên Giang'
  },
  {
    id: 'TNT-1077',
    name: 'Nha Trang Beachside Villa & Apartment',
    subdomain: 'nhatrang-beachside.pms.vn',
    customDomain: 'nhatrangvillas.com',
    plan: 'Chuyên Nghiệp (Pro)',
    rooms: 160,
    contactName: 'Vũ Đình Toàn',
    contactEmail: 'toan.vu@nhatrangvillas.com',
    contactPhone: '0903 888 999',
    status: 'Active',
    createdDate: '14/12/2025',
    lastActive: '3 phút trước',
    mrr: '2,500,000 đ',
    city: 'Khánh Hòa'
  },
  {
    id: 'TNT-1072',
    name: 'Đà Lạt Pine Mist Homestay Collection',
    subdomain: 'pinemist-dalat.pms.vn',
    customDomain: null,
    plan: 'Miễn Phí (Free)',
    rooms: 18,
    contactName: 'Hoàng Lan Anh',
    contactEmail: 'lananh.dalat@gmail.com',
    contactPhone: '0938 555 666',
    status: 'Active',
    createdDate: '28/12/2025',
    lastActive: '40 phút trước',
    mrr: '0 đ',
    city: 'Lâm Đồng'
  },
  {
    id: 'TNT-1065',
    name: 'Mekong Riverside Eco Lodge Cần Thơ',
    subdomain: 'mekonglodge.pms.vn',
    customDomain: null,
    plan: 'Chuyên Nghiệp (Pro)',
    rooms: 28,
    contactName: 'Đặng Hữu Tài',
    contactEmail: 'tai.dh@mekonglodge.com',
    contactPhone: '0918 999 000',
    status: 'Pending',
    createdDate: '08/01/2026',
    lastActive: 'Chờ duyệt hợp đồng',
    mrr: '2,500,000 đ',
    city: 'Cần Thơ'
  },
  {
    id: 'TNT-1050',
    name: 'Sapa Cloud Valley Ecolodge',
    subdomain: 'cloudvalley-sapa.pms.vn',
    customDomain: null,
    plan: 'Miễn Phí (Free)',
    rooms: 42,
    contactName: 'Lý A Thào',
    contactEmail: 'athao.sapa@gmail.com',
    contactPhone: '0945 678 123',
    status: 'Suspended',
    createdDate: '10/01/2026',
    lastActive: 'Khóa vi phạm điều khoản',
    mrr: '0 đ',
    city: 'Lào Cai'
  },
];

export const INITIAL_INVOICES = [
  {
    id: 'INV-2026-0091',
    hotelName: 'Grand Sunrise Luxury Resort Đà Nẵng',
    tenantId: 'TNT-1092',
    plan: 'Chuyên Nghiệp (Năm)',
    amount: 25000000,
    status: 'Paid',
    method: 'Chuyển khoản Vietcombank',
    issuedDate: '15/03/2026',
    dueDate: '25/03/2026',
  },
  {
    id: 'INV-2026-0090',
    hotelName: 'Sài Gòn Pearl Boutique Hotel',
    tenantId: 'TNT-1088',
    plan: 'Chuyên Nghiệp (Tháng)',
    amount: 2500000,
    status: 'Paid',
    method: 'Thẻ tín dụng Visa',
    issuedDate: '12/03/2026',
    dueDate: '22/03/2026',
  },
  {
    id: 'INV-2026-0089',
    hotelName: 'Hanoi Emerald Suites & Spa',
    tenantId: 'TNT-1085',
    plan: 'Chuyên Nghiệp (Tháng)',
    amount: 2500000,
    status: 'Paid',
    method: 'Cổng thanh toán OnePay',
    issuedDate: '10/03/2026',
    dueDate: '20/03/2026',
  },
  {
    id: 'INV-2026-0088',
    hotelName: 'Nha Trang Beachside Villa & Apartment',
    tenantId: 'TNT-1077',
    plan: 'Chuyên Nghiệp (Năm)',
    amount: 25000000,
    status: 'Paid',
    method: 'Chuyển khoản Techcombank',
    issuedDate: '01/03/2026',
    dueDate: '10/03/2026',
  },
  {
    id: 'INV-2026-0087',
    hotelName: 'Mekong Riverside Eco Lodge Cần Thơ',
    tenantId: 'TNT-1065',
    plan: 'Chuyên Nghiệp (Tháng)',
    amount: 2500000,
    status: 'Pending',
    method: 'Chuyển khoản QR',
    issuedDate: '16/03/2026',
    dueDate: '26/03/2026',
  },
];

export const INITIAL_FEATURES = [
  {
    id: 'feat-ota-sync',
    code: 'OTA_CHANNEL_MANAGER',
    name: '2-Way Channel Manager (OTA Sync CMS)',
    category: 'Tích hợp Kênh',
    description: 'Tự động đồng bộ tồn phòng và giá 2 chiều với Booking.com, Agoda, Traveloka, Airbnb theo thời gian thực (Độc quyền Gói Chuyên Nghiệp).',
    enabledGlobal: true,
    minPlan: 'Pro',
    tenantsActive: 82,
  },
  {
    id: 'feat-ai-pricing',
    code: 'AI_DYNAMIC_PRICING',
    name: 'AI Dynamic Pricing & Yield Management',
    category: 'AI & Tự động hóa',
    description: 'Tự động tính toán đề xuất giá bán tối ưu dựa trên nhu cầu thị trường, đối thủ cạnh tranh và thời tiết.',
    enabledGlobal: true,
    minPlan: 'Pro',
    tenantsActive: 38,
  },
  {
    id: 'feat-kiosk-checkin',
    code: 'KIOSK_SELF_CHECKIN',
    name: 'Kiosk Tự Phục vụ & Khóa Cửa Điện Tử SmartLock',
    category: 'Trải nghiệm Khách sạn',
    description: 'Hỗ trợ khách quét CCCD/Hộ chiếu tại kiosk lễ tân để tự in thẻ từ hoặc nhận mã PIN mở khóa phòng.',
    enabledGlobal: false,
    minPlan: 'Pro',
    tenantsActive: 14,
  },
  {
    id: 'feat-einvoice',
    code: 'EINVOICE_INTEGRATION',
    name: 'Tích hợp Hóa đơn Điện tử Thuế (E-Invoice)',
    category: 'Tài chính & Pháp lý',
    description: 'Xuất trực tiếp hóa đơn điện tử hợp lệ tới cơ quan Thuế qua cổng VNPT, Viettel, MInvoice.',
    enabledGlobal: true,
    minPlan: 'Pro',
    tenantsActive: 76,
  },
  {
    id: 'feat-multi-property',
    code: 'MULTI_PROPERTY_CHAIN',
    name: 'Chế độ chuỗi khách sạn (Multi-property)',
    category: 'Quản trị cốt lõi',
    description: 'Chuyển đổi linh hoạt giữa nhiều cơ sở khách sạn trong 1 giao diện duy nhất, báo cáo gộp toàn tập đoàn.',
    enabledGlobal: true,
    minPlan: 'Pro',
    tenantsActive: 28,
  },
  {
    id: 'feat-zns-marketing',
    code: 'ZALO_ZNS_SMS_MARKETING',
    name: 'Tự động gửi tin nhắn Zalo ZNS / SMS Brandname',
    category: 'Khách hàng & Marketing',
    description: 'Gửi tin xác nhận đặt phòng, hướng dẫn check-in và cảm ơn check-out tự động tới số điện thoại khách.',
    enabledGlobal: true,
    minPlan: 'Pro',
    tenantsActive: 80,
  },
  {
    id: 'feat-pos-fnb',
    code: 'POS_FNB_SPA',
    name: 'Điểm bán hàng Nhà hàng & Spa (POS F&B)',
    category: 'Mở rộng dịch vụ',
    description: 'Tích hợp order món ăn, đồ uống, dịch vụ massage spa gộp chung thanh toán vào hóa đơn phòng (Room Folio).',
    enabledGlobal: true,
    minPlan: 'Free',
    tenantsActive: 95,
  },
  {
    id: 'feat-open-api',
    code: 'CUSTOM_API_WEBHOOKS',
    name: 'Open API & Webhooks Tùy biến',
    category: 'Kỹ thuật & Mở rộng',
    description: 'Cung cấp API RESTful bảo mật cao để kết nối với hệ thống CRM, ERP, Kế toán MISA, Fast của doanh nghiệp.',
    enabledGlobal: true,
    minPlan: 'Pro',
    tenantsActive: 34,
  },
];

export const INITIAL_INTERNAL_USERS = [
  {
    id: 'USR-01',
    name: 'Võ Trần Quốc Việt',
    email: 'viet.vo@pmscloud.vn',
    role: 'Superadmin',
    department: 'Khối Điều Hành & Kỹ Thuật (HQ)',
    status: 'Active',
    twoFactor: true,
    lastLogin: '10 phút trước',
    avatarBg: '#2870EA'
  },
  {
    id: 'USR-02',
    name: 'Nguyễn Hoàng Nam',
    email: 'nam.nguyen@pmscloud.vn',
    role: 'Business Operations Staff',
    department: 'CSKH & Triển Khai Doanh Nghiệp',
    status: 'Active',
    twoFactor: true,
    lastLogin: '1 giờ trước',
    avatarBg: '#4E8CF7'
  },
  {
    id: 'USR-03',
    name: 'Trần Thị Mai',
    email: 'mai.tran@pmscloud.vn',
    role: 'Customer Support Lead',
    department: 'CSKH & Triển Khai Doanh Nghiệp',
    status: 'Active',
    twoFactor: false,
    lastLogin: 'Hôm qua',
    avatarBg: '#10B981'
  },
  {
    id: 'USR-04',
    name: 'Đặng Thanh Tùng',
    email: 'tung.dang@pmscloud.vn',
    role: 'Billing & Finance Officer',
    department: 'Tài Chính & Kế Toán Thu Cước',
    status: 'Active',
    twoFactor: true,
    lastLogin: '3 ngày trước',
    avatarBg: '#F59E0B'
  },
  {
    id: 'USR-05',
    name: 'Lê Minh Quân',
    email: 'quan.le@pmscloud.vn',
    role: 'DevOps & SRE Lead',
    department: 'Hạ Tầng & Bảo Mật K8s',
    status: 'Active',
    twoFactor: true,
    lastLogin: '5 phút trước',
    avatarBg: '#6366F1'
  },
];

export const ROLE_PERMISSIONS_MATRIX = [
  {
    module: 'Quản lý Khách sạn (Tenants)',
    permissions: [
      { name: 'Xem danh sách & hồ sơ khách sạn', roles: { Superadmin: true, 'Business Operations Staff': true, 'Customer Support Lead': true, 'Billing & Finance Officer': true, 'DevOps & SRE Lead': false } },
      { name: 'Tạo mới / Duyệt hồ sơ cơ sở lưu trú', roles: { Superadmin: true, 'Business Operations Staff': true, 'Customer Support Lead': false, 'Billing & Finance Officer': false, 'DevOps & SRE Lead': false } },
      { name: 'Khóa / Mở khóa tài khoản khách sạn', roles: { Superadmin: true, 'Business Operations Staff': true, 'Customer Support Lead': false, 'Billing & Finance Officer': false, 'DevOps & SRE Lead': false } },
      { name: 'Cấu hình ghi đè tính năng (Feature Overrides)', roles: { Superadmin: true, 'Business Operations Staff': true, 'Customer Support Lead': true, 'Billing & Finance Officer': false, 'DevOps & SRE Lead': false } },
    ]
  },
  {
    module: 'Gói cước & Hóa đơn (Billing & Subscriptions)',
    permissions: [
      { name: 'Xem cấu hình gói cước & doanh thu', roles: { Superadmin: true, 'Business Operations Staff': true, 'Customer Support Lead': false, 'Billing & Finance Officer': true, 'DevOps & SRE Lead': false } },
      { name: 'Thay đổi biểu giá gói cước toàn hệ thống', roles: { Superadmin: true, 'Business Operations Staff': false, 'Customer Support Lead': false, 'Billing & Finance Officer': false, 'DevOps & SRE Lead': false } },
      { name: 'Xuất & duyệt hóa đơn thu cước', roles: { Superadmin: true, 'Business Operations Staff': false, 'Customer Support Lead': false, 'Billing & Finance Officer': true, 'DevOps & SRE Lead': false } },
    ]
  },
  {
    module: 'Cờ tính năng (Feature Toggles)',
    permissions: [
      { name: 'Bật/Tắt tính năng trên toàn hệ thống', roles: { Superadmin: true, 'Business Operations Staff': false, 'Customer Support Lead': false, 'Billing & Finance Officer': false, 'DevOps & SRE Lead': true } },
    ]
  },
  {
    module: 'Quản trị Người dùng nội bộ (Users)',
    permissions: [
      { name: 'Thêm mới / Xóa tài khoản nhân viên', roles: { Superadmin: true, 'Business Operations Staff': false, 'Customer Support Lead': false, 'Billing & Finance Officer': false, 'DevOps & SRE Lead': false } },
      { name: 'Phân quyền ủy nhiệm chi tiết', roles: { Superadmin: true, 'Business Operations Staff': false, 'Customer Support Lead': false, 'Billing & Finance Officer': false, 'DevOps & SRE Lead': false } },
    ]
  }
];

export const INITIAL_AUDIT_LOGS = [
  {
    id: 'LOG-99201',
    user: 'Võ Trần Quốc Việt (Superadmin)',
    action: 'Cập nhật cấu hình gói cước',
    detail: 'Thiết lập chuẩn 2 gói cước: Miễn Phí (Core) và Chuyên Nghiệp (PMS + CMS Channel Manager 2 chiều)',
    ip: '118.69.182.45',
    timestamp: '10 phút trước',
    status: 'Success'
  },
  {
    id: 'LOG-99198',
    user: 'Nguyễn Hoàng Nam (Business Ops)',
    action: 'Kích hoạt kênh OTA Booking.com',
    detail: 'Hoàn tất handshake API cho Grand Sunrise Luxury Resort Đà Nẵng (TNT-1092)',
    ip: '14.232.208.12',
    timestamp: '25 phút trước',
    status: 'Success'
  },
  {
    id: 'LOG-99182',
    user: 'Đặng Thanh Tùng (Billing)',
    action: 'Duyệt thanh toán hóa đơn',
    detail: 'Xác nhận thanh toán INV-2026-0091 gói Chuyên Nghiệp năm (25.000.000 đ)',
    ip: '27.72.101.88',
    timestamp: '1 giờ trước',
    status: 'Success'
  },
  {
    id: 'LOG-99175',
    user: 'Lê Minh Quân (DevOps)',
    action: 'Triển khai Kubernetes Node',
    detail: 'Mở rộng cụm Database SG-K8S-Cluster-01 lên 18 pods cách ly',
    ip: '115.79.138.99',
    timestamp: '3 giờ trước',
    status: 'Success'
  },
  {
    id: 'LOG-99150',
    user: 'Trần Thị Mai (CSKH)',
    action: 'Cấp dùng thử tính năng',
    detail: 'Cấp 30 ngày trải nghiệm AI Dynamic Pricing cho Saigon Pearl Boutique Hotel',
    ip: '171.244.10.35',
    timestamp: 'Hôm qua lúc 15:20',
    status: 'Success'
  }
];
