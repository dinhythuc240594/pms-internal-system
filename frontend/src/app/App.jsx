import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// ==========================================
// THƯ MỤC LAYOUTS
// Các Layout bọc ngoài (Wrapper) để tái sử dụng giao diện
// ==========================================
import MarketingLayout from '../apps/marketing/layouts/MarketingLayout';
import PmsLayout from '../apps/pms/layouts/PmsLayout';
import AuthLayout from '../apps/pms/auth/layouts/AuthLayout';
import ManagerLayout from '../apps/manager/layouts/ManagerLayout';
import { RouteGuard, LayoutGuard, AccessDialog } from '../shared/components/AccessControl';
import LohaErrorPage from '../shared/components/LohaErrorPage';
import RouteErrorBoundary from '../shared/components/RouteErrorBoundary';
import LegacyI18nBridge from '../shared/i18n/LegacyI18nBridge';

// ==========================================
// THƯ MỤC PAGES / MARKETING
// Các trang dành cho khách vãng lai
// ==========================================
import Home from '../apps/marketing/Home';
import Pricing from '../apps/marketing/Pricing';
import Blog from '../apps/marketing/Blog';
import Contact from '../apps/marketing/Contact';

// ==========================================
// THƯ MỤC PAGES / APP (PMS)
// Các trang dành cho quản trị viên 
// ==========================================
import Login from '../apps/pms/auth/pages/Login';
import Dashboard from '../apps/pms/dashboard/pages/Dashboard';
import ARI from '../apps/pms/rates-inventory/pages/ARI';
import RoomDiagram from '../apps/pms/rooms/pages/RoomDiagram';
import Reservations from '../apps/pms/reservations/pages/Reservations';
import Rooms from '../apps/pms/rooms/pages/Rooms';
import Settings from '../apps/pms/settings/pages/Settings';
import Profile from '../apps/pms/profile/pages/Profile';
import MatrixRate from '../apps/pms/rates-inventory/pages/MatrixRate';
import Cashflow from '../apps/pms/finance/pages/Cashflow';
import Commissions from '../apps/pms/finance/pages/Commissions';
import Rates from '../apps/pms/rates-inventory/pages/Rates';
import Vouchers from '../apps/pms/rates-inventory/pages/Vouchers';
import RatesARI from '../apps/pms/rates-inventory/pages/RatesARI';
import Promotions from '../apps/pms/rates-inventory/pages/Promotions';
import ExchangeRates from '../apps/pms/rates-inventory/pages/ExchangeRates';
import Housekeeping from '../apps/pms/housekeeping/pages/Housekeeping';
import HousekeepingStaff from '../apps/pms/housekeeping/pages/HousekeepingStaff';
import HousekeepingPlan from '../apps/pms/housekeeping/pages/HousekeepingPlan';
import InventoryIn from '../apps/pms/inventory/pages/InventoryIn';
import InventoryOut from '../apps/pms/inventory/pages/InventoryOut';
import InventoryTransfer from '../apps/pms/inventory/pages/InventoryTransfer';
import InventoryCheck from '../apps/pms/inventory/pages/InventoryCheck';
import InventoryStock from '../apps/pms/inventory/pages/InventoryStock';
import Sales from '../apps/pms/finance/pages/Sales';
import UserManagement from '../apps/pms/user-management/pages/UserManagement';
import { clientOtaSettingsPath } from '../apps/pms/channel-manager/clientChannelOperations';
import Reports from '../apps/pms/reports/pages/Reports';
import { PmsProvider } from '../apps/pms/data/PmsProvider';

// ==========================================
// THƯ MỤC PAGES / QUẢN LÝ (MANAGER)
// ==========================================
import AdminDashboard from '../apps/manager/dashboard/pages/AdminDashboard';
import AdminTenants from '../apps/manager/tenants/pages/AdminTenants';
import ManagerOTA from '../apps/manager/tenants/pages/ManagerOTA';
import ManagerChannex from '../apps/manager/channex/pages/ManagerChannex';
import AdminBilling from '../apps/manager/billing/pages/AdminBilling';
import AdminFeatures from '../apps/manager/features/pages/AdminFeatures';
import AdminUsers from '../apps/manager/users/pages/AdminUsers';
import AdminLogs from '../apps/manager/logs/pages/AdminLogs';
import AdminProfile from '../apps/manager/profile/pages/AdminProfile';

/**
 * COMPONENT: App
 * Mục đích: Quản lý toàn bộ định tuyến (Routing) của ứng dụng.
 * Dev lưu ý:
 * - Nhánh `/` dành cho Marketing Site.
 * - Nhánh `/id/` mô phỏng Subdomain cho App (id.domain).
 */
function OtaSettingsRedirect({ history = false }) {
  const { search } = useLocation();
  return <Navigate to={clientOtaSettingsPath(search, history ? 'history' : 'channels')} replace />;
}

function App() {
  return (
    <PmsProvider><BrowserRouter>
      <RouteErrorBoundary><Routes>
        {/* ---------------------------------------------------------
            PHÂN VÙNG 1: MARKETING (DOMAIN CHÍNH)
            Sử dụng MarketingLayout (Header, Footer chuẩn doanh nghiệp)
            --------------------------------------------------------- */}
        <Route path="/" element={<MarketingLayout />}>
          <Route index element={<Home />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="blog" element={<Blog />} />
          <Route path="contact" element={<Contact />} />
        </Route>

        {/* ---------------------------------------------------------
            PHÂN VÙNG 2: AUTHENTICATION (ĐĂNG NHẬP)
            Sử dụng AuthLayout (Giao diện tối giản chỉ có Form)
            --------------------------------------------------------- */}
        <Route path="/id" element={<AuthLayout />}>
          <Route path="login" element={<Login />} />
        </Route>

        {/* ---------------------------------------------------------
            PHÂN VÙNG 3: APP PMS (HỆ THỐNG QUẢN TRỊ KHÁCH SẠN)
            Sử dụng PmsLayout (Có Sidebar và Top Header)
            --------------------------------------------------------- */}
        <Route path="/id" element={<LayoutGuard><PmsLayout /></LayoutGuard>}>
          <Route element={<RouteGuard />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="room-diagram" element={<RoomDiagram />} />
          <Route path="ari" element={<ARI />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="matrix-rate" element={<MatrixRate />} />
          <Route path="cashflow" element={<Cashflow />} />
          <Route path="cashflow/:tab" element={<Cashflow />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="gia" element={<Rates />} />
          <Route path="gia/vouchers" element={<Vouchers />} />
          <Route path="gia/ari" element={<RatesARI />} />
          <Route path="gia/promotions" element={<Promotions />} />
          <Route path="gia/exchange-rates" element={<ExchangeRates />} />
          <Route path="gia/:tab" element={<Rates />} />
          <Route path="housekeeping/status" element={<Housekeeping />} />
          <Route path="housekeeping/staff" element={<HousekeepingStaff />} />
          <Route path="housekeeping/plan" element={<HousekeepingPlan />} />
          <Route path="housekeeping" element={<Housekeeping />} />
          <Route path="housekeeping/:tab" element={<Housekeeping />} />
          <Route path="inventory/in" element={<InventoryIn />} />
          <Route path="inventory" element={<Navigate to="/id/inventory/in" replace />} />
          <Route path="inventory/out" element={<InventoryOut />} />
          <Route path="inventory/transfer" element={<InventoryTransfer />} />
          <Route path="inventory/check" element={<InventoryCheck />} />
          <Route path="inventory/stock" element={<InventoryStock />} />
          <Route path="sales" element={<Sales />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="ota" element={<OtaSettingsRedirect />} />
          <Route path="ota-history" element={<OtaSettingsRedirect history />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/revenue" element={<Reports />} />
          <Route path="reports/occupancy" element={<Reports />} />
          {['source', 'room', 'roomType', 'cancellations', 'nationality', 'discounts'].map(report => <Route key={report} path={`reports/${report}`} element={<Reports />} />)}
          
          {/* Tự động chuyển hướng (Redirect) nếu user truy cập thẳng `/id` */}
          <Route index element={<Navigate to="/id/dashboard" replace />} />
          </Route>
          <Route path="*" element={<LohaErrorPage status={404} />} />
        </Route>

        {/* ---------------------------------------------------------
            PHÂN VÙNG 4: QUẢN LÝ (AGENCY/RESELLER / BACKOFFICE HQ)
            Sử dụng ManagerLayout (Dark Forest Green Sidebar & Electric Lime Accent)
            --------------------------------------------------------- */}
        <Route path="/manager" element={<LayoutGuard manager><ManagerLayout /></LayoutGuard>}>
          <Route element={<RouteGuard />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="tenants" element={<AdminTenants />} />
          <Route path="channex" element={<ManagerChannex />} />
          <Route path="tenants/:tenantId/ota" element={<ManagerOTA />} />
          <Route path="tenants/:tenantId/ota-history" element={<ManagerOTA history />} />
          <Route path="billing" element={<AdminBilling />} />
          <Route path="features" element={<AdminFeatures />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route index element={<Navigate to="/manager/dashboard" replace />} />
          </Route>
          <Route path="*" element={<LohaErrorPage status={404} />} />
        </Route>

        {/* ---------------------------------------------------------
            CATCH-ALL (Lỗi 404)
            Giữ đường dẫn và hiển thị trang không tìm thấy
            --------------------------------------------------------- */}
        <Route path="*" element={<LohaErrorPage status={404} fullPage />} />
      </Routes></RouteErrorBoundary>
      <AccessDialog />
      <LegacyI18nBridge />
    </BrowserRouter></PmsProvider>
  );
}

export default App;
