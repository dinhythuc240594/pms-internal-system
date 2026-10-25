import { getIntlLocale } from '../../../shared/i18n/store.js';
import { t as tUi, tr as labelUi, useI18n } from '../../../shared/i18n/useI18n.js';
import { useEffect, useRef, useState } from 'react';
import { Bell, RefreshCw, X } from 'lucide-react';
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
  const { apiText } = useI18n();
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
    <button type="button" className="pms-topbar-icon pms-notification-trigger" aria-haspopup="dialog" aria-label={tUi('errors.notification') + (unreadCount ? ': ' + tUi('notification.unreadCount', { count: unreadCount }) : '')} onClick={() => { if (!open) { setOpen(true); if (!loading) setRevision(value => value + 1); } }}><Bell size={19} aria-hidden="true" />{unreadCount > 0 && <span aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}</button>
    {open && <LegacyOverlay title={tUi("notification.title")} onClose={() => { if (!busy) setOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#09182866', display: 'grid', placeItems: 'center', padding: 16 }}><section className="pms-domain-page pms-notification-dialog">
      <header className="domain-toolbar"><div><h1>{tUi("errors.notification")}</h1><p>{tUi('notification.unreadCount', { count: unreadCount })} · {pms.tenant?.name}</p></div><button type="button" disabled={busy} aria-label={tUi("errors.close")} onClick={() => setOpen(false)}><X size={18} aria-hidden="true" /></button></header>
      <div className="domain-fields"><button type="button" aria-pressed={!editing} disabled={busy} onClick={() => setEditing(false)}>{tUi("notification.history")}</button>{canConfigure && <button type="button" aria-pressed={editing} disabled={busy} onClick={() => act(openPreferences)}>{tUi("notification.recipients")}</button>}<button type="button" disabled={busy || loading} onClick={() => editing ? act(openPreferences) : setRevision(value => value + 1)}><RefreshCw size={16} aria-hidden="true" />{tUi("common.reload")}</button></div>
      {error && <p role="alert" className="domain-error">{error}</p>}{message && <p role="status">{message}</p>}
      {!readMarkerAccess.allowed && <p role="status">{readMarkerAccess.message}{' '}{tUi("notification.readOnly")}</p>}
      {editing && preferences ? <form onSubmit={savePreferences}><p>{tUi("notification.preferenceHint")}</p><fieldset disabled={busy || !canConfigure} className="pms-notification-preferences"><table><thead><tr><th>{tUi("notification.event")}</th>{preferences.availableRoles.map(role => <th key={role}>{labelUi(ROLE_NAMES[role]) || role}</th>)}</tr></thead><tbody>{preferences.events.map(event => <tr key={event.code}><td>{apiText(event.name)}</td>{preferences.availableRoles.map(role => <td key={role}><input type="checkbox" aria-label={`${apiText(event.name)}: ${labelUi(ROLE_NAMES[role]) || role}`} checked={event.roles.includes(role)} onChange={change => setPreferences(old => ({ ...old, events: old.events.map(row => row.code === event.code ? { ...row, roles: change.target.checked ? [...row.roles, role] : row.roles.filter(value => value !== role) } : row) }))} /></td>)}</tr>)}</tbody></table><button type="submit" className="primary">{busy ? tUi("common.saving") : tUi("notification.saveRecipients")}</button></fieldset></form> : <>
        <div className="domain-fields"><label>{tUi("common.list")}<select value={String(unreadOnly)} disabled={busy || loading} onChange={event => setUnreadOnly(event.target.value === 'true')}><option value="false">{tUi("notification.all")}</option><option value="true">{tUi("notification.unread")}</option></select></label><button type="button" disabled={busy || loading || !unreadCount || !readMarkerAccess.allowed} onClick={() => act(async () => { await pms.requestTenant('/notifications/read-all', { method: 'POST', body: {} }); if (active.current) setRevision(value => value + 1); })}>{tUi("notification.readAll")}</button></div>
        {loading ? <p role="status">{tUi("notification.loading")}</p> : <ul className="pms-notification-list">{items.map(item => <li key={item.id}><div><strong>{apiText(item.title)}</strong><p>{apiText(item.body)}</p><small>{new Date(item.createdAt).toLocaleString(getIntlLocale(), { timeZone: pms.settings.timezone })} · {item.readAt ? tUi("notification.read") : tUi("notification.unread")}</small></div>{!item.readAt && <button type="button" disabled={busy || !readMarkerAccess.allowed} onClick={() => act(() => markRead(item))}>{tUi("notification.markRead")}</button>}</li>)}{!items.length && !error && <li>{tUi("notification.empty")}</li>}</ul>}
        {nextBefore && <button type="button" disabled={busy || loading} onClick={() => act(loadMore)}>{tUi("notification.older")}</button>}
      </>}
    </section></LegacyOverlay>}
  </>;
}
