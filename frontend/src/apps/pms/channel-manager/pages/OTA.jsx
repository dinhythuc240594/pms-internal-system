import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BedDouble, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, Info, KeyRound, Link2, Plus, RefreshCw, Settings2, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { usePms } from '../../data/usePms';
import { today, addDays } from '../../data/model';
import { useChannels } from '../useChannels';
import { connectionStatus, syncBlockReason } from '../presentation';
import '../ChannelManager.css';

export default function OTA() {
  const pms = usePms();
  return <ChannelWorkspace key={`${pms.tenantId}:${pms.user?.id}`} pms={pms} />;
}

function ChannelWorkspace({ pms }) {
  const query = useChannels();
  const [config, setConfig] = useState(null), [mapping, setMapping] = useState(null);
  const [range, setRange] = useState({ start: today(pms.settings.timezone), end: addDays(today(pms.settings.timezone), 7) });
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const active = useRef(true), inFlight = useRef(false), configButton = useRef(null), mappingButton = useRef(null), errorNotice = useRef(null), successNotice = useRef(null);
  const access = pms.access('channels.write', 'OTA_SYNC', true);
  const canWrite = access.allowed;
  const accessMessage = access.reason === 'role' ? 'Bạn đang ở chế độ chỉ xem. Chủ khách sạn có thể cấu hình và đồng bộ OTA.' : access.message;
  const connection = query.data?.connection;
  const rooms = query.data?.roomTypes || [], mappings = query.data?.mappings || [];
  const status = connectionStatus(connection);
  const pullReason = !canWrite ? accessMessage : syncBlockReason(connection, mappings, 'pull_bookings');
  const pushReason = !canWrite ? accessMessage : syncBlockReason(connection, mappings, 'push_ari');
  const mappedCount = mappings.filter(row => row.active && rooms.some(room => room.id === row.roomTypeId)).length;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { if (error) errorNotice.current?.focus(); else if (message) successNotice.current?.focus(); }, [error, message]);

  async function save(path, body) {
    if (inFlight.current || !canWrite) return;
    inFlight.current = true;
    setBusy(path === 'jobs' ? body.kind : path); setError(''); setMessage('');
    try {
      await pms.requestTenant('/channels/' + path, { method: path === 'jobs' ? 'POST' : 'PUT', body });
      if (!active.current) return;
      setConfig(null); setMapping(null); query.refresh();
      setMessage({ text: path === 'jobs' ? 'Đã thêm vào hàng đợi. Theo dõi kết quả tại Lịch sử đồng bộ.' : path === 'mappings' ? 'Đã lưu ghép nối loại phòng.' : 'Đã lưu cấu hình Channex.', queued: path === 'jobs' });
    } catch (err) { if (active.current) setError(err.message); }
    finally { inFlight.current = false; if (active.current) setBusy(''); }
  }

  function editConnection() {
    setError(''); setMessage('');
    setConfig({ environment: connection?.environment || 'staging', propertyId: connection?.propertyId || '', credentialRef: query.data.expectedCredentialRef, webhookSecretRef: query.data.expectedWebhookSecretRef, active: connection?.active ?? false });
  }
  function editMapping(row) {
    setError(''); setMessage('');
    setMapping(row ? { roomTypeId: row.roomTypeId, channexRoomTypeId: row.channexRoomTypeId, channexRatePlanId: row.channexRatePlanId, active: row.active } : { roomTypeId: rooms[0]?.id || '', channexRoomTypeId: '', channexRatePlanId: '', active: true });
  }

  return <div className="ota-page">
    <header className="ota-page-header">
      <div><p className="ota-eyebrow">PHÂN PHỐI & BÁN PHÒNG</p><h1>Kênh OTA</h1><p>Quản lý kết nối, giá và phòng trống của khách sạn trên các kênh bán.</p></div>
      <div className="ota-page-actions"><button className="ota-button ota-button--secondary" disabled={!!busy || query.loading} onClick={query.refresh}><RefreshCw size={16} className={query.loading ? 'ota-spin' : ''} aria-hidden="true" /> Làm mới</button></div>
    </header>
    <nav className="ota-tabs" aria-label="Quản lý kênh OTA"><Link className="ota-tab is-active" aria-current="page" to="/id/ota"><Link2 size={16} aria-hidden="true" /> Kết nối Channex</Link><Link className="ota-tab" to="/id/ota-history"><Clock3 size={16} aria-hidden="true" /> Lịch sử đồng bộ</Link></nav>
    {(error || query.error) && <div ref={errorNotice} tabIndex={-1} className="ota-notice ota-notice--error" role="alert"><Info size={18} aria-hidden="true" /><span>{error || query.error}</span>{query.error && <button className="ota-button ota-button--small" onClick={query.refresh}>Thử lại</button>}</div>}
    {message && <div ref={successNotice} tabIndex={-1} className="ota-notice ota-notice--success" role="status"><CheckCircle2 size={18} aria-hidden="true" /><span>{message.text}</span>{message.queued && <Link to="/id/ota-history">Xem lịch sử <ArrowRight size={14} aria-hidden="true" /></Link>}</div>}
    {!canWrite && <div className="ota-notice ota-notice--info" role="status"><ShieldCheck size={18} aria-hidden="true" /><span>{accessMessage}</span></div>}
    {query.loading && <div className="ota-state ota-state--loading" role="status"><RefreshCw size={24} className="ota-spin" aria-hidden="true" /><p>Đang tải thông tin kênh OTA…</p></div>}
    {query.data && <>
      <section className="ota-panel ota-connection" aria-labelledby="ota-connection-title">
        <div className="ota-section-header">
          <div className="ota-provider"><span className="ota-provider-logo" aria-hidden="true"><Link2 size={26} /></span><div><div className="ota-title-line"><h2 id="ota-connection-title">Channex</h2><span className={`ota-status ota-status--${status.tone}`}><span className="ota-status-dot" />{status.label}</span></div><p>Một kết nối, quản lý các kênh bán phòng.</p></div></div>
          {canWrite && <button ref={configButton} className={`ota-button ${connection ? 'ota-button--secondary' : 'ota-button--primary'}`} disabled={!!busy} aria-expanded={!!config} aria-controls="ota-connection-form" onClick={editConnection}><Settings2 size={16} aria-hidden="true" />{connection ? 'Chỉnh sửa kết nối' : 'Thiết lập kết nối'}</button>}
        </div>
        {config ? <form id="ota-connection-form" className="ota-form" onSubmit={event => { event.preventDefault(); save('config', config); }}>
          <fieldset disabled={!!busy || !canWrite}>
            <div className="ota-form-heading"><h3>{connection ? 'Chỉnh sửa kết nối' : 'Thiết lập Channex'}</h3><p>Nhập mã khách sạn từ Channex để ghép với {pms.tenant?.name}.</p></div>
            <div className="ota-form-grid"><label className="ota-field">Môi trường<select value={config.environment} onChange={event => setConfig(old => ({ ...old, environment: event.target.value }))}><option value="staging">Thử nghiệm (Staging)</option><option value="production">Vận hành (Production)</option></select></label><label className="ota-field ota-field--wide">Mã khách sạn Channex (Property ID)<input autoFocus required spellCheck={false} autoComplete="off" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={config.propertyId} onChange={event => setConfig(old => ({ ...old, propertyId: event.target.value.trim() }))} /><span className="ota-field-hint">Lấy Property ID trong tài khoản Channex của khách sạn.</span></label></div>
            <label className="ota-toggle"><span><strong>Cho phép đồng bộ</strong><small>Bật để hệ thống tiếp nhận và xử lý tác vụ đồng bộ.</small></span><input type="checkbox" role="switch" checked={config.active} onChange={event => setConfig(old => ({ ...old, active: event.target.checked }))} /><span className="ota-toggle-track" aria-hidden="true" /></label>
            <details className="ota-advanced"><summary><KeyRound size={16} aria-hidden="true" /> Xác thực trên máy chủ <ChevronDown size={16} aria-hidden="true" /></summary><p>Gửi hai tên biến này cho quản trị viên để cấu hình khóa API và xác thực webhook trên máy chủ.</p><div className="ota-form-grid"><label className="ota-field">Biến khóa API<input className="ota-mono" readOnly value={config.credentialRef || ''} /></label><label className="ota-field">Biến xác thực webhook<input className="ota-mono" readOnly value={config.webhookSecretRef || ''} /></label></div></details>
            {!!query.data.jobs?.length && <p className="ota-field-hint"><Info size={14} aria-hidden="true" /> Mã khách sạn và môi trường không thể đổi sau khi có lịch sử đồng bộ.</p>}
            <div className="ota-form-actions"><button className="ota-button ota-button--secondary" type="button" onClick={() => { setConfig(null); setError(''); configButton.current?.focus(); }}>Hủy</button><button className="ota-button ota-button--primary" type="submit" disabled={!config.credentialRef || !config.webhookSecretRef}><Check size={16} aria-hidden="true" />{busy === 'config' ? 'Đang lưu…' : 'Lưu kết nối'}</button></div>
          </fieldset>
        </form> : <>
          {connection ? <div className="ota-connection-details"><div><span className="ota-detail-label">MÔI TRƯỜNG</span><strong>{connection.environment === 'production' ? 'Vận hành' : 'Thử nghiệm'}<span className="ota-environment">{connection.environment === 'production' ? 'Production' : 'Staging'}</span></strong></div><div className="ota-property"><span className="ota-detail-label">MÃ KHÁCH SẠN CHANNEX</span><code>{connection.propertyId}</code></div><div><span className="ota-detail-label">XÁC THỰC</span><span className={`ota-credential ${connection.credentialsConfigured ? 'is-ready' : ''}`}><KeyRound size={14} aria-hidden="true" />Khóa API: {connection.credentialsConfigured ? 'Đã cấu hình' : 'Chưa cấu hình'}</span><span className={`ota-credential ${connection.webhookConfigured ? 'is-ready' : ''}`}><ShieldCheck size={14} aria-hidden="true" />Webhook: {connection.webhookConfigured ? 'Đã cấu hình' : 'Chưa cấu hình'}</span></div></div> : <div className="ota-onboarding"><div><h3>Bắt đầu phân phối phòng qua Channex</h3><p>Hoàn tất kết nối một lần để quản lý giá và phòng trống từ LOHA.</p></div><ol><li><span>01</span><div><strong>Thiết lập kết nối</strong><small>Ghép mã khách sạn và xác thực.</small></div></li><li><span>02</span><div><strong>Ghép loại phòng</strong><small>Chọn phòng và gói giá tương ứng.</small></div></li><li><span>03</span><div><strong>Đồng bộ & theo dõi</strong><small>Gửi dữ liệu và kiểm tra kết quả.</small></div></li></ol></div>}
        </>}
      </section>

      <section className="ota-panel" aria-labelledby="ota-mapping-title">
        <div className="ota-section-header"><div><div className="ota-title-line"><h2 id="ota-mapping-title">Ghép nối loại phòng</h2><span className="ota-count">{mappedCount}/{rooms.length}</span></div><p>Ghép phòng tại LOHA với loại phòng và gói giá trên Channex.</p></div>{canWrite && <button ref={mappingButton} className="ota-button ota-button--secondary" disabled={!!busy || !rooms.length || !connection} aria-expanded={!!mapping} aria-controls="ota-mapping-form" onClick={() => editMapping()}><Plus size={16} aria-hidden="true" /> Ghép loại phòng</button>}</div>
        {mapping && <form id="ota-mapping-form" className="ota-form" onSubmit={event => { event.preventDefault(); save('mappings', mapping); }}><fieldset disabled={!!busy || !canWrite}>
          <div className="ota-form-heading"><h3>Ghép phòng và gói giá</h3><p>Mỗi loại phòng LOHA tương ứng với một loại phòng và gói giá Channex.</p></div>
          <div className="ota-form-grid"><label className="ota-field">Loại phòng LOHA<select autoFocus required value={mapping.roomTypeId} onChange={event => setMapping(old => ({ ...old, roomTypeId: event.target.value }))}>{rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label><label className="ota-field">Trạng thái<select value={String(mapping.active)} onChange={event => setMapping(old => ({ ...old, active: event.target.value === 'true' }))}><option value="true">Đang bật</option><option value="false">Tạm dừng</option></select></label><label className="ota-field">Mã loại phòng Channex<input required spellCheck={false} autoComplete="off" placeholder="Room type ID" value={mapping.channexRoomTypeId} onChange={event => setMapping(old => ({ ...old, channexRoomTypeId: event.target.value.trim() }))} /></label><label className="ota-field">Mã gói giá Channex<input required spellCheck={false} autoComplete="off" placeholder="Rate plan ID" value={mapping.channexRatePlanId} onChange={event => setMapping(old => ({ ...old, channexRatePlanId: event.target.value.trim() }))} /></label></div>
          {!!query.data.jobs?.length && <p className="ota-field-hint"><Info size={14} aria-hidden="true" /> Ghép nối đã sử dụng không thể đổi mã hoặc tạm dừng khi có lịch sử đồng bộ.</p>}
          <div className="ota-form-actions"><button className="ota-button ota-button--secondary" type="button" onClick={() => { setMapping(null); setError(''); mappingButton.current?.focus(); }}>Hủy</button><button className="ota-button ota-button--primary" type="submit"><Check size={16} aria-hidden="true" />{busy === 'mappings' ? 'Đang lưu…' : 'Lưu ghép nối'}</button></div>
        </fieldset></form>}
        {mappings.length ? <div className="ota-mappings"><div className="ota-mapping-labels"><span>LOẠI PHÒNG LOHA</span><span>PHÒNG & GÓI GIÁ CHANNEX</span><span>TRẠNG THÁI</span><span /></div>{mappings.map(row => <div className="ota-mapping-row" key={row.id}><div className="ota-room-name"><span className="ota-room-icon"><BedDouble size={20} aria-hidden="true" /></span><div><strong>{rooms.find(room => room.id === row.roomTypeId)?.name || 'Loại phòng đã ngừng dùng'}</strong><small>Loại phòng LOHA</small></div><ArrowRight className="ota-mapping-arrow" size={17} aria-hidden="true" /></div><div className="ota-mapping-ids"><span>Phòng <code>{row.channexRoomTypeId}</code></span><span>Gói giá <code>{row.channexRatePlanId}</code></span></div><span className={`ota-status ota-status--${row.active ? 'succeeded' : 'neutral'}`}><span className="ota-status-dot" />{row.active ? 'Đang bật' : 'Tạm dừng'}</span>{canWrite && <button className="ota-button ota-button--ghost ota-button--small" disabled={!!busy} aria-label={`Sửa ghép nối ${rooms.find(room => room.id === row.roomTypeId)?.name || row.roomTypeId}`} onClick={() => editMapping(row)}><SlidersHorizontal size={16} aria-hidden="true" /><span>Sửa</span></button>}</div>)}</div> : !mapping && <div className="ota-state ota-state--empty"><span className="ota-state-icon"><BedDouble size={24} aria-hidden="true" /></span><h3>Chưa có loại phòng được ghép nối</h3><p>{!connection ? 'Thiết lập kết nối Channex trước, sau đó ghép loại phòng để gửi giá và tồn phòng.' : !rooms.length ? 'Thêm loại phòng trong Cài đặt khách sạn để bắt đầu ghép nối.' : 'Ghép loại phòng đầu tiên để Channex nhận đúng giá và số phòng trống.'}</p></div>}
      </section>

      <section className="ota-panel" aria-labelledby="ota-sync-title">
        <div className="ota-section-header"><div><h2 id="ota-sync-title">Đồng bộ dữ liệu</h2><p>Chủ động gửi giá, phòng trống hoặc nhận các đặt phòng mới.</p></div><Link className="ota-text-link" to="/id/ota-history">Xem lịch sử <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        <div className="ota-sync-grid">
          <form className="ota-sync-action" onSubmit={event => { event.preventDefault(); if (!pushReason) save('jobs', { kind: 'push_ari', ...range }); }}><div className="ota-sync-heading"><span className="ota-action-icon"><ArrowUpRight size={20} aria-hidden="true" /></span><div><h3>Gửi giá & phòng trống</h3><p>Cập nhật dữ liệu từ LOHA lên Channex.</p></div></div><fieldset disabled={!!busy || !!pushReason}><div className="ota-date-range"><label className="ota-field">Từ ngày<input type="date" required value={range.start} onChange={event => setRange(old => ({ ...old, start: event.target.value }))} /></label><span className="ota-date-arrow" aria-hidden="true"><ArrowRight size={16} /></span><label className="ota-field">Đến trước ngày<input type="date" required min={range.start || undefined} value={range.end} onChange={event => setRange(old => ({ ...old, end: event.target.value }))} /></label></div><button className="ota-button ota-button--primary" type="submit" aria-describedby="ota-push-hint"><ArrowUpRight size={16} aria-hidden="true" />{busy === 'push_ari' ? 'Đang xếp hàng…' : 'Gửi giá & phòng trống'}</button></fieldset><p id="ota-push-hint" className={`ota-action-hint ${pushReason ? 'is-blocked' : ''}`}>{pushReason || 'Tối đa 31 ngày mỗi lần, không gồm ngày kết thúc.'}</p></form>
          <div className="ota-sync-action"><div className="ota-sync-heading"><span className="ota-action-icon"><ArrowDownToLine size={20} aria-hidden="true" /></span><div><h3>Nhận đặt phòng</h3><p>Lấy các cập nhật đặt phòng từ Channex.</p></div></div><p className="ota-sync-copy">Nhận đặt phòng mới cùng các thay đổi hoặc hủy phòng để cập nhật lịch lưu trú tại khách sạn.</p><button className="ota-button ota-button--secondary" disabled={!!busy || !!pullReason} aria-describedby="ota-pull-hint" onClick={() => save('jobs', { kind: 'pull_bookings' })}><ArrowDownToLine size={16} aria-hidden="true" />{busy === 'pull_bookings' ? 'Đang xếp hàng…' : 'Nhận đặt phòng'}</button><p id="ota-pull-hint" className={`ota-action-hint ${pullReason ? 'is-blocked' : ''}`}>{pullReason || 'Tác vụ được xử lý trong hàng đợi. Xem kết quả ở Lịch sử đồng bộ.'}</p></div>
        </div>
        <div className="ota-panel-footnote"><CircleHelp size={15} aria-hidden="true" /><span>Gửi yêu cầu tạo tác vụ trong hàng đợi. Kết quả đồng bộ được ghi nhận riêng trong lịch sử.</span></div>
      </section>
      <p className="ota-page-footnote"><ShieldCheck size={15} aria-hidden="true" />Thông tin xác thực được quản lý trên máy chủ của khách sạn.</p>
    </>}
  </div>;
}
