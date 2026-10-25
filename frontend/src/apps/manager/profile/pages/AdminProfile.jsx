import { getIntlLocale } from '../../../../shared/i18n/store.js';
import { t as tUi, useI18n } from '../../../../shared/i18n/useI18n.js';
import { useEffect, useState } from 'react';
import { usePms } from '../../../pms/data/usePms';
import '../../tenants/pages/AdminTenants.css';

const dateText = value => new Date(value).toLocaleString(getIntlLocale());
export default function AdminProfile() {
  const { authGeneration } = usePms();
  return <ProfileWorkspace key={authGeneration} />;
}
function ProfileWorkspace() {
  useI18n();
  const { user, saveOwnProfile, changePassword, getOwnSessions, revokeOtherSessions } = usePms();
  const [name, setName] = useState(user?.name || ''), [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmation: '' });
  const [sessionData, setSessionData] = useState({ revision: -1, rows: [], error: '' }), [revision, setRevision] = useState(0), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  useEffect(() => {
    let cancelled = false;
    getOwnSessions().then(data => { if (!cancelled) setSessionData({ revision, rows: data.sessions || [], error: '' }); })
      .catch(failure => { if (!cancelled) setSessionData({ revision, rows: [], error: failure.message }); });
    return () => { cancelled = true; };
  }, [getOwnSessions, revision]);
  const loading = sessionData.revision !== revision;
  const sessions = loading ? [] : sessionData.rows;
  const sessionError = loading ? '' : sessionData.error;
  async function run(action, success) {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await action(); setMessage(success); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  function saveProfile(event) {
    event.preventDefault();
    run(() => saveOwnProfile(name), 'Đã lưu họ tên trên máy chủ.');
  }
  function savePassword(event) {
    event.preventDefault();
    run(async () => {
      if (passwords.newPassword !== passwords.confirmation) throw new Error('Mật khẩu xác nhận không khớp.');
      await changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirmation: '' }); setRevision(value => value + 1);
    }, 'Đã đổi mật khẩu và thu hồi các phiên khác.');
  }
  return <div className="manager-page manager-self-profile">
    <div className="manager-page-heading"><div><span className="manager-eyebrow">Tài khoản quản trị</span><h2>Hồ sơ & bảo mật</h2><p>Thông tin cá nhân và các phiên đăng nhập của bạn.</p></div></div>
    {(error || sessionError) && <p className="customer-error" role="alert">{error || sessionError}</p>}{message && <p className="customer-success" role="status">{message}</p>}
    <section className="manager-panel"><h3>{tUi("profile.info")}</h3><form onSubmit={saveProfile}><div className="customer-form-grid"><label>{tUi("common.fullName")}<input required maxLength={160} value={name} disabled={busy} onChange={event => setName(event.target.value)} /></label><label>{tUi("auth.email")}<input readOnly type="email" value={user?.email || ''} /></label></div><p className="customer-hint">{user?.globalRole === 'SUPER_ADMIN' ? 'Super Admin' : 'System Manager'} · Email đăng nhập được giữ cố định.</p><div><button className="manager-button manager-button-primary" type="submit" disabled={busy || name.trim() === user?.name}>{busy ? tUi("common.saving") : 'Lưu họ tên'}</button></div></form></section>
    <section className="manager-panel"><h3>{tUi("profile.password")}</h3><form onSubmit={savePassword}><div className="customer-form-grid"><label>{tUi("profile.currentPassword")}<input required type="password" autoComplete="current-password" maxLength={128} value={passwords.currentPassword} disabled={busy} onChange={event => setPasswords(value => ({ ...value, currentPassword: event.target.value }))} /></label><label>{tUi("profile.newPassword")}<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={passwords.newPassword} disabled={busy} onChange={event => setPasswords(value => ({ ...value, newPassword: event.target.value }))} /></label><label>{tUi("profile.confirmPassword")}<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={passwords.confirmation} disabled={busy} onChange={event => setPasswords(value => ({ ...value, confirmation: event.target.value }))} /></label></div><p className="customer-hint">Từ 12 đến 128 ký tự. Các phiên đăng nhập khác sẽ được thu hồi khi đổi mật khẩu.</p><div><button className="manager-button manager-button-primary" type="submit" disabled={busy}>{busy ? tUi("common.saving") : tUi("profile.password")}</button></div></form></section>
    <section className="manager-panel manager-profile-sessions"><h3>{tUi("profile.session")}</h3><p className="customer-hint">Danh sách các phiên còn hiệu lực của chính tài khoản này.</p>{loading ? <p role="status">Đang tải phiên…</p> : <ul className="manager-session-list">{sessions.map((session, index) => <li key={session.createdAt + ':' + index}><strong>{session.current ? tUi("profile.currentSession") : tUi("profile.otherSession")}</strong><small>{tUi("auth.signIn")}{' '}{dateText(session.createdAt)}</small><small>Hết hạn {dateText(session.expiresAt)}</small></li>)}</ul>}<div className="customer-actions"><button className="manager-button" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>{tUi("common.reload")}</button><button className="manager-button" disabled={busy || loading || !sessions.some(row => !row.current)} onClick={() => run(async () => { await revokeOtherSessions(); setRevision(value => value + 1); }, 'Đã thu hồi các phiên khác. Phiên hiện tại vẫn hoạt động.')}>{tUi("profile.revokeOthers")}</button></div></section>
  </div>;
}
