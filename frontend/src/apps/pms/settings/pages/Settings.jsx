import React, { useState } from 'react';
import { usePms } from '../../data/usePms';
import LegacyOverlay from '../../components/LegacyOverlay';
import { CORE_ROLES as ROLE_ACTIONS } from '../../data/api';
import { ROLE_NAMES } from '../../data/access';
import InventorySettings from '../../inventory/pages/InventorySettings';
import PricingExchangeRates from '../../rates-inventory/pages/ExchangeRates';
import { AccessLink } from '../../../../shared/components/AccessControl';
import { 
  Building2, Bed, ShoppingCart, Calculator, Package, ShieldCheck,
  ChevronRight, Plus, Edit2, Trash2, Save, Search, X, RefreshCw
} from 'lucide-react';

// --- STYLES ---
const sidebarItemStyle = (isActive) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderRadius: '6px',
  cursor: 'pointer',
  backgroundColor: isActive ? '#e0e7ff' : 'transparent',
  color: isActive ? '#4338ca' : '#475569',
  fontWeight: isActive ? '700' : '600',
  fontSize: '14px',
  marginBottom: '4px',
});

const subTabStyle = (isActive) => ({
  padding: '12px 16px',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '14px',
  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
  borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
  marginBottom: '-1px'
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

const btnStyle = (bg, color) => ({
  padding: '8px 16px',
  borderRadius: '4px',
  border: '1px solid ' + (bg === '#fff' ? '#cbd5e1' : bg),
  fontWeight: 'bold',
  cursor: 'pointer',
  backgroundColor: bg,
  color: color,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '13px'
});

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  borderBottom: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
  color: '#475569',
  fontWeight: '600',
  fontSize: '13px',
  whiteSpace: 'nowrap'
};

const tdStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid #e2e8f0',
  color: '#0f172a',
  fontSize: '14px'
};

const toggleSwitchStyle = (isOn) => ({
  width: '36px',
  height: '20px',
  backgroundColor: isOn ? '#10b981' : '#cbd5e1',
  borderRadius: '20px',
  position: 'relative',
  cursor: 'pointer',
  transition: 'background-color 0.2s', // The only transition we allow for UX
});

const toggleCircleStyle = (isOn) => ({
  width: '16px',
  height: '16px',
  backgroundColor: '#fff',
  borderRadius: '50%',
  position: 'absolute',
  top: '2px',
  left: isOn ? '18px' : '2px',
  transition: 'left 0.2s',
  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
});

export const Toggle = ({ isOn, onToggle }) => (
  <div style={toggleSwitchStyle(isOn)} onClick={onToggle}>
    <div style={toggleCircleStyle(isOn)} />
  </div>
);

// --- DATA MOCK ---
const SETTING_GROUPS = [
  { id: 'business', name: 'Thông tin Doanh nghiệp', icon: Building2 },
  { id: 'rooms', name: 'Phòng & Loại giường', icon: Bed },
  { id: 'services', name: 'Dịch vụ & Bán hàng', icon: ShoppingCart },
  { id: 'accounting', name: 'Kế toán & Thanh toán', icon: Calculator },
  { id: 'inventory', name: 'Kho & Mua hàng', icon: Package },
  { id: 'system', name: 'Hệ thống & Bảo mật', icon: ShieldCheck },
];

function FutureSettings({children}) { return <><p role="status">Chức năng nâng cao này chưa được triển khai. Thao tác lưu đang tắt.</p><fieldset disabled inert style={{border:0,padding:0,margin:0}}>{children}</fieldset></>; }

export default function Settings() {
  const [activeGroup, setActiveGroup] = useState('business');
  const [activeSubTab, setActiveSubTab] = useState('profile');

  const handleGroupChange = (id) => {
    setActiveGroup(id);
    if (id === 'business') setActiveSubTab('profile');
    if (id === 'rooms') setActiveSubTab('room_types');
    if (id === 'services') setActiveSubTab('services');
    if (id === 'accounting') setActiveSubTab('transactions');
    if (id === 'inventory') setActiveSubTab('warehouses');
    if (id === 'system') setActiveSubTab('security');
  };

  const renderContent = () => {
    switch (activeGroup) {
      case 'business':
        return (
          <>
            <div className="pms-settings-tabs">
              <button style={subTabStyle(activeSubTab === 'profile')} onClick={() => setActiveSubTab('profile')}>Hồ sơ & Thông tin chung</button>
              <button style={subTabStyle(activeSubTab === 'policies')} onClick={() => setActiveSubTab('policies')}>Chính sách khách sạn</button>
              <button style={subTabStyle(activeSubTab === 'sources')} onClick={() => setActiveSubTab('sources')}>Nguồn đặt phòng</button>
            </div>
            {activeSubTab === 'profile' && <BusinessProfile />}
            {activeSubTab === 'policies' && <BusinessPolicies />}
            {activeSubTab === 'sources' && <BookingSources />}
          </>
        );
      case 'rooms':
        return (
          <>
            <div className="pms-settings-tabs">
              <button style={subTabStyle(activeSubTab === 'room_types')} onClick={() => setActiveSubTab('room_types')}>Danh sách Loại phòng</button>
              <button style={subTabStyle(activeSubTab === 'bed_types')} onClick={() => setActiveSubTab('bed_types')}>Loại giường</button>
            </div>
            {activeSubTab === 'room_types' && <RoomTypesGrid />}
            {activeSubTab === 'bed_types' && <BedTypes />}
          </>
        );
      case 'services':
        return (
          <>
            <div className="pms-settings-tabs">
              <button style={subTabStyle(activeSubTab === 'services')} onClick={() => setActiveSubTab('services')}>Danh mục & Dịch vụ</button>
              <button style={subTabStyle(activeSubTab === 'meals')} onClick={() => setActiveSubTab('meals')}>Các bữa ăn</button>
              <button style={subTabStyle(activeSubTab === 'sources')} onClick={() => setActiveSubTab('sources')}>Nguồn đặt phòng</button>
            </div>
            {activeSubTab === 'services' && <ServiceCategories />}
            {activeSubTab === 'meals' && <Meals />}
            {activeSubTab === 'sources' && <BookingSources />}
          </>
        );
      case 'accounting':
        return (
          <>
            <div className="pms-settings-tabs">
              <button style={subTabStyle(activeSubTab === 'transactions')} onClick={() => setActiveSubTab('transactions')}>Danh mục thu chi</button>
              <button style={subTabStyle(activeSubTab === 'payments')} onClick={() => setActiveSubTab('payments')}>Phương thức thanh toán</button>
              <button style={subTabStyle(activeSubTab === 'currency')} onClick={() => setActiveSubTab('currency')}>Tỉ giá tiền tệ</button>
              <button style={subTabStyle(activeSubTab === 'commissions')} onClick={() => setActiveSubTab('commissions')}>Quản lý Hoa hồng</button>
            </div>
            {activeSubTab === 'transactions' && <FutureSettings><div>Giao diện Danh mục thu chi</div></FutureSettings>}
            {activeSubTab === 'payments' && <PaymentMethods />}
            {activeSubTab === 'currency' && <PricingExchangeRates />}
            {activeSubTab === 'commissions' && <FutureSettings><Commissions /></FutureSettings>}
          </>
        );
      case 'inventory':
        return (
          <>
            <div className="pms-settings-tabs">
              <button style={subTabStyle(activeSubTab === 'warehouses')} onClick={() => setActiveSubTab('warehouses')}>Danh sách kho</button>
              <button style={subTabStyle(activeSubTab === 'items')} onClick={() => setActiveSubTab('items')}>Mặt hàng & Danh mục</button>
              <button style={subTabStyle(activeSubTab === 'suppliers')} onClick={() => setActiveSubTab('suppliers')}>Nhà cung cấp</button>
              <button style={subTabStyle(activeSubTab === 'units')} onClick={() => setActiveSubTab('units')}>Đơn vị tính</button>
              <button style={subTabStyle(activeSubTab === 'opening')} onClick={() => setActiveSubTab('opening')}>Tồn đầu kỳ</button>
              <button style={subTabStyle(activeSubTab === 'service_stock')} onClick={() => setActiveSubTab('service_stock')}>Định mức POS</button>
            </div>
            {['warehouses', 'items', 'suppliers', 'opening', 'service_stock'].includes(activeSubTab) && <InventorySettings catalog={activeSubTab} />}
            {activeSubTab === 'units' && <Units />}
          </>
        );
      case 'system':
        return (
          <>
            <div className="pms-settings-tabs">
              <button style={subTabStyle(activeSubTab === 'security')} onClick={() => setActiveSubTab('security')}>Bảo mật nâng cao</button>
              <button style={subTabStyle(activeSubTab === 'roles')} onClick={() => setActiveSubTab('roles')}>Phân quyền</button>
            </div>
            {activeSubTab === 'security' && <FutureSettings><AdvancedSecurity /></FutureSettings>}
            {activeSubTab === 'roles' && <RoleMatrix />}
          </>
        );
      default:
        return <div>Tính năng đang được phát triển...</div>;
    }
  };

  return (
    <div className="pms-settings" style={{ display: 'flex', width: '100%', fontFamily: 'Inter, sans-serif' }}>
      
      {/* SIDEBAR BÊN TRÁI (SETTINGS HUB) */}
      <div className="pms-settings-navigation" style={{ backgroundColor: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Cài đặt</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>Hệ thống & Danh mục</p>
        </div>

        <div className="pms-settings-groups" style={{ padding: '0 12px', flex: 1, overflowY: 'auto' }}>
          {SETTING_GROUPS.map(group => {
            const Icon = group.icon;
            const isActive = activeGroup === group.id;
            return (
              <button type="button"
                key={group.id} 
                aria-pressed={isActive}
                style={sidebarItemStyle(isActive)}
                onClick={() => handleGroupChange(group.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={18} />
                  <span>{group.name}</span>
                </div>
                {isActive && <ChevronRight size={16} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* NỘI DUNG BÊN PHẢI (MAIN CONTENT) */}
      <div className="pms-settings-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto', backgroundColor: '#fff' }}>
          {renderContent()}
        </div>
      </div>

    </div>
  );
}

// ==========================================
// THÀNH PHẦN CON (SUB-COMPONENTS)
// ==========================================

function RoleMatrix() {
  const roles = ['HOTEL_OWNER', 'FRONT_DESK', 'HOUSEKEEPING', 'ACCOUNTANT'];
  const actions = [['rooms.view', 'Xem sơ đồ phòng'], ['reservations.view', 'Xem đặt phòng'], ['reservations.write', 'Tạo / sửa / đổi trạng thái booking'], ['housekeeping.write', 'Cập nhật buồng phòng'], ['payments.write', 'Thanh toán / hoàn tiền / phụ thu'], ['reports.view', 'Báo cáo'], ['settings.write', 'Cài đặt khách sạn'], ['users.write', 'Quản lý người dùng']];
  return <div><h2 style={{ fontSize: 18 }}>Quyền mặc định theo vai trò</h2><p style={{ color: '#64748b', fontSize: 13 }}>Quyền được kiểm tra trên máy chủ theo vai trò tại khách sạn. Gán vai trò tại mục Người dùng.</p><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={thStyle}>Thao tác</th>{roles.map(r => <th key={r} style={thStyle}>{ROLE_NAMES[r]}</th>)}</tr></thead><tbody>{actions.map(([action, name]) => <tr key={action}><td style={tdStyle}>{name}</td>{roles.map(r => <td key={r} style={tdStyle}>{ROLE_ACTIONS[r].includes('*') || ROLE_ACTIONS[r].includes(action) ? '✓' : '—'}</td>)}</tr>)}</tbody></table></div>;
}

function MasterGrid({ catalog, title, description, fields, rows, transform, activation = false, searchable = false }) {
  const pms = usePms();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const list = (rows || pms[catalog] || []).filter(row => !searchable || ((!category || row.category === category) && `${row.name} ${row.id}`.toLowerCase().includes(query.toLowerCase())));
  const blank = () => Object.fromEntries(fields.map(f => [f.key, f.default ?? (f.type === 'number' ? 0 : '')]));
  const [draft, setDraft] = useState(blank);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const edit = row => { setDraft({ ...row }); setEditing(true); setError(''); setMessage(''); };
  const save = async () => {
    try {
      const item = { ...draft };
      for (const field of fields) if (field.type === 'number') item[field.key] = field.key === 'capacity' ? Number(item[field.key]) : String(item[field.key]);
      if (!editing && item.id && (pms[catalog] || []).some(row => row.id === item.id)) throw new Error('Mã đã tồn tại. Hãy chọn Sửa ở bản ghi cần thay đổi.');
      if (!editing) delete item.id;
      await pms.saveMaster(catalog, transform ? transform(item) : item);
      setDraft(blank()); setEditing(false); setError(''); setMessage('Đã lưu vào danh mục của khách sạn hiện tại.');
    } catch (err) { setError(err.message); }
  };
  const toggle = async id => { try { await pms.toggleMaster(catalog, id); setError(''); } catch (err) { setError(err.message); } };
  return <div style={{ width: '100%', marginBottom: 24 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div><h2 style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px' }}>{title}</h2><p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{description}</p></div>
      <button style={btnStyle('#10b981', '#fff')} onClick={() => { setDraft(blank()); setEditing(false); setError(''); }}><Plus size={16} /> Thêm mới</button>
    </div>
    {searchable && <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}><select aria-label="Lọc danh mục mặt hàng" value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, width: 220 }}><option value="">Tất cả danh mục</option>{fields.find(f => f.key === 'category')?.options?.map(c => <option key={c}>{c}</option>)}</select><div style={{ position: 'relative', flex: 1 }}><Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} /><input aria-label="Tìm mặt hàng" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nhập tên hoặc mã hàng hóa..." style={{ ...inputStyle, paddingLeft: 36 }} /></div></div>}
    {error && <p role="alert" style={{ color: '#dc2626' }}>{error}</p>}{message && <p role="status" style={{ color: '#059669' }}>{message}</p>}
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{fields.map(f => <th key={f.key} style={thStyle}>{f.label}</th>)}{activation && <th style={thStyle}>Kích hoạt</th>}<th style={thStyle}>Thao tác</th></tr></thead><tbody>
      {list.map(row => <tr key={row.id} style={{ opacity: row.active === false ? 0.55 : 1 }}>{fields.map(f => <td key={f.key} style={tdStyle}>{f.type === 'checkbox' ? <input type="checkbox" checked={!!row[f.key]} readOnly disabled /> : f.type === 'number' ? Number(row[f.key] || 0).toLocaleString('vi-VN') : f.key === 'category' ? <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 'bold' }}>{row[f.key]}</span> : row[f.key]}</td>)}{activation && <td style={tdStyle}><Toggle isOn={row.active !== false} onToggle={() => toggle(row.id)} /></td>}<td style={tdStyle}><div style={{ display: 'flex', gap: 8 }}><button aria-label={`Sửa ${row.name}`} style={{ border: 0, background: 'none', color: '#3b82f6', cursor: 'pointer' }} onClick={() => edit(row)}><Edit2 size={16} /></button><button aria-label={`${row.active === false ? 'Bật' : 'Tắt'} ${row.name}`} title="Bật/tắt sử dụng; giữ lịch sử đã có" style={{ border: 0, background: 'none', color: row.active === false ? '#10b981' : '#ef4444', cursor: 'pointer' }} onClick={() => toggle(row.id)}><Trash2 size={16} /></button></div></td></tr>)}
      <tr style={{ background: '#f0fdf4' }}>{fields.map(f => <td key={f.key} style={{ ...tdStyle, padding: 8 }}>{f.type === 'checkbox' ? <input aria-label={f.label} type="checkbox" checked={!!draft[f.key]} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.checked }))} /> : f.options ? <select aria-label={f.label} value={draft[f.key] ?? ''} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} style={{ ...inputStyle, padding: 6 }}><option value="">Chọn...</option>{f.options.map(o => <option key={o} value={o}>{o}</option>)}</select> : <input aria-label={f.label} type={f.type || 'text'} min={f.type === 'number' ? 0 : undefined} readOnly={f.key === 'id' && editing} value={draft[f.key] ?? ''} placeholder={f.label} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} style={{ ...inputStyle, padding: 6 }} />}</td>)}{activation && <td style={tdStyle}><Toggle isOn={draft.active !== false} onToggle={() => setDraft(d => ({ ...d, active: d.active === false }))} /></td>}<td style={{ ...tdStyle, padding: 8 }}><button style={{ ...btnStyle('#10b981', '#fff'), width: '100%' }} onClick={save}><Save size={16} /> Lưu</button></td></tr>
    </tbody></table></div>
  </div>;
}

function BusinessProfile() {
  const { settings, saveSettings } = usePms();
  const [draft, setDraft] = useState(settings);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const save = async () => { try { await saveSettings(draft); setError(''); setMessage('Đã lưu cấu hình.'); } catch (err) { setError(err.message); } };

  return (
    <div style={{ maxWidth: '800px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '24px' }}>Hồ sơ khách sạn</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Tên Khách sạn</label>
          <input type="text" aria-label="Tên Khách sạn" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Tiền tệ cơ sở</label>
          <select aria-label="Tiền tệ cơ sở" value={draft.currency} onChange={e => setDraft(d => ({ ...d, currency: e.target.value }))} style={inputStyle}>
            <option value="VND">VND - Việt Nam Đồng</option>
            <option value="USD">USD - US Dollar</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Địa chỉ</label>
          <input type="text" aria-label="Địa chỉ" value={draft.address} onChange={e => setDraft(d => ({ ...d, address: e.target.value }))} style={inputStyle} />
        </div>
      </div>
      <div style={{ marginTop: '24px' }}>
        {error && <p role="alert" style={{ color: '#dc2626' }}>{error}</p>}{message && <p role="status">{message}</p>}
        <button onClick={save} style={btnStyle('var(--accent-primary)', '#fff')}><Save size={16}/> Lưu cấu hình</button>
      </div>
    </div>
  );
}

function BusinessPolicies() {
  const { settings, saveSettings } = usePms();
  const [draft, setDraft] = useState(settings);
  const [message, setMessage] = useState('');
  const save = async () => { try { await saveSettings(draft); setMessage('Đã lưu giờ nhận/trả phòng.'); } catch (err) { setMessage(err.message); } };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>Chính sách nhận / trả phòng</h2>
        <button onClick={save} style={btnStyle('var(--accent-primary)', '#fff')}><Save size={16}/> Lưu chính sách</button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Giờ nhận phòng (Check-in)</label>
          <input type="time" value={draft.checkInTime} onChange={e => setDraft(d => ({ ...d, checkInTime: e.target.value }))} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Giờ trả phòng (Check-out)</label>
          <input type="time" value={draft.checkOutTime} onChange={e => setDraft(d => ({ ...d, checkOutTime: e.target.value }))} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Nội dung Chính sách (Hiển thị cho khách hàng)</label>
        {/* THAY THẾ RICH TEXT EDITOR LỖI THỜI BẰNG TEXTAREA GỌN NHẸ */}
        <textarea 
          rows="8" 
          value={draft.policies || ''} onChange={e => setDraft(d => ({ ...d, policies:e.target.value }))}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }} 
        />
        {message && <p role="status">{message}</p>}<p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Có thể sử dụng định dạng danh sách (-).</p>
      </div>
    </div>
  );
}
function RoomTypesGrid() {
  const { roomTypes, rooms } = usePms();
  const rows = roomTypes.map(t => ({ ...t, roomNumbers: rooms.filter(r => r.typeId === t.id && r.active !== false).map(r => r.id).join(', ') }));
  return <MasterGrid catalog="roomTypes" title="Danh sách Loại phòng" description={`Số lượng phòng hiện tại: ${rooms.filter(r=>r.active!==false).length}`} rows={rows} fields={[{ key: 'id', label: 'Mã' }, { key: 'name', label: 'Tên Loại Phòng' }, { key: 'roomNumbers', label: 'Danh sách số phòng' }, { key: 'capacity', label: 'Sức chứa', type: 'number', default: 2 }, { key: 'price', label: 'Giá niêm yết', type: 'number' }]} transform={item => ({ ...item, roomNumbers: item.roomNumbers.split(',').map(n => n.trim().replace(/^R(?=\d)/i, '')).filter(Boolean) })} />;
}

function ServiceCategories() {
  const { serviceCategories, units } = usePms();
  return <><MasterGrid catalog="serviceCategories" title="Quản lý Dịch vụ (Đã gộp)" description="Danh mục dịch vụ của khách sạn" fields={[{ key: 'name', label: 'Tên Nhóm (Danh mục)' }, { key: 'tax', label: 'VAT (%)', type: 'number' }]} />
    <MasterGrid catalog="services" title="Các Dịch vụ thuộc nhóm" description="Dịch vụ được sử dụng tại POS" fields={[{ key: 'name', label: 'Tên Dịch vụ' }, { key: 'category', label: 'Nhóm', options: serviceCategories.filter(c => c.active !== false).map(c => c.name) }, { key: 'price', label: 'Giá bán', type: 'number' }, { key: 'unit', label: 'Đơn vị tính', options: units.filter(u => u.active !== false).map(u => u.name) }]} /></>;
}

function Meals() {
  return <MasterGrid catalog="meals" title="Các bữa ăn" activation fields={[{key:"name",label:"Tên bữa ăn"},{key:"price",label:"Phụ thu",type:"number"}]} />;
}

function PaymentMethods() {
  return <><MasterGrid catalog="paymentMethods" title="Phương thức thanh toán" activation fields={[{key:"name",label:"Tên phương thức"},{key:"type",label:"Loại",options:["CASH","BANK_TRANSFER","CREDIT_CARD","DEBIT_CARD","E_WALLET","CITY_LEDGER"]}]} /><MasterGrid catalog="funds" title="Quỹ nhận tiền" activation fields={[{key:"name",label:"Tên quỹ"},{key:"type",label:"Loại",options:["cash","bank"]},{key:"currency",label:"Tiền tệ",options:["VND","USD"],default:"VND"},{key:"accountNumber",label:"Số tài khoản"},{key:"bank",label:"Ngân hàng"}]} /></>;
}

function ExchangeRates() {
  const [rates, setRates] = useState([
    { code: 'USD', rate: 25400, active: true },
    { code: 'EUR', rate: 27500, active: true },
    { code: 'GBP', rate: 31000, active: false },
    { code: 'CNY', rate: 3500, active: false },
  ]);

  const toggleRate = (idx) => {
    const newRates = [...rates];
    newRates[idx].active = !newRates[idx].active;
    setRates(newRates);
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Tỉ giá tiền tệ</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Quy đổi dựa trên loại tiền mặc định của khách sạn (VND).</p>
        </div>
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxWidth: '600px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Loại (Currency)</th>
              <th style={{...thStyle, width: '200px'}}>Tỉ giá quy đổi</th>
              <th style={{...thStyle, width: '100px', textAlign: 'center'}}>Kích hoạt</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r, idx) => (
              <tr key={r.code}>
                <td style={{...tdStyle, fontWeight: 'bold'}}>{r.code}</td>
                <td style={{...tdStyle, padding: '8px 16px'}}>
                  <input type="number" defaultValue={r.rate} style={{...inputStyle, padding: '6px', textAlign: 'right'}} />
                </td>
                <td style={{...tdStyle, textAlign: 'center'}}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Toggle isOn={r.active} onToggle={() => toggleRate(idx)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '16px' }}>
        <button style={btnStyle('var(--accent-primary)', '#fff')}><Save size={16}/> Lưu tỉ giá</button>
      </div>
    </div>
  );
}

function AdvancedSecurity() {
  const [mfa, setMfa] = useState(false);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Bảo mật nâng cao</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Thiết lập các lớp bảo vệ phụ cho hệ thống tài khoản khách sạn.</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <ShieldCheck size={24} color="#4338ca" />
          </div>
          <div>
            <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '16px', marginBottom: '4px' }}>Chức năng Bảo mật 2 lớp (2FA) {mfa ? 'đang BẬT' : 'đang TẮT'}</div>
            <div style={{ color: '#475569', fontSize: '13px', lineHeight: '1.5', maxWidth: '600px' }}>
              Khi bật bảo mật 2 lớp, hệ thống sẽ gửi mã OTP qua Email hoặc SMS để xác thực mỗi khi đăng nhập trên thiết bị mới.<br/><br/>
              <em>Lưu ý: Nếu khách sạn thuộc chuỗi (Multi-property), thiết lập này sẽ áp dụng cho toàn bộ các khách sạn trong chuỗi.</em>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '8px' }}>
          <Toggle isOn={mfa} onToggle={() => setMfa(!mfa)} />
        </div>
      </div>
    </div>
  );
}

function BookingSources() {
  const [filterType, setFilterType] = useState('Travel Agency');
  
  const { bookingSources: sources, saveMaster, toggleMaster } = usePms();
  const [draft, setDraft] = useState({ name: '', commission: 0, email: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const otas = sources.filter(s => s.type === 'OTA');
  const toggleOta = async id => { try { await toggleMaster('bookingSources', id); setError(''); } catch (err) { setError(err.message); } };
  const save = async () => { try { await saveMaster('bookingSources', { ...draft, type: filterType, commission: Number(draft.commission) }); setDraft({ name: '', commission: 0, email: '' }); setError(''); setMessage('Đã lưu nguồn đặt phòng.'); } catch (err) { setError(err.message); } };

  const filteredSources = sources.filter(s => s.type === filterType);
  const showCommissionAndEmail = ['Travel Agency', 'Corporate', 'Reference'].includes(filterType);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Nguồn đặt phòng & Đối tác</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            {filterType === 'OTA' ? 'Kích hoạt các kênh bán phòng trực tuyến (OTA) mà khách sạn sử dụng.' : 'Quản lý danh sách đối tác và thiết lập hoa hồng.'}
          </p>
        </div>
        {filterType === 'OTA' && (
          <AccessLink to="/id/ota" style={{ ...btnStyle('#3b82f6', '#fff'), textDecoration: 'none' }}><RefreshCw size={16} aria-hidden="true" /> Quản lý kênh OTA</AccessLink>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['Travel Agency', 'Corporate', 'OTA', 'Direct', 'Reference'].map(type => (
          <button 
            key={type}
            onClick={() => { setFilterType(type); setDraft({ name: '', commission: 0, email: '' }); setError(''); setMessage(''); }}
            style={{ 
              padding: '6px 12px', 
              borderRadius: '20px', 
              fontSize: '13px', 
              fontWeight: 'bold',
              cursor: 'pointer',
              border: filterType === type ? 'none' : '1px solid #e2e8f0',
              backgroundColor: filterType === type ? '#e0e7ff' : '#fff',
              color: filterType === type ? '#4338ca' : '#475569'
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {error && <p role="alert" style={{ color: '#dc2626' }}>{error}</p>}{message && <p role="status">{message}</p>}
      {filterType === 'OTA' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {otas.map((ota) => (
            <div key={ota.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '14px' }}>{ota.name}</div>
              <Toggle isOn={ota.active} onToggle={() => toggleOta(ota.id)} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Tên Đối tác / Nguồn</th>
                {showCommissionAndEmail && <th style={{...thStyle, width: '120px', textAlign: 'center'}}>Hoa hồng (%)</th>}
                {showCommissionAndEmail && <th style={thStyle}>Email liên hệ</th>}
                <th style={{...thStyle, width: '100px', textAlign: 'center'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredSources.map(s => (
                <tr key={s.id} style={{ opacity: s.active === false ? 0.55 : 1 }}>
                  <td style={{...tdStyle, fontWeight: 'bold'}}>{s.name}</td>
                  {showCommissionAndEmail && (
                    <td style={{...tdStyle, textAlign: 'center', fontWeight: 'bold', color: s.commission > 0 ? '#10b981' : '#64748b'}}>
                      {s.commission}%
                    </td>
                  )}
                  {showCommissionAndEmail && (
                    <td style={{...tdStyle, color: '#64748b'}}>{s.email || '-'}</td>
                  )}
                  <td style={{...tdStyle, textAlign: 'center'}}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button aria-label={`Sửa ${s.name}`} onClick={() => { setDraft({ ...s, email: s.email || '' }); setMessage(''); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#3b82f6' }}><Edit2 size={16}/></button>
                      <button aria-label={`Bật tắt ${s.name}`} onClick={() => toggleOta(s.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {/* IN-LINE EDIT (Thêm Đối Tác Nhanh) */}
              <tr style={{ backgroundColor: '#f0fdf4' }}>
                <td style={{...tdStyle, padding: '8px'}}><input type="text" aria-label="Tên nguồn đặt phòng" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder={`Tên đối tác ${filterType}...`} style={{...inputStyle, padding: '6px'}} /></td>
                {showCommissionAndEmail && <td style={{...tdStyle, padding: '8px'}}><input type="number" aria-label="Hoa hồng nguồn" value={draft.commission} min="0" onChange={e => setDraft(d => ({ ...d, commission: e.target.value }))} placeholder="%" style={{...inputStyle, padding: '6px', textAlign: 'center'}} /></td>}
                {showCommissionAndEmail && <td style={{...tdStyle, padding: '8px'}}><input type="email" aria-label="Email nguồn" value={draft.email} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} placeholder="Email liên hệ (Nếu có)" style={{...inputStyle, padding: '6px'}} /></td>}
                <td style={{...tdStyle, textAlign: 'center', padding: '8px'}}>
                  <button onClick={save} style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Lưu</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BedTypes() {
  return <MasterGrid catalog="bedTypes" title="Loại giường" fields={[{ key: "name", label: "Tên loại giường" }]} />;
}

function Units() {
  return <MasterGrid catalog="units" title="Đơn vị tính" fields={[{ key: 'name', label: 'Tên Đơn vị tính' }]} />;
}

function Commissions() {
  const [activeTab, setActiveTab] = useState('types'); // 'types' | 'subjects'

  const commTypes = [
    { id: 1, name: 'Chi phí giới thiệu khách (Taxi, Xe ôm)' },
    { id: 2, name: 'Chiết khấu Đại lý (TA)' }
  ];

  const commSubjects = [
    { id: 1, name: 'Anh Tài Taxi Vinasun', type: 'Chi phí giới thiệu khách (Taxi, Xe ôm)' },
    { id: 2, name: 'Chị Lan Đại Lý', type: 'Chiết khấu Đại lý (TA)' }
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Quản lý Hoa hồng</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Cấu hình danh mục loại chi phí và các đối tượng nhận chi hoa hồng.</p>
        </div>
      </div>

      <div className="pms-settings-tabs">
        <button style={subTabStyle(activeTab === 'types')} onClick={() => setActiveTab('types')}>Loại chi phí hoa hồng</button>
        <button style={subTabStyle(activeTab === 'subjects')} onClick={() => setActiveTab('subjects')}>Đối tượng chi hoa hồng</button>
      </div>

      {activeTab === 'types' && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{...thStyle, width: '60px'}}>#</th>
                <th style={thStyle}>Tên loại chi phí hoa hồng</th>
                <th style={{...thStyle, width: '100px', textAlign: 'center'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {commTypes.map((t, idx) => (
                <tr key={t.id}>
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={{...tdStyle, fontWeight: 'bold'}}>{t.name}</td>
                  <td style={{...tdStyle, textAlign: 'center'}}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#3b82f6' }}><Edit2 size={16}/></button>
                      <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr style={{ backgroundColor: '#f0fdf4' }}>
                <td style={{...tdStyle, padding: '8px'}}>+</td>
                <td style={{...tdStyle, padding: '8px'}}><input type="text" placeholder="Tên loại chi phí mới..." style={{...inputStyle, padding: '6px'}} /></td>
                <td style={{...tdStyle, textAlign: 'center', padding: '8px'}}>
                  <button style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Lưu</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{...thStyle, width: '60px'}}>#</th>
                <th style={thStyle}>Tên Đối tượng</th>
                <th style={thStyle}>Thuộc Loại chi phí</th>
                <th style={{...thStyle, width: '100px', textAlign: 'center'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {commSubjects.map((s, idx) => (
                <tr key={s.id}>
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={{...tdStyle, fontWeight: 'bold'}}>{s.name}</td>
                  <td style={{...tdStyle, color: '#475569'}}>{s.type}</td>
                  <td style={{...tdStyle, textAlign: 'center'}}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#3b82f6' }}><Edit2 size={16}/></button>
                      <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr style={{ backgroundColor: '#f0fdf4' }}>
                <td style={{...tdStyle, padding: '8px'}}>+</td>
                <td style={{...tdStyle, padding: '8px'}}><input type="text" placeholder="Tên đối tượng..." style={{...inputStyle, padding: '6px'}} /></td>
                <td style={{...tdStyle, padding: '8px'}}>
                  <select style={{...inputStyle, padding: '6px'}}>
                    <option>Chi phí giới thiệu khách (Taxi, Xe ôm)</option>
                    <option>Chiết khấu Đại lý (TA)</option>
                  </select>
                </td>
                <td style={{...tdStyle, textAlign: 'center', padding: '8px'}}>
                  <button style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Lưu</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
