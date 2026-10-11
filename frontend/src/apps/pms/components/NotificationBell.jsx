import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { usePms } from '../data/usePms';
import { ROLE_NAMES } from '../data/access';
import LegacyOverlay from './LegacyOverlay';
import './DomainForms.css';
import './NotificationBell.css';

export default function NotificationBell() {
  const pms = usePms();
  return <Inbox key={`${pms.tenantId}:${pms.user?.id}`} pms={pms} />;
}
function Inbox({ pms }) {
  const [open, setOpen] = useState(false), [unreadOnly, setUnreadOnly] = useState(false);
  const [items, setItems] = useState([]), [unreadCount, setUnreadCount] = useState(0), [nextBefore, setNextBefore] = useState(null);
  const [loaded, setLoaded] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const [preferences, setPreferences] = useState(null), [editing, setEditing] = useState(false), [message, setMessage] = useState('');
  const generation = useRef(0), active = useRef(true), inFlight = useRef(false);
  const { requestTenant } = pms;
  const loading = loaded?.requestTenant !== requestTenant || loaded?.unreadOnly !== unreadOnly || loaded?.revision !== revision;
  const canConfigure = pms.access('notifications.configure', undefined, true).allowed;
  const readMarkerAccess = pms.access('notifications.view', undefined, true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    const version = ++generation.current;
    let current = true;
    requestTenant('/notifications?' + new URLSearchParams({ limit: 50, ...(unreadOnly ? { unread: 'true' } : {}) }))
      .then(data => { if (current) { setItems(data.items); setUnreadCount(data.unreadCount); setNextBefore(data.nextBefore); setError(''); } })
      .catch(err => { if (current) { setItems([]); setNextBefore(null); setError(err.message); } })
      .finally(() => { if (current && version === generation.current) setLoaded({ requestTenant, unreadOnly, revision }); });
    return () => { current = false; };
  }, [requestTenant, unreadOnly, revision]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible' && !inFlight.current) setRevision(value => value + 1); };
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  async function act(callback) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setMessage('');
    try { await callback(); } catch (err) { if (active.current) setError(err.message); }
    finally { inFlight.current = false; if (active.current) setBusy(false); }
  }
  async function markRead(item) {
    if (!readMarkerAccess.allowed) return;
    const updated = await pms.requestTenant('/notifications/' + encodeURIComponent(item.id) + '/read', { method: 'POST', body: {} });
    if (!active.current) return;
    setItems(rows => unreadOnly ? rows.filter(row => row.id !== item.id) : rows.map(row => row.id === item.id ? updated : row));
    setUnreadCount(count => Math.max(0, count - 1));
  }
  async function loadMore() {
    const version = generation.current;
    const data = await pms.requestTenant('/notifications?' + new URLSearchParams({ limit: 50, before: nextBefore, ...(unreadOnly ? { unread: 'true' } : {}) }));
    if (active.current && version === generation.current) { setItems(rows => [...rows, ...data.items]); setNextBefore(data.nextBefore); setUnreadCount(data.unreadCount); }
  }
  async function openPreferences() {
    const result = await pms.requestTenant('/notifications/preferences');
    if (active.current) { setPreferences(result); setEditing(true); }
  }
  async function savePreferences(event) {
    event.preventDefault();
    await act(async () => {
      const result = await pms.requestTenant('/notifications/preferences', { method: 'PATCH', body: { events: preferences.events.map(row => ({ code: row.code, roles: row.roles })) } });
      if (active.current) { setPreferences(result); setMessage('Đã lưu nhóm người nhận cho các thông báo mới.'); }
    });
  }
  return <>
    <button type="button" className="pms-topbar-icon pms-notification-trigger" aria-haspopup="dialog" aria-label={`Thông báo${unreadCount ? `: ${unreadCount} chưa đọc` : ''}`} onClick={() => { setOpen(true); setRevision(value => value + 1); }}><Bell size={19} aria-hidden="true" />{unreadCount > 0 && <span aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}</button>
    {open && <LegacyOverlay title="Thông báo khách sạn" onClose={() => { if (!busy) setOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#09182866', display: 'grid', placeItems: 'center', padding: 16 }}><section className="pms-domain-page pms-notification-dialog">
      <header className="domain-toolbar"><div><h1>Thông báo</h1><p>{unreadCount} chưa đọc · {pms.tenant?.name}</p></div><button type="button" disabled={busy} aria-label="Đóng thông báo" onClick={() => setOpen(false)}><X size={18} aria-hidden="true" /></button></header>
      <div className="domain-fields"><button type="button" aria-pressed={!editing} disabled={busy} onClick={() => setEditing(false)}>Lịch sử thông báo</button>{canConfigure && <button type="button" aria-pressed={editing} disabled={busy} onClick={() => act(openPreferences)}>Nhóm người nhận</button>}<button type="button" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Tải lại</button></div>
      {error && <p role="alert" className="domain-error">{error}</p>}{message && <p role="status">{message}</p>}
      {!readMarkerAccess.allowed && <p role="status">{readMarkerAccess.message} Chưa thể đánh dấu thông báo đã đọc.</p>}
      {editing && preferences ? <form onSubmit={savePreferences}><p>Thông báo trong ứng dụng luôn được bật. Chọn vai trò nhận từng sự kiện tại khách sạn.</p><fieldset disabled={busy || !canConfigure} className="pms-notification-preferences"><table><thead><tr><th>Sự kiện</th>{preferences.availableRoles.map(role => <th key={role}>{ROLE_NAMES[role] || role}</th>)}</tr></thead><tbody>{preferences.events.map(event => <tr key={event.code}><td>{event.name}</td>{preferences.availableRoles.map(role => <td key={role}><input type="checkbox" aria-label={`${event.name}: ${ROLE_NAMES[role] || role}`} checked={event.roles.includes(role)} onChange={change => setPreferences(old => ({ ...old, events: old.events.map(row => row.code === event.code ? { ...row, roles: change.target.checked ? [...row.roles, role] : row.roles.filter(value => value !== role) } : row) }))} /></td>)}</tr>)}</tbody></table><button type="submit" className="primary">{busy ? 'Đang lưu…' : 'Lưu nhóm người nhận'}</button></fieldset></form> : <>
        <div className="domain-fields"><label>Danh sách<select value={String(unreadOnly)} disabled={busy} onChange={event => setUnreadOnly(event.target.value === 'true')}><option value="false">Tất cả thông báo</option><option value="true">Chưa đọc</option></select></label><button type="button" disabled={busy || !unreadCount || !readMarkerAccess.allowed} onClick={() => act(async () => { await pms.requestTenant('/notifications/read-all', { method: 'POST', body: {} }); if (active.current) setRevision(value => value + 1); })}>Đánh dấu tất cả đã đọc</button></div>
        {loading ? <p role="status">Đang tải thông báo…</p> : <ul className="pms-notification-list">{items.map(item => <li key={item.id}><div><strong>{item.title}</strong><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString('vi-VN', { timeZone: pms.settings.timezone })} · {item.readAt ? 'Đã đọc' : 'Chưa đọc'}</small></div>{!item.readAt && <button type="button" disabled={busy || !readMarkerAccess.allowed} onClick={() => act(() => markRead(item))}>Đánh dấu đã đọc</button>}</li>)}{!items.length && !error && <li>Chưa có thông báo phù hợp. Sự kiện mới của khách sạn sẽ xuất hiện tại đây.</li>}</ul>}
        {nextBefore && <button type="button" disabled={busy || loading} onClick={() => act(loadMore)}>Xem thông báo trước</button>}
      </>}
    </section></LegacyOverlay>}
  </>;
}
