import { getIntlLocale } from '../../../../shared/i18n/store.js';
import { t as tUi, useI18n } from '../../../../shared/i18n/useI18n.js';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BedDouble, Check, CheckCircle2, CircleHelp, Clock3, Eye, EyeOff, Info, KeyRound, Link2, Plus, RefreshCw, Settings2, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { usePms } from '../../data/usePms';
import { today, addDays } from '../../data/model';
import { useChannels } from '../useChannels';
import { mappingCatalogState } from '../catalog';
import { connectionFormState, connectionStatus, mappingStatus, syncBlockReason, webhookStatus } from '../presentation';
import { syncRangeError } from '../integration';
import ChannexSourcePicker from './ChannexSourcePicker';
import '../ChannelManager.css';

export default function OTA() {
  const pms = usePms();
  return <ChannelWorkspace key={`${pms.tenantId}:${pms.user?.id}`} pms={pms} />;
}

export function ChannelWorkspace({ pms, connectionPath = '/id/ota', historyPath = '/id/ota-history', embedded = false, query: sharedQuery }) {
  useI18n();
  const localQuery = useChannels(pms.requestTenant, pms.tenantId, '/channels', !sharedQuery);
  const query = sharedQuery || localQuery;
  const [config, setConfig] = useState(null), [mapping, setMapping] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [range, setRange] = useState({ start: today(pms.settings.timezone), end: addDays(today(pms.settings.timezone), 7) });
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const active = useRef(true), inFlight = useRef(false), configButton = useRef(null), mappingButton = useRef(null), errorNotice = useRef(null), successNotice = useRef(null);
  const access = pms.access('channels.write', 'OTA_SYNC', true);
  const canWrite = access.allowed;
  const accessMessage = access.reason === 'role' ? 'Bạn đang ở chế độ chỉ xem. Chủ khách sạn có thể cấu hình và đồng bộ OTA.' : access.message;
  const connection = query.data?.connection;
  const storageAvailable = query.data?.credentialStorageAvailable === true;
  const configState = connectionFormState(config, connection, storageAvailable);
  const rooms = query.data?.roomTypes || [], mappings = query.data?.mappings || [];
  const status = connectionStatus(connection);
  const webhook = webhookStatus(connection, query.data?.webhookRegistrationAvailable, query.data?.jobs);
  const pullReason = !canWrite ? accessMessage : syncBlockReason(connection, mappings, 'pull_bookings');
  const pushReason = !canWrite ? accessMessage : syncBlockReason(connection, mappings, 'push_ari');
  const mappedCount = mappings.filter(row => row.active && !row.pauseRequested && rooms.some(room => room.id === row.roomTypeId)).length;
  const selectedMapping = mappings.find(row => row.roomTypeId === mapping?.roomTypeId);
  const catalog = useChannels(pms.requestTenant, `${pms.tenantId}:${connection?.environment}:${connection?.propertyId}:${connection?.verifiedAt}`, '/channels/catalog', Boolean(connection?.credentialsConfigured && (mapping || mappings.length)));
  const catalogState = mappingCatalogState(catalog.data, mappings, mapping);
  const verifiedTime = connection?.verifiedAt ? new Date(connection.verifiedAt).toLocaleString(getIntlLocale(), { timeZone: pms.settings.timezone, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { if (error) errorNotice.current?.focus(); else if (message) successNotice.current?.focus(); }, [error, message]);

  async function save(path, body) {
    if (inFlight.current || !canWrite) return;
    if (path === 'mappings' && !catalogState.canSave) return;
    if (path === 'jobs' && body.kind === 'push_ari') {
      const dateError = syncRangeError(body.start, body.end);
      if (dateError) { setError(dateError); return; }
    }
    inFlight.current = true;
    setBusy(path === 'jobs' ? body.kind : path); setError(''); setMessage('');
    try {
      const result = await pms.requestTenant('/channels/' + path, { method: path === 'jobs' ? 'POST' : 'PUT', body });
      if (!active.current) return;
      setConfig(null); setShowApiKey(false); setMapping(null); query.refresh();
      const closing = path === 'mappings' && result.pauseRequested;
      setMessage({ text: closing ? 'Đã yêu cầu đóng bán trên Channex. Ghép nối sẽ tạm dừng sau khi worker xử lý thành công.' : path === 'jobs' ? 'Đã thêm vào hàng đợi. Theo dõi kết quả tại Lịch sử đồng bộ.' : path === 'mappings' ? 'Đã lưu ghép nối loại phòng.' : 'Đã lưu cấu hình Channex.', queued: path === 'jobs' || closing });
    } catch (err) { if (active.current) setError(err.message); }
    finally { inFlight.current = false; if (active.current) setBusy(''); }
  }

  function editConnection() {
    setError(''); setMessage(''); setShowApiKey(false);
    setConfig({ environment: connection?.environment || 'staging', propertyId: connection?.propertyId || '', apiKey: '', active: connection?.active ?? true });
  }
  function editMapping(row, roomTypeId = '') {
    setError(''); setMessage('');
    if (!mapping) catalog.refresh();
    const firstUnmapped = rooms.find(room => !mappings.some(item => item.roomTypeId === room.id));
    if (!row && !roomTypeId) {
      roomTypeId = firstUnmapped?.id || rooms[0]?.id || '';
      row = mappings.find(item => item.roomTypeId === roomTypeId);
    }
    setMapping(row ? { roomTypeId: row.roomTypeId, channexRoomTypeId: row.channexRoomTypeId, channexRatePlanId: row.channexRatePlanId, active: row.pauseRequested ? false : row.active } : { roomTypeId: roomTypeId || firstUnmapped?.id || rooms[0]?.id || '', channexRoomTypeId: '', channexRatePlanId: '', active: true });
  }

  return <div className={`ota-page${embedded ? ' ota-page--embedded' : ''}`}>
    <header className="ota-page-header">
      <div>{!embedded && <p className="ota-eyebrow">PHÂN PHỐI & BÁN PHÒNG</p>}{embedded ? <h2>Kết nối, ghép phòng & đồng bộ</h2> : <h1>Kênh OTA</h1>}<p>Thiết lập một lần, sau đó gửi giá và phòng trống hoặc nhận đặt phòng ngay tại đây.</p></div>
      <div className="ota-page-actions"><button className="ota-button ota-button--secondary" disabled={!!busy || query.loading} onClick={query.refresh}><RefreshCw size={16} className={query.loading ? 'ota-spin' : ''} aria-hidden="true" />{' '}{tUi("common.reset")}</button></div>
    </header>
    {!embedded && <nav className="ota-tabs" aria-label={tUi("nav.channelManagement")}><Link className="ota-tab is-active" aria-current="page" to={connectionPath}><Link2 size={16} aria-hidden="true" /> Kết nối Channex</Link><Link className="ota-tab" to={historyPath}><Clock3 size={16} aria-hidden="true" /> Lịch sử đồng bộ</Link></nav>}
    {(error || query.error) && <div ref={errorNotice} tabIndex={-1} className="ota-notice ota-notice--error" role="alert"><Info size={18} aria-hidden="true" /><span>{error || query.error}</span>{query.error && <button className="ota-button ota-button--small" onClick={query.refresh}>{tUi("common.retry")}</button>}</div>}
    {message && <div ref={successNotice} tabIndex={-1} className="ota-notice ota-notice--success" role="status"><CheckCircle2 size={18} aria-hidden="true" /><span>{message.text}</span>{message.queued && <Link to={historyPath}>Xem lịch sử <ArrowRight size={14} aria-hidden="true" /></Link>}</div>}
    {!canWrite && <div className="ota-notice ota-notice--info" role="status"><ShieldCheck size={18} aria-hidden="true" /><span>{accessMessage}</span></div>}
    {query.loading && <div className="ota-state ota-state--loading" role="status"><RefreshCw size={24} className="ota-spin" aria-hidden="true" /><p>Đang tải thông tin kênh OTA…</p></div>}
    {query.data && <>
      <section className="ota-panel ota-connection" aria-labelledby="ota-connection-title">
        <div className="ota-section-header">
          <div className="ota-provider"><span className="ota-provider-logo" aria-hidden="true"><Link2 size={26} /></span><div><div className="ota-title-line"><h2 id="ota-connection-title">Channex</h2><span className={`ota-status ota-status--${status.tone}`}><span className="ota-status-dot" />{status.label}</span></div><p>Một kết nối, quản lý các kênh bán phòng.</p></div></div>
          {canWrite && <button ref={configButton} className={`ota-button ${connection ? 'ota-button--secondary' : 'ota-button--primary'}`} disabled={!!busy} aria-expanded={!!config} aria-controls="ota-connection-form" onClick={editConnection}><Settings2 size={16} aria-hidden="true" />{connection ? 'Chỉnh sửa kết nối' : 'Nhập mã & khóa API'}</button>}
        </div>
        {canWrite && ['SUPER_ADMIN', 'SYSTEM_MANAGER'].includes(pms.user?.globalRole) && (!connection?.credentialsConfigured || !connection?.verifiedAt) && <ChannexSourcePicker pms={pms} disabled={!!busy || !!config} storageAvailable={storageAvailable} onConnect={body => save('config', body)} />}
        {config ? <form id="ota-connection-form" className="ota-form" onSubmit={event => { event.preventDefault(); save('config', config); }}>
          <fieldset disabled={!!busy || !canWrite}>
            <div className="ota-form-heading"><h3>{connection ? 'Chỉnh sửa kết nối' : 'Thiết lập Channex'}</h3><p>Nhập mã khách sạn và khóa API. LOHA kiểm tra kết nối trước khi lưu cho {pms.tenant?.name}.</p></div>
            <div className="ota-form-grid"><label className="ota-field">Môi trường<select value={config.environment} onChange={event => setConfig(old => ({ ...old, environment: event.target.value }))}><option value="staging">Thử nghiệm (Staging)</option><option value="production">Vận hành (Production)</option></select></label><label className="ota-field ota-field--wide">Mã khách sạn Channex (Property ID)<input autoFocus required spellCheck={false} autoComplete="off" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={config.propertyId} onChange={event => setConfig(old => ({ ...old, propertyId: event.target.value.trim() }))} /><span className="ota-field-hint">Lấy Property ID trong tài khoản Channex của khách sạn.</span></label></div>
            <div className="ota-api-key-field">
              <label className="ota-field" htmlFor="ota-api-key">Khóa API Channex</label>
              <div className="ota-secret-input"><input id="ota-api-key" type={showApiKey ? 'text' : 'password'} required={configState.keyRequired} disabled={!storageAvailable} spellCheck={false} autoComplete="new-password" autoCapitalize="none" aria-describedby="ota-api-key-hint" placeholder={connection?.credentialsConfigured ? 'Nhập khóa mới nếu muốn thay thế' : 'Nhập khóa API của khách sạn'} value={config.apiKey} onChange={event => setConfig(old => ({ ...old, apiKey: event.target.value }))} /><button className="ota-button ota-button--ghost ota-button--small" type="button" disabled={!storageAvailable} aria-label={showApiKey ? 'Ẩn khóa API đang nhập' : 'Hiện khóa API đang nhập'} aria-pressed={showApiKey} aria-controls="ota-api-key" onClick={() => setShowApiKey(value => !value)}>{showApiKey ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button></div>
              <p id="ota-api-key-hint" className="ota-field-hint">{connection?.credentialsConfigured ? configState.keyRequired ? 'Nhập lại khóa API để xác minh khách sạn hoặc môi trường mới.' : connection.credentialSource === 'environment' ? 'Để trống để giữ khóa đang dùng. Nhập khóa để chuyển sang lưu mã hóa trong LOHA.' : 'Để trống để giữ khóa đã lưu. Nhập khóa mới để thay thế.' : 'Khóa được mã hóa khi lưu và không hiển thị lại. Chỉ dùng khóa được cấp quyền cho khách sạn này.'}</p>
            </div>
            {!storageAvailable && <div className="ota-notice ota-notice--info ota-storage-notice" role="status"><ShieldCheck size={18} aria-hidden="true" /><span>Hệ thống chưa bật lưu khóa an toàn. Liên hệ quản trị viên để hoàn tất thiết lập chung trước khi nhập khóa API.</span></div>}
            <label className="ota-toggle"><span><strong>Cho phép đồng bộ</strong><small>Bật để hệ thống tiếp nhận và xử lý tác vụ đồng bộ.</small></span><input type="checkbox" role="switch" checked={config.active} onChange={event => setConfig(old => ({ ...old, active: event.target.checked }))} /><span className="ota-toggle-track" aria-hidden="true" /></label>
            {!!query.data.jobs?.length && <p className="ota-field-hint"><Info size={14} aria-hidden="true" /> Mã khách sạn và môi trường không thể đổi sau khi có lịch sử đồng bộ.</p>}
            <div className="ota-form-actions"><button className="ota-button ota-button--secondary" type="button" onClick={() => { setConfig(null); setShowApiKey(false); setError(''); configButton.current?.focus(); }}>{tUi("common.cancel")}</button><button className="ota-button ota-button--primary" type="submit" disabled={!configState.canSave}><Check size={16} aria-hidden="true" />{busy === 'config' ? 'Đang kiểm tra & lưu…' : config.apiKey.trim() || !connection ? 'Kiểm tra & lưu' : tUi("common.saveChanges")}</button></div>
          </fieldset>
        </form> : <>
          {connection ? <details className="ota-technical"><summary>Chi tiết kết nối dành cho kỹ thuật</summary><div className="ota-connection-details">
            <div><span className="ota-detail-label">MÔI TRƯỜNG</span><strong>{connection.environment === 'production' ? 'Vận hành' : 'Thử nghiệm'}<span className="ota-environment">{connection.environment === 'production' ? 'Production' : 'Staging'}</span></strong></div>
            <div className="ota-property"><span className="ota-detail-label">MÃ KHÁCH SẠN CHANNEX</span><code>{connection.propertyId}</code></div>
            <div><span className="ota-detail-label">XÁC THỰC</span>
              <span className={`ota-credential ${connection.credentialsConfigured ? 'is-ready' : ''}`}><KeyRound size={14} aria-hidden="true" /><span>Khóa API: {connection.credentialsConfigured ? connection.credentialSource === 'encrypted' ? 'Đã lưu mã hóa' : 'Đang dùng cấu hình cũ' : 'Chưa cấu hình'}</span></span>
              <span className={`ota-credential ${verifiedTime ? 'is-ready' : ''}`}><CheckCircle2 size={14} aria-hidden="true" /><span>{verifiedTime ? <>Kiểm tra lần cuối: <time dateTime={connection.verifiedAt}>{verifiedTime}</time></> : 'Chưa kiểm tra kết nối'}</span></span>
              <span className={`ota-status ota-status--${webhook.tone}`}><ShieldCheck size={14} aria-hidden="true" />Webhook: {webhook.label}</span>
              <p className="ota-webhook-hint">{webhook.hint}{webhook.tone === 'warning' && <>{' '}<Link to={historyPath}>Xem lịch sử</Link></>}</p>
            </div>
          </div></details> : <div className="ota-onboarding"><div><h3>Bắt đầu phân phối phòng qua Channex</h3><p>Hoàn tất kết nối một lần để quản lý giá và phòng trống từ LOHA.</p></div><ol><li><span>01</span><div><strong>Thiết lập kết nối</strong><small>Ghép mã khách sạn và xác thực.</small></div></li><li><span>02</span><div><strong>Ghép loại phòng</strong><small>Chọn phòng và gói giá tương ứng.</small></div></li><li><span>03</span><div><strong>Đồng bộ & theo dõi</strong><small>Gửi dữ liệu và kiểm tra kết quả.</small></div></li></ol></div>}
        </>}
      </section>

      <section className="ota-panel" aria-labelledby="ota-mapping-title">
        <div className="ota-section-header"><div><div className="ota-title-line"><h2 id="ota-mapping-title">Ghép nối loại phòng</h2><span className="ota-count">{mappedCount}/{rooms.length}</span></div><p>Ghép phòng tại LOHA với loại phòng và gói giá trên Channex.</p></div>{canWrite && <button ref={mappingButton} className="ota-button ota-button--secondary" disabled={!!busy || !rooms.length || !connection} aria-expanded={!!mapping} aria-controls="ota-mapping-form" onClick={() => editMapping()}><Plus size={16} aria-hidden="true" /> Ghép loại phòng</button>}</div>
        {mapping && <form id="ota-mapping-form" className="ota-form" onSubmit={event => { event.preventDefault(); save('mappings', mapping); }}><fieldset disabled={!!busy || !canWrite}>
          <div className="ota-form-heading"><h3>Ghép phòng và gói giá</h3><p>Mỗi loại phòng LOHA tương ứng với một loại phòng và gói giá Channex.</p></div>
          <div className="ota-catalog-toolbar"><span role="status">{catalog.loading ? 'Đang tải phòng và gói giá từ Channex…' : catalog.data ? `Danh mục của khách sạn Channex · ${connection.environment === 'production' ? 'Production' : 'Staging'}` : catalog.error ? 'Chưa tải được danh mục Channex.' : 'Lưu khóa API để lấy danh mục phòng và gói giá.'}</span><button className="ota-button ota-button--secondary ota-button--small" type="button" disabled={catalog.loading || !connection?.credentialsConfigured} onClick={catalog.refresh}><RefreshCw size={14} aria-hidden="true" /> Tải lại danh mục</button></div>
          {catalog.error && <div className="ota-notice ota-notice--error" role="alert"><Info size={16} aria-hidden="true" /><span>{catalog.error} Bạn vẫn có thể đổi trạng thái ghép nối đã lưu.</span></div>}
          <div className="ota-form-grid">
            <label className="ota-field">Loại phòng LOHA<select autoFocus required value={mapping.roomTypeId} onChange={event => editMapping(mappings.find(row => row.roomTypeId === event.target.value), event.target.value)}>{rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
            <label className="ota-field">{tUi("common.status")}<select disabled={selectedMapping?.pauseRequested} value={String(mapping.active)} onChange={event => setMapping(old => ({ ...old, active: event.target.value === 'true' }))}><option value="true">Đang bật</option><option value="false">Tạm dừng</option></select></label>
            <label className="ota-field">Loại phòng Channex<select required disabled={selectedMapping?.targetLocked || catalog.loading || !catalog.data} aria-describedby="ota-mapping-hint" value={mapping.channexRoomTypeId} onChange={event => setMapping(old => ({ ...old, channexRoomTypeId: event.target.value, channexRatePlanId: '' }))}><option value="">{catalog.loading ? 'Đang tải loại phòng…' : 'Chọn loại phòng Channex'}</option>{mapping.channexRoomTypeId && !catalogState.roomTypes.some(room => room.id === mapping.channexRoomTypeId) && <option value={mapping.channexRoomTypeId} disabled>Phòng đã lưu · {mapping.channexRoomTypeId}</option>}{catalogState.roomTypes.map(room => <option key={room.id} value={room.id} disabled={!room.available}>{room.name}{!room.available ? ' · Đã ghép với loại phòng khác' : ''}</option>)}</select><span className="ota-field-hint">{mapping.channexRoomTypeId ? <code>{mapping.channexRoomTypeId}</code> : catalog.data && !catalogState.roomTypes.length ? 'Channex chưa có loại phòng cho khách sạn này.' : 'Chọn theo tên, LOHA lưu mã liên kết tự động.'}</span></label>
            <label className="ota-field">Gói giá Channex<select required disabled={selectedMapping?.targetLocked || catalog.loading || !catalog.data || !mapping.channexRoomTypeId} aria-describedby="ota-rate-catalog-hint ota-mapping-hint" value={mapping.channexRatePlanId} onChange={event => setMapping(old => ({ ...old, channexRatePlanId: event.target.value }))}><option value="">{!mapping.channexRoomTypeId ? 'Chọn loại phòng trước' : 'Chọn gói giá Channex'}</option>{mapping.channexRatePlanId && !catalogState.ratePlans.some(rate => rate.id === mapping.channexRatePlanId) && <option value={mapping.channexRatePlanId} disabled>Gói giá đã lưu · {mapping.channexRatePlanId}</option>}{catalogState.ratePlans.map(rate => <option key={rate.id} value={rate.id} disabled={!rate.available}>{rate.name} · {rate.currency}{!rate.supported ? ' · Chưa hỗ trợ' : !rate.available ? ' · Đã ghép' : ''}</option>)}</select><span className="ota-field-hint">{mapping.channexRatePlanId ? <code>{mapping.channexRatePlanId}</code> : 'Gói giá thuộc đúng loại phòng Channex đã chọn.'}</span></label>
          </div>
          <p id="ota-rate-catalog-hint" className="ota-field-hint">{catalog.data && mapping.channexRoomTypeId && !catalogState.ratePlans.some(rate => rate.available) ? 'Chưa có gói giá phù hợp. ' : ''}Đồng bộ hiện hỗ trợ gói giá Manual, theo phòng, dùng {pms.settings.currency || 'VND'}.</p>
          <p id="ota-mapping-hint" className="ota-field-hint"><Info size={14} aria-hidden="true" />{selectedMapping?.pauseRequested ? <>Đang đóng bán trên Channex. <Link to={historyPath}>Xem tiến độ hoặc thử lại tại Lịch sử đồng bộ.</Link></> : selectedMapping?.targetLocked ? 'Mã ghép nối được bảo vệ theo lịch sử OTA. Chọn Tạm dừng để yêu cầu đóng bán; bạn có thể bật lại sau khi hoàn tất.' : 'Ghép nối chưa sử dụng có thể sửa mã và trạng thái. Lịch sử webhook hoặc lấy danh sách booking không khóa ghép nối.'}</p>
          <div className="ota-form-actions"><button className="ota-button ota-button--secondary" type="button" onClick={() => { setMapping(null); setError(''); mappingButton.current?.focus(); }}>{tUi("common.cancel")}</button><button className="ota-button ota-button--primary" type="submit" disabled={!catalogState.canSave}><Check size={16} aria-hidden="true" />{busy === 'mappings' ? tUi("common.saving") : 'Lưu ghép nối'}</button></div>
        </fieldset></form>}
        {mappings.length ? <div className="ota-mappings"><div className="ota-mapping-labels"><span>LOẠI PHÒNG LOHA</span><span>PHÒNG & GÓI GIÁ CHANNEX</span><span>TRẠNG THÁI</span><span /></div>{mappings.map(row => <div className="ota-mapping-row" key={row.id}><div className="ota-room-name"><span className="ota-room-icon"><BedDouble size={20} aria-hidden="true" /></span><div><strong>{rooms.find(room => room.id === row.roomTypeId)?.name || 'Loại phòng đã ngừng dùng'}</strong><small>Loại phòng LOHA</small></div><ArrowRight className="ota-mapping-arrow" size={17} aria-hidden="true" /></div><MappingTarget row={row} catalog={catalog.data} /><span className={`ota-status ota-status--${mappingStatus(row).tone}`}><span className="ota-status-dot" />{mappingStatus(row).label}</span>{canWrite && <button className="ota-button ota-button--ghost ota-button--small" disabled={!!busy} aria-label={`Sửa ghép nối ${rooms.find(room => room.id === row.roomTypeId)?.name || row.roomTypeId}`} onClick={() => editMapping(row)}><SlidersHorizontal size={16} aria-hidden="true" /><span>{tUi("common.edit")}</span></button>}</div>)}</div> : !mapping && <div className="ota-state ota-state--empty"><span className="ota-state-icon"><BedDouble size={24} aria-hidden="true" /></span><h3>Chưa có loại phòng được ghép nối</h3><p>{!connection ? 'Thiết lập kết nối Channex trước, sau đó ghép loại phòng để gửi giá và tồn phòng.' : !rooms.length ? 'Thêm loại phòng trong Cài đặt khách sạn để bắt đầu ghép nối.' : 'Ghép loại phòng đầu tiên để Channex nhận đúng giá và số phòng trống.'}</p></div>}
      </section>

      <section className="ota-panel" aria-labelledby="ota-sync-title">
        <div className="ota-section-header"><div><h2 id="ota-sync-title">Đồng bộ dữ liệu</h2><p>Chủ động gửi giá, phòng trống hoặc nhận các đặt phòng mới.</p></div><Link className="ota-text-link" to={historyPath}>Xem lịch sử <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        <div className="ota-sync-grid">
          <form className="ota-sync-action" onSubmit={event => { event.preventDefault(); if (!pushReason) save('jobs', { kind: 'push_ari', ...range }); }}><div className="ota-sync-heading"><span className="ota-action-icon"><ArrowUpRight size={20} aria-hidden="true" /></span><div><h3>Gửi giá & phòng trống</h3><p>Cập nhật dữ liệu từ LOHA lên Channex.</p></div></div><fieldset disabled={!!busy || !!pushReason}><div className="ota-date-range"><label className="ota-field">{tUi("common.fromDate")}<input type="date" required value={range.start} onChange={event => setRange(old => ({ ...old, start: event.target.value }))} /></label><span className="ota-date-arrow" aria-hidden="true"><ArrowRight size={16} /></span><label className="ota-field">Đến trước ngày<input type="date" required min={range.start || undefined} value={range.end} onChange={event => setRange(old => ({ ...old, end: event.target.value }))} /></label></div><button className="ota-button ota-button--primary" type="submit" aria-describedby="ota-push-hint"><ArrowUpRight size={16} aria-hidden="true" />{busy === 'push_ari' ? 'Đang xếp hàng…' : 'Gửi giá & phòng trống'}</button></fieldset><p id="ota-push-hint" className={`ota-action-hint ${pushReason ? 'is-blocked' : ''}`}>{pushReason || 'Tối đa 31 ngày mỗi lần, không gồm ngày kết thúc.'}</p></form>
          <div className="ota-sync-action"><div className="ota-sync-heading"><span className="ota-action-icon"><ArrowDownToLine size={20} aria-hidden="true" /></span><div><h3>Nhận đặt phòng</h3><p>Lấy các cập nhật đặt phòng từ Channex.</p></div></div><p className="ota-sync-copy">Nhận đặt phòng mới cùng các thay đổi hoặc hủy phòng để cập nhật lịch lưu trú tại khách sạn.</p><button className="ota-button ota-button--secondary" disabled={!!busy || !!pullReason} aria-describedby="ota-pull-hint" onClick={() => save('jobs', { kind: 'pull_bookings' })}><ArrowDownToLine size={16} aria-hidden="true" />{busy === 'pull_bookings' ? 'Đang xếp hàng…' : 'Nhận đặt phòng'}</button><p id="ota-pull-hint" className={`ota-action-hint ${pullReason ? 'is-blocked' : ''}`}>{pullReason || 'Tác vụ được xử lý trong hàng đợi. Xem kết quả ở Lịch sử đồng bộ.'}</p></div>
        </div>
        <div className="ota-panel-footnote"><CircleHelp size={15} aria-hidden="true" /><span>Gửi yêu cầu tạo tác vụ trong hàng đợi. Kết quả đồng bộ được ghi nhận riêng trong lịch sử.</span></div>
      </section>
      <p className="ota-page-footnote"><ShieldCheck size={15} aria-hidden="true" />Khóa nhập tại LOHA được lưu mã hóa riêng cho từng khách sạn.</p>
    </>}
  </div>;
}

function MappingTarget({ row, catalog }) {
  useI18n();
  return <div className="ota-mapping-ids">
    <strong>{catalog?.roomTypes.find(room => room.id === row.channexRoomTypeId)?.name || 'Loại phòng đã liên kết'}</strong>
    <span>{catalog?.ratePlans.find(rate => rate.id === row.channexRatePlanId)?.name || 'Gói giá đã liên kết'}</span>
    <details><summary>Mã kỹ thuật</summary><span>{tUi("common.room")}{' '}<code>{row.channexRoomTypeId}</code></span><span>Gói giá <code>{row.channexRatePlanId}</code></span></details>
  </div>;
}
