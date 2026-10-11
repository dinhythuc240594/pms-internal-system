import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Plus, RefreshCw, Search, X } from 'lucide-react';
import { usePms } from '../../../pms/data/usePms';
import LegacyOverlay from '../../../pms/components/LegacyOverlay';
import { ROLE_NAMES } from '../../../pms/data/access';
import { bookingEvent } from '../../../pms/data/presentation';
import { matchesSubscriptionState, subscriptionState, subscriptionStatusLabels } from '../../billing/subscriptionStatus';
import './AdminTenants.css';

const fields = [['name', 'Tên khách sạn', 160], ['contactName', 'Người liên hệ', 160], ['contactEmail', 'Email liên hệ', 254], ['contactPhone', 'Điện thoại / Zalo', 40], ['address', 'Địa chỉ', 500], ['city', 'Tỉnh / Thành phố', 160], ['taxId', 'Mã số thuế', 40], ['domain', 'Tên miền', 253]];
const roles = ['HOTEL_OWNER', 'FRONT_DESK', 'HOUSEKEEPING', 'ACCOUNTANT'];
const freshStaff = () => ({ name: '', email: '', password: '', role: 'FRONT_DESK', active: true });
const dateText = value => value ? new Date(value).toLocaleString('vi-VN') : '—';
const eventNames = { 'tenant.created': 'Tạo khách sạn', 'tenant.updated': 'Cập nhật hồ sơ / trạng thái', 'membership.created': 'Tạo tài khoản khách sạn', 'membership.updated': 'Cập nhật quyền tài khoản', 'subscription.updated': 'Đổi gói / gia hạn' };
const overlayStyle = { position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(9,24,40,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 };

export default function AdminTenants() {
  const { authGeneration } = usePms();
  return <CustomersWorkspace key={authGeneration} />;
}

function CustomersWorkspace() {
  const { tenants, saveTenant, getTenantSubscription } = usePms();
  const { searchQuery = '' } = useOutletContext() || {};
  const [search, setSearch] = useState(''), [status, setStatus] = useState('all'), [plan, setPlan] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [subscriptionData, setSubscriptionData] = useState({ tenants: null, revision: -1, rows: {}, error: '' }), [revision, setRevision] = useState(0);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [dialog, setDialog] = useState(null), [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    // shortcut: one subscription request per hotel; batch when hotel counts make loading slow.
    Promise.all(tenants.map(async row => [row.id, (await getTenantSubscription(row.id)).subscription]))
      .then(rows => { if (!cancelled) setSubscriptionData({ tenants, revision, rows: Object.fromEntries(rows), error: '' }); })
      .catch(failure => { if (!cancelled) setSubscriptionData({ tenants, revision, rows: {}, error: failure.message }); });
    return () => { cancelled = true; };
  }, [tenants, getTenantSubscription, revision]);
  const loading = subscriptionData.tenants !== tenants || subscriptionData.revision !== revision;
  const subscriptions = loading ? {} : subscriptionData.rows;
  const subscriptionsReady = !loading && !subscriptionData.error;
  const waitingForFilter = !subscriptionsReady && (plan !== 'all' || subscriptionFilter !== 'all');
  const noticeError = error || (loading ? '' : subscriptionData.error);
  const query = (search || searchQuery).trim().toLocaleLowerCase('vi');
  const rows = waitingForFilter ? [] : tenants.filter(row => [row.name, row.contactName, row.contactEmail, row.contactPhone, row.city, row.taxId].join(' ').toLocaleLowerCase('vi').includes(query) && (status === 'all' || row.status === status) && (plan === 'all' || subscriptions[row.id]?.planCode === plan) && matchesSubscriptionState(subscriptions[row.id], subscriptionFilter));
  async function toggle(row) {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await saveTenant({ id: row.id, status: row.status === 'active' ? 'suspended' : 'active' }); setMessage('Đã ' + (row.status === 'active' ? 'tạm ngưng ' : 'mở lại ') + row.name + '.'); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <div className="manager-page manager-customers">
    <div className="manager-page-heading"><div><span className="manager-eyebrow">Khách hàng SaaS</span><h2>Khách sạn & khách hàng</h2><p>Hồ sơ liên hệ, tài khoản và dịch vụ đang sử dụng.</p></div><button type="button" className="manager-button manager-button-primary" onClick={() => { setMessage(''); setDialog({}); }}><Plus size={16} /> Thêm khách sạn</button></div>
    <div className="customer-stats"><div className="manager-panel"><small>Khách sạn</small><strong>{tenants.length}</strong></div><div className="manager-panel"><small>Đang hoạt động</small><strong>{tenants.filter(row => row.status === 'active').length}</strong></div><div className="manager-panel"><small>Tạm ngưng</small><strong>{tenants.filter(row => row.status === 'suspended').length}</strong></div></div>
    {noticeError && <div className="customer-error" role="alert">{noticeError} <button className="manager-button" onClick={() => { setError(''); setRevision(value => value + 1); }}>Thử lại</button></div>}{message && <p className="customer-success" role="status">{message}</p>}
    <section className="manager-panel" aria-busy={loading}>
      <div className="customer-filters">
        <label className="customer-search"><Search size={16} /><input type="search" aria-label="Tìm khách hàng" placeholder="Khách sạn, liên hệ, SĐT, email…" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <label>Trạng thái khách sạn<select value={status} onChange={event => setStatus(event.target.value)}><option value="all">Tất cả</option><option value="active">Đang hoạt động</option><option value="suspended">Tạm ngưng</option></select></label>
        <label>Gói dịch vụ<select value={plan} disabled={!subscriptionsReady} onChange={event => setPlan(event.target.value)}><option value="all">Tất cả</option><option value="FREE">Miễn Phí</option><option value="PRO">Chuyên Nghiệp</option></select></label>
        <label>Trạng thái thuê bao<select value={subscriptionFilter} disabled={!subscriptionsReady} onChange={event => setSubscriptionFilter(event.target.value)}><option value="all">Tất cả</option>{Object.entries(subscriptionStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="button" className="manager-button" disabled={loading || busy} onClick={() => { setError(''); setRevision(value => value + 1); }}><RefreshCw size={16} aria-hidden="true" /> Tải lại thuê bao</button>
        <span role="status">{waitingForFilter ? loading ? 'Đang tải thuê bao…' : 'Chưa tải được thuê bao' : `${rows.length} kết quả`}</span>
      </div>
      <div className="manager-table-wrap" role="region" aria-label="Danh sách khách hàng" tabIndex={0}>
        <table className="manager-table customer-table">
          <thead><tr>{['Khách sạn', 'Đầu mối liên hệ', 'Gói dịch vụ / Thuê bao', 'Trạng thái khách sạn', 'Thao tác'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{waitingForFilter ? <tr><td colSpan={5} className="customer-empty" role="status">{loading ? 'Đang tải thuê bao để áp dụng bộ lọc…' : 'Chưa thể lọc thuê bao. Vui lòng tải lại dữ liệu.'}</td></tr> : rows.map(row => {
            const subscription = subscriptions[row.id];
            const state = subscriptionsReady ? subscriptionState(subscription) : null;
            const subscriptionAction = !subscriptionsReady ? 'Gói dịch vụ' : !subscription ? 'Cấp gói' : subscription.planCode === 'FREE' ? 'Đổi gói' : 'Gia hạn';
            return <tr key={row.id}>
              <td><strong>{row.name}</strong><small>{[row.city, (row.rooms || 0) + ' phòng'].filter(Boolean).join(' · ')}</small></td>
              <td><strong>{row.contactName || 'Chưa có liên hệ'}</strong><small>{row.contactEmail || '—'}</small><small>{row.contactPhone || '—'}</small></td>
              <td>{loading ? 'Đang tải…' : subscriptionData.error ? 'Chưa tải được' : <>{subscription?.planName || 'Chưa cấp gói'}<small><span className={'customer-subscription-status ' + state}>{subscriptionStatusLabels[state]}</span></small><small>{subscription?.endDate ? 'Hạn sử dụng ' + dateText(subscription.endDate) : subscription ? 'Không thời hạn' : ''}</small></>}</td>
              <td><span className={'customer-status ' + row.status}>{row.status === 'active' ? 'Đang hoạt động' : 'Tạm ngưng'}</span></td>
              <td><div className="customer-actions"><button className="manager-button" onClick={() => setDialog(row)}>Hồ sơ</button><Link className="manager-button" to={'/manager/billing?tenant=' + encodeURIComponent(row.id)} aria-label={subscriptionAction + ' cho ' + row.name}>{subscriptionAction}</Link><button className="manager-button" disabled={busy} onClick={() => toggle(row)}>{row.status === 'active' ? 'Tạm ngưng' : 'Mở lại'}</button></div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      {!waitingForFilter && !rows.length && <p className="customer-empty" role="status">{tenants.length ? 'Không có khách hàng khớp bộ lọc.' : 'Chưa có khách sạn. Thêm khách sạn để bắt đầu.'}</p>}
    </section>
    {dialog && <CustomerDialog key={dialog.id || 'new'} customer={dialog} onClose={() => setDialog(null)} onSaved={text => { setDialog(null); setMessage(text); }} />}
  </div>;
}

function CustomerDialog({ customer, onClose, onSaved }) {
  const { saveTenant, getManagedTenantUsers, saveManagedTenantUser, getCustomerHistory } = usePms();
  const [tab, setTab] = useState('profile'), [draft, setDraft] = useState({ ...Object.fromEntries(fields.map(([key]) => [key, customer[key] || ''])), customerNotes: customer.customerNotes || '', ownerName: '', ownerEmail: '', ownerPassword: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [panel, setPanel] = useState({ key: '', accounts: [], history: null, error: '' }), [revision, setRevision] = useState(0), [page, setPage] = useState(1);
  const [staff, setStaff] = useState(freshStaff);
  const loadKey = tab + ':' + page + ':' + revision;
  const loading = tab !== 'profile' && panel.key !== loadKey;
  const accounts = loading ? [] : panel.accounts;
  const history = loading ? null : panel.history;
  const panelError = error || (loading || tab === 'profile' ? '' : panel.error);
  useEffect(() => {
    if (!customer.id || tab === 'profile') return;
    let cancelled = false;
    const load = tab === 'users' ? getManagedTenantUsers(customer.id) : getCustomerHistory(customer.id, page);
    load.then(data => { if (!cancelled) setPanel({ key: loadKey, accounts: data.users || [], history: tab === 'history' ? data : null, error: '' }); })
      .catch(failure => { if (!cancelled) setPanel({ key: loadKey, accounts: [], history: null, error: failure.message }); });
    return () => { cancelled = true; };
  }, [customer.id, tab, loadKey, page, getManagedTenantUsers, getCustomerHistory]);
  const close = () => { if (!busy) onClose(); };
  async function saveProfile(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const { ownerName, ownerEmail, ownerPassword, ...profile } = draft;
      if (!customer.id) {
        if (!profile.contactName.trim()) delete profile.contactName;
        if (!profile.contactEmail.trim()) delete profile.contactEmail;
      }
      await saveTenant(customer.id ? { id: customer.id, ...profile } : { ...profile, ownerName, ownerEmail, ownerPassword });
      onSaved(customer.id ? 'Đã lưu hồ sơ khách hàng.' : 'Đã tạo khách sạn và tài khoản Owner. Cấp gói tại Gói cước & hóa đơn để bắt đầu.');
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  async function saveAccount(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await saveManagedTenantUser(customer.id, staff.id ? { id: staff.id, role: staff.role, active: staff.active } : staff);
      setStaff(freshStaff()); setMessage('Đã lưu tài khoản khách sạn.'); setRevision(value => value + 1);
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <LegacyOverlay title={customer.id ? 'Hồ sơ ' + customer.name : 'Thêm khách sạn'} onClose={close} style={overlayStyle}><div className="customer-dialog">
    <div className="customer-dialog-head"><div><span className="manager-eyebrow">Khách hàng SaaS</span><h2>{customer.id ? customer.name : 'Thêm khách sạn'}</h2></div><button type="button" className="manager-icon-button" aria-label="Đóng hồ sơ khách hàng" disabled={busy} onClick={close}><X size={18} /></button></div>
    {customer.id && <nav className="customer-tabs" aria-label="Nội dung hồ sơ">{[['profile', 'Hồ sơ'], ['users', 'Tài khoản'], ['history', 'Lịch sử']].map(([key, label]) => <button key={key} type="button" aria-pressed={tab === key} disabled={busy} onClick={() => { setTab(key); setError(''); setMessage(''); }}>{label}</button>)}</nav>}
    <div className="customer-dialog-body">{panelError && <p className="customer-error" role="alert">{panelError}{tab !== 'profile' && <button type="button" className="manager-button" onClick={() => setRevision(value => value + 1)}>Tải lại</button>}</p>}{message && <p className="customer-success" role="status">{message}</p>}
      {tab === 'profile' && <form id="customer-profile-form" onSubmit={saveProfile}><fieldset disabled={busy} className="customer-fieldset"><div className="customer-form-grid">{fields.map(([key, label, maxLength]) => <label key={key}>{label}<input type={key === 'contactEmail' ? 'email' : key === 'contactPhone' ? 'tel' : 'text'} required={key === 'name'} maxLength={maxLength} value={draft[key]} placeholder={key === 'domain' ? 'hotel.example.com' : undefined} onChange={event => setDraft(value => ({ ...value, [key]: event.target.value }))} /></label>)}</div><p className="customer-hint">Tên miền chỉ được ghi nhận trong hồ sơ. Cấu hình DNS / Tunnel được thực hiện riêng.</p><label>Ghi chú chăm sóc khách hàng<textarea rows={3} maxLength={4000} value={draft.customerNotes} onChange={event => setDraft(value => ({ ...value, customerNotes: event.target.value }))} /></label><p className="customer-hint">Ghi chú này chỉ dành cho quản trị hệ thống.</p>{!customer.id && <section className="customer-owner"><h3>Tài khoản chủ khách sạn</h3><p className="customer-hint">Email đăng nhập và thông tin liên hệ có thể khác nhau.</p><div className="customer-form-grid"><label>Họ tên Owner<input required maxLength={160} value={draft.ownerName} onChange={event => setDraft(value => ({ ...value, ownerName: event.target.value }))} /></label><label>Email đăng nhập Owner<input required type="email" maxLength={254} autoComplete="off" value={draft.ownerEmail} onChange={event => setDraft(value => ({ ...value, ownerEmail: event.target.value }))} /></label><label>Mật khẩu Owner<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={draft.ownerPassword} onChange={event => setDraft(value => ({ ...value, ownerPassword: event.target.value }))} /></label></div></section>}</fieldset></form>}
      {tab === 'users' && <><p className="customer-hint">Các tài khoản này chỉ có quyền trong khách sạn đã chọn.</p>{customer.status === 'suspended' && <p role="status" className="customer-hint">Khách sạn đang tạm ngưng. Mở lại khách sạn trước khi thay đổi tài khoản.</p>}{loading ? <p role="status">Đang tải tài khoản…</p> : <div className="manager-table-wrap"><table className="manager-table customer-accounts"><thead><tr><th scope="col">Tài khoản</th><th scope="col">Vai trò</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead><tbody>{accounts.map(row => <tr key={row.id}><td><strong>{row.name}</strong><small>{row.email}</small></td><td>{ROLE_NAMES[row.role] || row.role}</td><td>{row.active ? 'Hoạt động' : 'Đã khóa'}</td><td><button className="manager-button" disabled={busy || customer.status === 'suspended'} onClick={() => setStaff({ ...row, password: '' })}>Sửa quyền</button></td></tr>)}</tbody></table></div>}<form onSubmit={saveAccount}><fieldset disabled={busy || loading || customer.status === 'suspended'} className="customer-fieldset customer-owner"><h3>{staff.id ? 'Quyền của ' + staff.name : 'Thêm tài khoản'}</h3><div className="customer-form-grid">{!staff.id && <><label>Họ tên<input required maxLength={160} value={staff.name} onChange={event => setStaff(value => ({ ...value, name: event.target.value }))} /></label><label>Email đăng nhập<input required type="email" maxLength={254} value={staff.email} onChange={event => setStaff(value => ({ ...value, email: event.target.value }))} /></label><label>Mật khẩu<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={staff.password} onChange={event => setStaff(value => ({ ...value, password: event.target.value }))} /></label></>}<label>Vai trò<select value={staff.role} onChange={event => setStaff(value => ({ ...value, role: event.target.value }))}>{roles.map(role => <option key={role} value={role}>{ROLE_NAMES[role]}</option>)}</select></label><label>Trạng thái<select value={staff.active ? 'active' : 'inactive'} onChange={event => setStaff(value => ({ ...value, active: event.target.value === 'active' }))}><option value="active">Hoạt động</option><option value="inactive">Đã khóa</option></select></label></div><div className="customer-actions"><button type="submit" className="manager-button manager-button-primary">{busy ? 'Đang lưu…' : 'Lưu tài khoản'}</button>{staff.id && <button type="button" className="manager-button" onClick={() => setStaff(freshStaff())}>Hủy sửa</button>}</div></fieldset></form></>}
      {tab === 'history' && <>{loading ? <p role="status">Đang tải lịch sử…</p> : history?.auditLogs.length ? <ol className="customer-history">{history.auditLogs.map(row => <li key={row.id}><strong>{eventNames[row.event] || (row.event?.startsWith('reservation.') ? bookingEvent(row).label : 'Thao tác hệ thống')}</strong><span>{row.userName || 'Hệ thống'} · {dateText(row.createdAt)}</span></li>)}</ol> : !panelError && <p role="status">Chưa có thao tác được ghi nhận.</p>}{history && <div className="customer-pagination"><button className="manager-button" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button><span>Trang {page} · {history.pagination.totalItems} thao tác</span><button className="manager-button" disabled={loading || page * 20 >= history.pagination.totalItems} onClick={() => setPage(value => value + 1)}>Sau</button></div>}</>}
    </div>
    <div className="customer-dialog-footer">{customer.id && <><Link className="manager-button" to={'/manager/billing?tenant=' + encodeURIComponent(customer.id)}>Gói cước & hóa đơn</Link><Link className="manager-button" to="/manager/features">Tính năng</Link></>}<button type="button" className="manager-button" disabled={busy} onClick={close}>Đóng</button>{tab === 'profile' && <button type="submit" form="customer-profile-form" className="manager-button manager-button-primary" disabled={busy}>{busy ? 'Đang lưu…' : customer.id ? 'Lưu hồ sơ' : 'Tạo khách sạn'}</button>}</div>
  </div></LegacyOverlay>;
}
