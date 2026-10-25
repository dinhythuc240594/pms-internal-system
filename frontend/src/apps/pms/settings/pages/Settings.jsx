import { getIntlLocale } from '../../../../shared/i18n/store.js';
import { t as tUi, tr as labelUi, useI18n } from '../../../../shared/i18n/useI18n.js';
import React, { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePms } from '../../data/usePms';
import IntegrationWorkspace from '../../channel-manager/pages/IntegrationWorkspace';
import { AccessMessage } from '../../../../shared/components/AccessControl';
import LegacyOverlay from '../../components/LegacyOverlay';
import { CORE_ROLES as ROLE_ACTIONS } from '../../data/api';
import { ROLE_NAMES } from '../../data/access';
import LanguageSwitcher from '../../../../shared/i18n/LanguageSwitcher.jsx';
import InventorySettings from '../../inventory/pages/InventorySettings';
import PricingExchangeRates from '../../rates-inventory/pages/ExchangeRates';
import CommissionPage from '../../finance/pages/Commissions';
import { AccessLink } from '../../../../shared/components/AccessControl';
import { 
  Building2, Bed, ShoppingCart, Calculator, Package, ShieldCheck,
  ChevronRight, Edit2, Trash2, Save, Search, X, RefreshCw, Link2
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

export const Toggle = ({ isOn, onToggle, disabled = false, label = 'Kích hoạt' }) => { useI18n(); return ((
  <button type="button" role="switch" aria-checked={isOn} aria-label={labelUi(label)} disabled={disabled} style={{ ...toggleSwitchStyle(isOn), border: 0, padding: 0 }} onClick={onToggle}>
    <span style={toggleCircleStyle(isOn)} />
  </button>
)); };

// --- DATA MOCK ---
const SETTING_GROUPS = [
  { id: 'business', name: 'Thông tin Doanh nghiệp', icon: Building2 },
  { id: 'rooms', name: 'Phòng & Loại giường', icon: Bed },
  { id: 'services', name: 'Dịch vụ & Bán hàng', icon: ShoppingCart },
  { id: 'accounting', name: 'Kế toán & Thanh toán', icon: Calculator },
  { id: 'inventory', name: 'Kho & Mua hàng', icon: Package },
  { id: 'channels', name: 'Channex & Kênh OTA', icon: Link2 },
  { id: 'system', name: 'Hệ thống & Bảo mật', icon: ShieldCheck },
];
const DEFAULT_TABS = { business: 'profile', rooms: 'room_types', services: 'services', accounting: 'transactions', inventory: 'warehouses', channels: 'overview', system: 'security' };

function FutureSettings({children}) {
  useI18n(); return <><p role="status">{tUi("settings.future")}</p><fieldset disabled inert style={{border:0,padding:0,margin:0}}>{children}</fieldset></>; }

export default function Settings() {
  useI18n();
  const pms = usePms(), { tenantId } = pms;
  const [params, setParams] = useSearchParams();
  const groups = SETTING_GROUPS.filter(group => pms.routeAccess('/id/settings').allowed || group.id === 'channels');
  const activeGroup = groups.some(group => group.id === params.get('section')) ? params.get('section') : groups[0].id;
  const activeSubTab = params.get('tab') || DEFAULT_TABS[activeGroup];
  const setActiveSubTab = tab => setParams({ section: activeGroup, tab });

  const handleGroupChange = (id) => {
    setParams({ section: id });
  };

  const renderContent = () => {
    switch (activeGroup) {
      case 'business':
        return (
          <>
            <div className="pms-settings-tabs">
              <button style={subTabStyle(activeSubTab === 'profile')} onClick={() => setActiveSubTab('profile')}>{tUi("settings.profileTab")}</button>
              <button style={subTabStyle(activeSubTab === 'policies')} onClick={() => setActiveSubTab('policies')}>{tUi("settings.policies")}</button>
              <button style={subTabStyle(activeSubTab === 'sources')} onClick={() => setActiveSubTab('sources')}>{tUi('settings.bookingSources')}</button>
            </div>
            {activeSubTab === 'profile' && <BusinessProfile key={tenantId} />}
            {activeSubTab === 'policies' && <BusinessPolicies />}
            {activeSubTab === 'sources' && <BookingSources />}
          </>
        );
      case 'rooms':
        return (
          <>
            <div className="pms-settings-tabs">
              <button style={subTabStyle(activeSubTab === 'room_types')} onClick={() => setActiveSubTab('room_types')}>{tUi("settings.roomTypes")}</button>
              <button style={subTabStyle(activeSubTab === 'bed_types')} onClick={() => setActiveSubTab('bed_types')}>{tUi("settings.beds")}</button>
            </div>
            {activeSubTab === 'room_types' && <RoomTypesGrid />}
            {activeSubTab === 'bed_types' && <BedTypes />}
          </>
        );
      case 'services':
        return (
          <>
            <div className="pms-settings-tabs">
              <button style={subTabStyle(activeSubTab === 'services')} onClick={() => setActiveSubTab('services')}>{tUi("settings.catalogServices")}</button>
              <button style={subTabStyle(activeSubTab === 'meals')} onClick={() => setActiveSubTab('meals')}>{tUi("settings.meals")}</button>
              <button style={subTabStyle(activeSubTab === 'sources')} onClick={() => setActiveSubTab('sources')}>{tUi('settings.bookingSources')}</button>
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
              <button style={subTabStyle(activeSubTab === 'transactions')} onClick={() => setActiveSubTab('transactions')}>{tUi("settings.cashCategories")}</button>
              <button style={subTabStyle(activeSubTab === 'payments')} onClick={() => setActiveSubTab('payments')}>{tUi("payments.method")}</button>
              <button style={subTabStyle(activeSubTab === 'currency')} onClick={() => setActiveSubTab('currency')}>{tUi("settings.currency")}</button>
              <button style={subTabStyle(activeSubTab === 'commissions')} onClick={() => setActiveSubTab('commissions')}>{tUi("settings.commissions")}</button>
            </div>
            {activeSubTab === 'transactions' && <CashbookCategories />}
            {activeSubTab === 'payments' && <PaymentMethods />}
            {activeSubTab === 'currency' && <PricingExchangeRates />}
            {activeSubTab === 'commissions' && <Commissions key={tenantId} />}
          </>
        );
      case 'inventory':
        return (
          <>
            <div className="pms-settings-tabs">
              <button style={subTabStyle(activeSubTab === 'warehouses')} onClick={() => setActiveSubTab('warehouses')}>{tUi("inventory.warehouses")}</button>
              <button style={subTabStyle(activeSubTab === 'items')} onClick={() => setActiveSubTab('items')}>{tUi("settings.items")}</button>
              <button style={subTabStyle(activeSubTab === 'suppliers')} onClick={() => setActiveSubTab('suppliers')}>{tUi("inventory.supplier")}</button>
              <button style={subTabStyle(activeSubTab === 'units')} onClick={() => setActiveSubTab('units')}>{tUi("inventory.unit")}</button>
              <button style={subTabStyle(activeSubTab === 'opening')} onClick={() => setActiveSubTab('opening')}>{tUi("inventory.opening")}</button>
              <button style={subTabStyle(activeSubTab === 'service_stock')} onClick={() => setActiveSubTab('service_stock')}>{tUi("settings.posStock")}</button>
            </div>
            {['warehouses', 'items', 'suppliers', 'opening', 'service_stock'].includes(activeSubTab) && <InventorySettings catalog={activeSubTab} />}
            {activeSubTab === 'units' && <Units />}
          </>
        );
      case 'channels': {
        const access = pms.access('channels.view', 'OTA_SYNC', false);
        if (!access.allowed) return <AccessMessage result={access} />;
        return <IntegrationWorkspace key={`${tenantId}:${pms.authGeneration}`} pms={pms} embedded />;
      }
      case 'system':
        return (
          <>
            <div className="pms-settings-tabs">
              <button style={subTabStyle(activeSubTab === 'security')} onClick={() => setActiveSubTab('security')}>{tUi("settings.advancedSecurity")}</button>
              <button style={subTabStyle(activeSubTab === 'roles')} onClick={() => setActiveSubTab('roles')}>{tUi("settings.roles")}</button>
            </div>
            {activeSubTab === 'security' && <FutureSettings><AdvancedSecurity /></FutureSettings>}
            {activeSubTab === 'roles' && <RoleMatrix />}
          </>
        );
      default:
        return <div>{tUi("settings.developing")}</div>;
    }
  };

  return (
    <div className="pms-settings" style={{ display: 'flex', width: '100%', fontFamily: 'Inter, sans-serif' }}>
      
      {/* SIDEBAR BÊN TRÁI (SETTINGS HUB) */}
      <div className="pms-settings-navigation" style={{ backgroundColor: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>{tUi("nav.settingsShort")}</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>{tUi("settings.catalogs")}</p>
        </div>

        <div className="pms-settings-groups" style={{ padding: '0 12px', flex: 1, overflowY: 'auto' }}>
          {groups.map(group => {
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
                  <span>{labelUi(group.name)}</span>
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
  useI18n();
  const roles = ['HOTEL_OWNER', 'FRONT_DESK', 'HOUSEKEEPING', 'ACCOUNTANT'];
  const actions = [['rooms.view', 'Xem sơ đồ phòng'], ['reservations.view', 'Xem đặt phòng'], ['reservations.write', 'Tạo / sửa / đổi trạng thái booking'], ['housekeeping.write', 'Cập nhật buồng phòng'], ['payments.write', 'Thanh toán / hoàn tiền / phụ thu'], ['reports.view', 'Báo cáo'], ['settings.write', 'Cài đặt khách sạn'], ['users.write', 'Quản lý người dùng']];
  return <div><h2 style={{ fontSize: 18 }}>{tUi("settings.roleDefaults")}</h2><p style={{ color: '#64748b', fontSize: 13 }}>{tUi("settings.rolesHint")}</p><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={thStyle}>{tUi("common.actions")}</th>{roles.map(r => <th key={r} style={thStyle}>{labelUi(ROLE_NAMES[r])}</th>)}</tr></thead><tbody>{actions.map(([action, name]) => <tr key={action}><td style={tdStyle}>{labelUi(name)}</td>{roles.map(r => <td key={r} style={tdStyle}>{ROLE_ACTIONS[r].includes('*') || ROLE_ACTIONS[r].includes(action) ? '✓' : '—'}</td>)}</tr>)}</tbody></table></div>;
}

function MasterGrid({ catalog, title, description, fields, rows, transform, activation = false, searchable = false }) {
  useI18n();
  const pms = usePms();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const list = (rows || pms[catalog] || []).filter(row => !searchable || ((!category || row.category === category) && `${row.name} ${row.id}`.toLowerCase().includes(query.toLowerCase())));
  const blank = () => Object.fromEntries(fields.map(f => [f.key, f.default ?? (f.type === 'number' ? 0 : '')]));
  const [draft, setDraft] = useState(blank);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const reset = () => { setDraft(blank()); setEditing(false); setError(''); setMessage(''); };
  const edit = row => { setDraft({ ...row }); setEditing(true); setError(''); setMessage(''); };
  const save = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const item = { ...draft };
      if (catalog === 'roomTypes' && !item.code?.trim()) {
        if (!editing || (pms[catalog] || []).find(row => row.id === item.id)?.code) throw new Error('Vui lòng nhập mã loại phòng.');
        delete item.code;
      }
      for (const field of fields) if (field.type === 'number') item[field.key] = field.key === 'capacity' ? Number(item[field.key]) : String(item[field.key]);
      if (!editing && item.id && (pms[catalog] || []).some(row => row.id === item.id)) throw new Error('Mã đã tồn tại. Hãy chọn Sửa ở bản ghi cần thay đổi.');
      if (!editing) delete item.id;
      await pms.saveMaster(catalog, transform ? transform(item) : item);
      setDraft(blank()); setEditing(false); setError(''); setMessage('Đã lưu vào danh mục của khách sạn hiện tại.');
    } catch (err) { setError(err.message); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const toggle = async id => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setMessage('');
    try { await pms.toggleMaster(catalog, id); }
    catch (err) { setError(err.message); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <div style={{ width: '100%', marginBottom: 24 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div><h2 style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px' }}>{labelUi(title)}</h2><p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{description}</p></div>
      {editing && <button type="button" disabled={busy} style={btnStyle('#fff', '#475569')} onClick={reset}><X size={16} />{' '}{tUi("common.cancel")}</button>}
    </div>
    {searchable && <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}><select aria-label={tUi("settings.itemFilter")} value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, width: 220 }}><option value="">{tUi("common.allCategories")}</option>{fields.find(f => f.key === 'category')?.options?.map(c => <option key={c}>{c}</option>)}</select><div style={{ position: 'relative', flex: 1 }}><Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} /><input aria-label={tUi("inventory.searchItems")} value={query} onChange={e => setQuery(e.target.value)} placeholder={tUi("settings.itemSearch")} style={{ ...inputStyle, paddingLeft: 36 }} /></div></div>}
    {error && <p role="alert" style={{ color: '#dc2626' }}>{error}</p>}{message && <p role="status" style={{ color: '#059669' }}>{labelUi(message)}</p>}
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{fields.map(f => <th key={f.key} style={thStyle}>{f.label}</th>)}{activation && <th style={thStyle}>{tUi("common.activate")}</th>}<th style={thStyle}>{tUi("common.actions")}</th></tr></thead><tbody>
      {list.map(row => <tr key={row.id} style={{ opacity: row.active === false ? 0.55 : 1 }}>{fields.map(f => <td key={f.key} style={tdStyle}>{f.type === 'checkbox' ? <input type="checkbox" checked={!!row[f.key]} readOnly disabled /> : f.type === 'number' ? Number(row[f.key] || 0).toLocaleString(getIntlLocale()) : f.key === 'category' ? <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 'bold' }}>{row[f.key]}</span> : f.key === 'code' ? row.code || tUi("common.unsetCode") : f.options?.find(o => o.value === row[f.key])?.label ?? row[f.key]}</td>)}{activation && <td style={tdStyle}><Toggle isOn={row.active !== false} disabled={busy} label={`Kích hoạt ${row.name}`} onToggle={() => toggle(row.id)} /></td>}<td style={tdStyle}><div style={{ display: 'flex', gap: 8 }}><button disabled={busy} aria-label={`Sửa ${row.name}`} style={{ border: 0, background: 'none', color: '#3b82f6', cursor: 'pointer' }} onClick={() => edit(row)}><Edit2 size={16} /></button><button disabled={busy} aria-label={`${row.active === false ? tUi("common.on") : tUi("common.off")} ${row.name}`} title="Bật/tắt sử dụng; giữ lịch sử đã có" style={{ border: 0, background: 'none', color: row.active === false ? '#10b981' : '#ef4444', cursor: 'pointer' }} onClick={() => toggle(row.id)}><Trash2 size={16} /></button></div></td></tr>)}
      {!list.length && <tr><td style={tdStyle} colSpan={fields.length + (activation ? 2 : 1)}>{tUi("settings.noCatalog")}</td></tr>}
      <tr style={{ background: '#f0fdf4' }}>{fields.map(f => <td key={f.key} style={{ ...tdStyle, padding: 8 }}>{f.type === 'checkbox' ? <input disabled={busy} aria-label={f.label} type="checkbox" checked={!!draft[f.key]} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.checked }))} /> : f.options ? <select disabled={busy} aria-label={f.label} value={draft[f.key] ?? ''} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} style={{ ...inputStyle, padding: 6 }}><option value="">{tUi("common.select")}</option>{f.options.map(o => <option key={o.value ?? o} value={o.value ?? o} disabled={o.disabled}>{o.label ?? o}</option>)}</select> : <input disabled={busy} aria-label={f.label} type={f.type || 'text'} min={f.type === 'number' ? 0 : undefined} maxLength={f.key === 'code' ? 40 : undefined} readOnly={f.key === 'id' && editing} value={draft[f.key] ?? ''} placeholder={f.label} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} style={{ ...inputStyle, padding: 6 }} />}</td>)}{activation && <td style={tdStyle}><Toggle isOn={draft.active !== false} disabled={busy} label={tUi("settings.enableCatalog")} onToggle={() => setDraft(d => ({ ...d, active: d.active === false }))} /></td>}<td style={{ ...tdStyle, padding: 8 }}><button disabled={busy} style={{ ...btnStyle('#10b981', '#fff'), width: '100%' }} onClick={save}><Save size={16} /> {busy ? tUi("common.saving") : editing ? tUi("common.saveChanges") : tUi("common.save")}</button></td></tr>
    </tbody></table></div>
  </div>;
}

function BusinessProfile() {
  useI18n();
  const { settings, saveSettings, access } = usePms();
  const fields = [
    ['phone', 'Số điện thoại liên hệ', 'tel', 40],
    ['contactEmail', 'Email liên hệ', 'email', 254],
    ['website', 'Website', 'url', 2048],
    ['logoUrl', 'URL logo (HTTPS)', 'url', 2048],
    ['taxCode', 'Mã số thuế', 'text', 80],
    ['bankName', 'Ngân hàng', 'text', 160],
    ['bankAccount', 'Số tài khoản ngân hàng', 'text', 80],
    ['bankAccountName', 'Tên chủ tài khoản', 'text', 160],
  ];
  const [draft, setDraft] = useState(() => ({
    ...Object.fromEntries(fields.map(([key]) => [key, settings[key] || ''])),
    name: settings.name || '', currency: settings.currency || 'VND', address: settings.address || '',
    timezone: settings.timezone || 'Asia/Ho_Chi_Minh', defaultLanguage: settings.defaultLanguage || 'vi',
  }));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [logoError, setLogoError] = useState('');
  const saving = useRef(false);
  const canWrite = access('settings.write').allowed;
  const change = (key, value) => { setDraft(current => ({ ...current, [key]: value })); setMessage(''); setError(''); };
  const save = async event => {
    event.preventDefault();
    if (saving.current || !canWrite) return;
    saving.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const result = await saveSettings(draft);
      setDraft(current => Object.fromEntries(Object.keys(current).map(key => [key, result[key] ?? current[key]])));
      setMessage('Đã lưu hồ sơ khách sạn.');
    } catch (err) { setError(err.message); }
    finally { saving.current = false; setBusy(false); }
  };
  let logoUrl = '';
  try {
    const value = draft.logoUrl.trim();
    const url = new URL(value);
    if (value.length <= 2048 && /^https:\/\//i.test(value) && ![...value].some(char => /\s/.test(char) || char === '\\' || char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) && !/^https:\/\/[^/?#]*@/i.test(value) && url.protocol === 'https:' && !url.username && !url.password) logoUrl = value;
  } catch { /* Preview appears only for a valid HTTPS URL. */ }
  const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', minWidth: 0 };

  return (
    <form onSubmit={save} style={{ maxWidth: '800px' }} aria-busy={busy}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '24px' }}>{tUi("settings.hotelProfile")}</h2>
      <div className="pms-language-settings"><div><h3>{tUi("language.label")}</h3><p>{tUi("language.help")}</p></div><LanguageSwitcher /></div><fieldset disabled={busy || !canWrite} style={{ border: 0, padding: 0, margin: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <label style={fieldStyle}>{tUi("settings.hotelName")}<input type="text" required maxLength={160} value={draft.name} onChange={e => change('name', e.target.value)} style={inputStyle} />
        </label>
        <label style={fieldStyle}>{tUi("settings.baseCurrency")}<select value={draft.currency} onChange={e => change('currency', e.target.value)} style={inputStyle}>
            <option value="VND">{tUi("settings.vnd")}</option>
            <option value="USD">USD - US Dollar</option>
          </select>
        </label>
        <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>{tUi("common.address")}<input type="text" maxLength={500} value={draft.address} onChange={e => change('address', e.target.value)} style={inputStyle} />
        </label>
        {fields.map(([key, label, type, maximum]) => <label key={key} style={fieldStyle}>{labelUi(label)}
          <input type={type} maxLength={maximum} value={draft[key]} onChange={e => change(key, e.target.value)} style={inputStyle} placeholder={key === 'logoUrl' ? 'https://...' : undefined} />
        </label>)}
        <label style={fieldStyle}>{tUi("settings.timezone")}<input type="text" required maxLength={100} value={draft.timezone} onChange={e => change('timezone', e.target.value)} placeholder="Asia/Ho_Chi_Minh" style={inputStyle} />
        </label>
        <label style={fieldStyle}>{tUi("settings.profileLanguage")}<select value={draft.defaultLanguage} onChange={e => change('defaultLanguage', e.target.value)} style={inputStyle}><option value="vi">{tUi("language.vietnamese")}</option><option value="en">English</option></select>
        </label>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{tUi("language.profileHelp")}</p>
      {logoUrl && (logoError === logoUrl ? <p role="status">{tUi("settings.logoError")}</p> : <img key={logoUrl} src={logoUrl} alt={`Logo ${draft.name || tUi("common.hotelLower")}`} referrerPolicy="no-referrer" loading="lazy" onError={() => setLogoError(logoUrl)} style={{ maxWidth: '100%', width: 160, height: 100, objectFit: 'contain' }} />)}
      {draft.logoUrl.trim() && !logoUrl && <p>{tUi("settings.logoHint")}</p>}
      <button type="submit" style={{ ...btnStyle('var(--accent-primary)', '#fff'), marginTop: 24 }}><Save size={16} aria-hidden="true" /> {busy ? tUi("common.saving") : tUi("profile.save")}</button>
      </fieldset>
      <div style={{ marginTop: '24px' }}>
        {error && <p role="alert" style={{ color: '#dc2626' }}>{error}</p>}{message && <p role="status">{labelUi(message)}</p>}
      </div>
      {!canWrite && <p role="status">{tUi("settings.profileReadOnly")}</p>}
    </form>
  );
}

function BusinessPolicies() {
  useI18n();
  const { settings, saveSettings, access } = usePms();
  const [draft, setDraft] = useState(() => ({ checkInTime: settings.checkInTime, checkOutTime: settings.checkOutTime, policies: settings.policies || '' }));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const canWrite = access('settings.write').allowed;
  const save = async event => {
    event.preventDefault();
    if (working.current || !canWrite) return;
    working.current = true; setBusy(true); setMessage(''); setError('');
    try { await saveSettings(draft); setMessage('Đã lưu chính sách nhận/trả phòng.'); }
    catch (err) { setError(err.message); }
    finally { working.current = false; setBusy(false); }
  };

  return (
    <form onSubmit={save} aria-busy={busy} data-workspace-draft style={{ width: '100%' }}>
      <fieldset disabled={busy || !canWrite} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>{tUi("settings.checkInPolicy")}</h2>
        <button type="submit" style={btnStyle('var(--accent-primary)', '#fff')}><Save size={16}/> {busy ? tUi("common.saving") : tUi("settings.savePolicy")}</button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="policy-checkin" style={{ fontSize: '13px', fontWeight: 'bold' }}>{tUi("settings.checkInTime")}</label>
          <input id="policy-checkin" type="time" required value={draft.checkInTime} onChange={e => setDraft(d => ({ ...d, checkInTime: e.target.value }))} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="policy-checkout" style={{ fontSize: '13px', fontWeight: 'bold' }}>{tUi("settings.checkOutTime")}</label>
          <input id="policy-checkout" type="time" required value={draft.checkOutTime} onChange={e => setDraft(d => ({ ...d, checkOutTime: e.target.value }))} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label htmlFor="policy-content" style={{ fontSize: '13px', fontWeight: 'bold' }}>{tUi("settings.policyContent")}</label>
        {/* THAY THẾ RICH TEXT EDITOR LỖI THỜI BẰNG TEXTAREA GỌN NHẸ */}
        <textarea 
          id="policy-content" rows="8" maxLength={4000}
          value={draft.policies || ''} onChange={e => setDraft(d => ({ ...d, policies:e.target.value }))}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }} 
        />
        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{tUi("settings.policyHint")}</p>
      </div>
      </fieldset>
      {error && <p role="alert" style={{ color: '#dc2626' }}>{error}</p>}
      {message && <p role="status">{labelUi(message)}</p>}
      {!canWrite && <p role="status">{tUi("settings.policyReadOnly")}</p>}
    </form>
  );
}
function RoomTypesGrid() {
  useI18n();
  const { roomTypes, rooms } = usePms();
  const rows = roomTypes.map(t => ({ ...t, roomNumbers: rooms.filter(r => r.typeId === t.id && r.active !== false).map(r => r.id).join(', ') }));
  return <MasterGrid catalog="roomTypes" title={tUi("settings.roomTypes")} description={`Số lượng phòng hiện tại: ${rooms.filter(r=>r.active!==false).length}`} rows={rows} fields={[{ key: 'code', label: 'Mã' }, { key: 'name', label: 'Tên Loại Phòng' }, { key: 'roomNumbers', label: 'Danh sách số phòng' }, { key: 'capacity', label: 'Sức chứa', type: 'number', default: 2 }, { key: 'price', label: 'Giá niêm yết', type: 'number' }]} transform={item => ({ ...item, roomNumbers: item.roomNumbers.split(',').map(n => n.trim().replace(/^R(?=\d)/i, '')).filter(Boolean) })} />;
}

function ServiceCategories() {
  useI18n();
  const { serviceCategories, units } = usePms();
  return <><MasterGrid catalog="serviceCategories" title={tUi("settings.mergedServices")} description={tUi("settings.serviceCatalog")} fields={[{ key: 'name', label: 'Tên Nhóm (Danh mục)' }, { key: 'tax', label: 'VAT (%)', type: 'number' }]} />
    <MasterGrid catalog="services" title={tUi("settings.categoryServices")} description={tUi("settings.posServices")} fields={[{ key: 'name', label: 'Tên Dịch vụ' }, { key: 'category', label: 'Nhóm', options: serviceCategories.filter(c => c.active !== false).map(c => c.name) }, { key: 'price', label: 'Giá bán', type: 'number' }, { key: 'unit', label: 'Đơn vị tính', options: units.filter(u => u.active !== false).map(u => u.name) }]} /></>;
}

function Meals() {
  useI18n();
  return <MasterGrid catalog="meals" title={tUi("settings.meals")} activation fields={[{key:"name",label:"Tên bữa ăn"},{key:"price",label:"Phụ thu",type:"number"}]} />;
}

function PaymentMethods() {
  useI18n();
  return <><MasterGrid catalog="paymentMethods" title={tUi("payments.method")} activation fields={[{key:"name",label:"Tên phương thức"},{key:"type",label:"Loại",options:["CASH","BANK_TRANSFER","CREDIT_CARD","DEBIT_CARD","E_WALLET","CITY_LEDGER"]}]} /><MasterGrid catalog="funds" title={tUi("payments.fund")} activation fields={[{key:"name",label:"Tên quỹ"},{key:"type",label:"Loại",options:["cash","bank"]},{key:"currency",label:"Tiền tệ",options:["VND","USD"],default:"VND"},{key:"accountNumber",label:"Số tài khoản"},{key:"bank",label:"Ngân hàng"}]} /></>;
}

function ExchangeRates() {
  useI18n();
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
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>{tUi("settings.currency")}</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{tUi("settings.currencyHint")}</p>
        </div>
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxWidth: '600px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>{tUi("settings.currencyType")}</th>
              <th style={{...thStyle, width: '200px'}}>{tUi("settings.exchangeRate")}</th>
              <th style={{...thStyle, width: '100px', textAlign: 'center'}}>{tUi("common.activate")}</th>
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
                    <Toggle isOn={r.active} label={`Kích hoạt tỷ giá ${r.code}`} onToggle={() => toggleRate(idx)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '16px' }}>
        <button style={btnStyle('var(--accent-primary)', '#fff')}><Save size={16}/>{' '}{tUi("settings.saveRate")}</button>
      </div>
    </div>
  );
}

function AdvancedSecurity() {
  useI18n();
  const [mfa, setMfa] = useState(false);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>{tUi("settings.advancedSecurity")}</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{tUi("settings.securityIntro")}</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <ShieldCheck size={24} color="#4338ca" />
          </div>
          <div>
            <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '16px', marginBottom: '4px' }}>{tUi("settings.twoFactorFeature")}{' '}{mfa ? tUi("settings.isOn") : tUi("settings.isOff")}</div>
            <div style={{ color: '#475569', fontSize: '13px', lineHeight: '1.5', maxWidth: '600px' }}>{tUi("settings.twoFactorHint")}<br/><br/>
              <em>{tUi("settings.chainHint")}</em>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '8px' }}>
          <Toggle isOn={mfa} label={tUi("settings.twoFactor")} onToggle={() => setMfa(!mfa)} />
        </div>
      </div>
    </div>
  );
}

function BookingSources() {
  useI18n();
  const [filterType, setFilterType] = useState('Travel Agency');
  
  const { bookingSources: sources, saveMaster, toggleMaster, access } = usePms();
  const [draft, setDraft] = useState({ name: '', commission: 0, email: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const canWrite = access('settings.write').allowed;
  const toggleOta = async id => {
    if (working.current || !canWrite) return;
    working.current = true; setBusy(true); setError(''); setMessage('');
    try { await toggleMaster('bookingSources', id); setMessage('Đã cập nhật trạng thái nguồn đặt phòng.'); }
    catch (err) { setError(err.message); }
    finally { working.current = false; setBusy(false); }
  };
  const save = async event => {
    event.preventDefault();
    if (working.current || !canWrite) return;
    working.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await saveMaster('bookingSources', { ...draft, type: filterType, commission: Number(draft.commission) });
      setDraft({ name: '', commission: 0, email: '' }); setMessage('Đã lưu nguồn đặt phòng.');
    } catch (err) { setError(err.message); }
    finally { working.current = false; setBusy(false); }
  };

  const filteredSources = sources.filter(s => s.type === filterType);
  const showCommissionAndEmail = ['OTA', 'Travel Agency', 'Corporate', 'Reference'].includes(filterType);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>{tUi("settings.sourcesPartners")}</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{tUi("settings.sourceIntro")}</p>
        </div>
        {filterType === 'OTA' && (
          <AccessLink to="/id/settings?section=channels" aria-disabled={busy} onClick={event => { if (busy) event.preventDefault(); }} style={{ ...btnStyle('#3b82f6', '#fff'), textDecoration: 'none' }}><RefreshCw size={16} aria-hidden="true" />{' '}{tUi("nav.channelManagement")}</AccessLink>
        )}
      </div>

      <form onSubmit={save} aria-busy={busy} data-workspace-draft>
      <fieldset disabled={busy || !canWrite} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['Travel Agency', 'Corporate', 'OTA', 'Direct', 'Reference'].map(type => (
          <button 
            key={type}
            type="button"
            aria-pressed={filterType === type}
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

        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>{tUi("settings.partnerName")}</th>
                {showCommissionAndEmail && <th style={{...thStyle, width: '120px', textAlign: 'center'}}>{tUi("settings.commissionPercent")}</th>}
                {showCommissionAndEmail && <th style={thStyle}>{tUi("common.email")}</th>}
                <th style={{...thStyle, width: '100px', textAlign: 'center'}}>{tUi("common.actions")}</th>
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
                      <button type="button" aria-label={`Sửa ${s.name}`} onClick={() => { setDraft({ ...s, email: s.email || '' }); setMessage(''); setError(''); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#3b82f6' }}><Edit2 size={16}/></button>
                      <button type="button" aria-label={`Bật tắt ${s.name}`} onClick={() => toggleOta(s.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {/* IN-LINE EDIT (Thêm Đối Tác Nhanh) */}
              <tr style={{ backgroundColor: '#f0fdf4' }}>
                <td style={{...tdStyle, padding: '8px'}}><input type="text" required maxLength={160} aria-label={tUi("settings.sourceName")} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder={`Tên đối tác ${filterType}...`} style={{...inputStyle, padding: '6px'}} /></td>
                {showCommissionAndEmail && <td style={{...tdStyle, padding: '8px'}}><input type="number" required aria-label={tUi("settings.sourceCommission")} value={draft.commission} min="0" max="100" step="0.0001" onChange={e => setDraft(d => ({ ...d, commission: e.target.value }))} placeholder="%" style={{...inputStyle, padding: '6px', textAlign: 'center'}} /></td>}
                {showCommissionAndEmail && <td style={{...tdStyle, padding: '8px'}}><input type="email" maxLength={254} aria-label={tUi("settings.sourceEmail")} value={draft.email} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} placeholder={tUi("settings.optionalEmail")} style={{...inputStyle, padding: '6px'}} /></td>}
                <td style={{...tdStyle, textAlign: 'center', padding: '8px'}}>
                  <button type="submit" style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>{busy ? tUi("common.saving") : tUi("common.save")}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </fieldset>
      {error && <p role="alert" style={{ color: '#dc2626' }}>{error}</p>}{message && <p role="status">{labelUi(message)}</p>}
      {!canWrite && <p role="status">{tUi("settings.sourceReadOnly")}</p>}
      </form>
    </div>
  );
}

function BedTypes() {
  useI18n();
  return <MasterGrid catalog="bedTypes" title={tUi("settings.beds")} fields={[{ key: "name", label: "Tên loại giường" }]} />;
}

function Units() {
  useI18n();
  return <MasterGrid catalog="units" title={tUi("inventory.unit")} fields={[{ key: 'name', label: 'Tên Đơn vị tính' }]} />;
}

function CashbookCategories() {
  useI18n();
  return <MasterGrid catalog="cashbookCategories" title={tUi("settings.cashCategories")}
    description={tUi("settings.cashCategoryHint")}
    activation fields={[
      { key: 'name', label: 'Tên danh mục thu chi' },
      { key: 'type', label: 'Loại thu chi', default: 'INCOME', options: [
        { value: 'INCOME', label: 'Khoản thu' }, { value: 'EXPENSE', label: 'Khoản chi' },
      ] },
    ]} />;
}

function Commissions() {
  useI18n();
  const { commissionTypes } = usePms();
  const [activeTab, setActiveTab] = useState('settlements');
  const typeOptions = commissionTypes.map(type => ({
    value: type.id,
    label: type.name + (type.active === false ? ' (ngừng sử dụng)' : ''),
    disabled: type.active === false,
  }));

  return <div style={{ width: '100%' }}>
    <div className="pms-settings-tabs">
      <button type="button" aria-pressed={activeTab === 'settlements'} style={subTabStyle(activeTab === 'settlements')} onClick={() => setActiveTab('settlements')}>{tUi("settings.settleCommission")}</button>
      <button type="button" aria-pressed={activeTab === 'types'} style={subTabStyle(activeTab === 'types')} onClick={() => setActiveTab('types')}>{tUi("settings.commissionCostType")}</button>
      <button type="button" aria-pressed={activeTab === 'subjects'} style={subTabStyle(activeTab === 'subjects')} onClick={() => setActiveTab('subjects')}>{tUi("settings.commissionRecipient")}</button>
    </div>
    {activeTab !== 'settlements' && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{tUi("settings.commissionCatalogHint")}</p>}
    {activeTab === 'settlements' ? <CommissionPage /> : activeTab === 'types' ? <MasterGrid key="commissionTypes" catalog="commissionTypes"
      title={tUi("settings.commissionCostType")} description={tUi("settings.addCostFirst")}
      activation fields={[{ key: 'name', label: 'Tên loại chi phí hoa hồng' }]} /> : <>
      {!commissionTypes.some(type => type.active !== false) && <p role="status">{tUi("settings.activeCostRequired")}</p>}
      <MasterGrid key="commissionRules" catalog="commissionRules" title={tUi("settings.commissionRecipient")}
        description={tUi("settings.commissionRecipientHint")}
        activation fields={[
          { key: 'name', label: 'Tên đối tượng nhận hoa hồng' },
          { key: 'typeId', label: 'Loại chi phí hoa hồng', options: typeOptions },
        ]} />
    </>}
  </div>;
}
