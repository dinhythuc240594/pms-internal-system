import { getIntlLocale } from '../../../../shared/i18n/store.js';
import { t as tUi, tr as labelUi, useI18n } from '../../../../shared/i18n/useI18n.js';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3, Download, History, Info, Link2, RefreshCw, RotateCcw, Upload } from 'lucide-react';
import { usePms } from '../../data/usePms';
import { useChannels } from '../useChannels';
import { channelJobLabel, channelJobSuccessMessage, syncBlockReason } from '../presentation';
import '../ChannelManager.css';

const statuses = { queued: 'Đang chờ', processing: 'Đang xử lý', succeeded: 'Thành công', failed: 'Cần kiểm tra' };
const jobIcons = { push_ari: Upload, pull_bookings: Download, ack_revision: CheckCircle2, setup_webhook: Link2, pause_mapping: Link2 };
const errors = {
  channel_mapping_pause_pending: 'Trạng thái đóng bán đã thay đổi. Tải lại kết nối để kiểm tra ghép nối.',
  credentials_unavailable: 'Chưa có khóa xác thực Channex. Nhờ quản trị viên kiểm tra cấu hình kết nối.',
  credential_storage_unavailable: 'Hệ thống chưa bật lưu khóa an toàn. Nhờ quản trị viên kiểm tra cấu hình chung.',
  channel_api_key_required: 'Chưa có khóa API. Nhập khóa tại trang kết nối Channex.',
  webhook_registration_unavailable: 'Hệ thống chưa bật địa chỉ nhận webhook. Đặt phòng vẫn được nhận theo lịch.',
  channel_webhook_list_too_large: 'Channex có quá nhiều webhook. Nhờ quản trị viên kiểm tra trước khi đăng ký lại.',
  channel_webhook_ambiguous: 'Có nhiều webhook trùng địa chỉ nhận. Nhờ quản trị viên kiểm tra trước khi thử lại.',
  provider_invalid_response: 'Channex trả về dữ liệu chưa hợp lệ. Vui lòng thử lại sau.',
  channel_inactive: 'Kết nối Channex đang tắt. Bật kết nối trước khi thử lại.',
  provider_unavailable: 'Tạm thời chưa liên lạc được với Channex. Vui lòng thử lại sau.',
  provider_rate_limited: 'Channex đang giới hạn số yêu cầu. Chờ ít phút trước khi thử lại.',
  provider_rejected: 'Channex chưa chấp nhận dữ liệu. Kiểm tra mã khách sạn và liên kết phòng, gói giá.',
  invalid_remote_id: 'Mã liên kết Channex chưa hợp lệ. Kiểm tra lại thông tin kết nối.',
  exchange_rate_required: 'Chưa có tỷ giá cho tiền tệ đặt phòng. Khai báo tỷ giá rồi thử lại tác vụ cập nhật.',
  channel_booking_not_found: 'Chưa tìm thấy đặt phòng gốc trong LOHA. Cần đối soát trước khi xử lý thay đổi hoặc hủy.',
  booking_requires_review: 'Đặt phòng đã có thay đổi hoặc giao dịch cần đối soát. Kiểm tra thủ công trước khi cập nhật.',
  booking_unmapped: 'Chưa ghép đúng loại phòng và gói giá của cập nhật. Kiểm tra ghép nối rồi thử lại.',
  room_unavailable: 'Không còn phòng phù hợp cho toàn bộ kỳ lưu trú. Kiểm tra tồn phòng trước khi thử lại.',
  channel_mapping_required: 'Chưa có liên kết phòng đang bật. Hoàn tất liên kết trước khi cập nhật giá.',
  channel_mapping_invalid: 'Liên kết phòng hoặc gói giá chưa khớp với khách sạn trên Channex.',
  channel_rate_plan_unsupported: 'Gói giá Channex chưa phù hợp. Kiểm tra kiểu giá theo phòng và tiền tệ.',
  channel_inventory_inconsistent: 'Số phòng trống chưa khớp với đặt phòng. Cần đối soát trước khi đồng bộ.',
  channel_actor_revoked: 'Người tạo yêu cầu không còn quyền đồng bộ. Chủ khách sạn có thể gửi lại yêu cầu.',
  tenant_suspended: 'Khách sạn đang tạm ngưng. Liên hệ quản trị viên để tiếp tục đồng bộ.',
  subscription_inactive: 'Gói dịch vụ chưa hoạt động hoặc đã hết hạn. Cần gia hạn để tiếp tục đồng bộ.',
};
export default function OTAHistory() {
  const pms = usePms();
  return <HistoryWorkspace key={`${pms.tenantId}:${pms.user?.id}`} pms={pms} />;
}
export function HistoryWorkspace({ pms, connectionPath = '/id/ota', historyPath = '/id/ota-history', embedded = false, query: sharedQuery }) {
  useI18n();
  const localQuery = useChannels(pms.requestTenant, pms.tenantId, '/channels', !sharedQuery);
  const query = sharedQuery || localQuery;
  const [status, setStatus] = useState(''), [retryingId, setRetryingId] = useState(null);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const active = useRef(true), inFlight = useRef(false), errorNotice = useRef(null), successNotice = useRef(null);
  const writeAccess = pms.access('channels.write', 'OTA_SYNC', true);
  const accessMessage = writeAccess.reason === 'role' ? 'Bạn đang ở chế độ chỉ xem. Chủ khách sạn có thể cấu hình và đồng bộ OTA.' : writeAccess.message;
  const jobs = query.data?.jobs || [];
  const rows = jobs.filter(row => !status || row.status === status);
  const busy = retryingId !== null;
  const displayTime = value => value ? new Date(value).toLocaleString(getIntlLocale(), { timeZone: pms.settings.timezone, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const displayDate = value => new Date(`${value}T00:00:00Z`).toLocaleDateString(getIntlLocale(), { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { if (error) errorNotice.current?.focus(); else if (message) successNotice.current?.focus(); }, [error, message]);
  function refresh() { setError(''); setMessage(''); query.refresh(); }
  async function retry(row) {
    if (inFlight.current || !writeAccess.allowed || syncBlockReason(query.data?.connection, query.data?.mappings || [], row.kind)) return;
    inFlight.current = true; setRetryingId(row.id); setError(''); setMessage('');
    try {
      await pms.requestTenant('/channels/jobs/' + encodeURIComponent(row.id) + '/retry', { method: 'POST', body: {} });
      if (active.current) { setMessage('Đã xếp hàng thử lại. Tải lại lịch sử để xem kết quả sau khi yêu cầu được xử lý.'); query.refresh(); }
    } catch (err) { if (active.current) setError(err.message); }
    finally { inFlight.current = false; if (active.current) setRetryingId(null); }
  }
  return <div className={`ota-page ota-history${embedded ? ' ota-page--embedded' : ''}`}>
    <header className="ota-page-header">
      <div>{!embedded && <p className="ota-eyebrow">PHÂN PHỐI & BÁN PHÒNG</p>}{embedded ? <h2>Lịch sử đồng bộ</h2> : <h1>Lịch sử đồng bộ</h1>}<p>Theo dõi yêu cầu trao đổi giá, phòng trống và đặt phòng với Channex.</p></div>
      <div className="ota-page-actions"><button type="button" className="ota-button ota-button--secondary" disabled={busy || query.loading} onClick={refresh}><RefreshCw size={16} aria-hidden="true" />{query.loading ? tUi("common.loading") : 'Tải lại lịch sử'}</button></div>
    </header>
    {!embedded && <nav className="ota-tabs" aria-label={tUi("nav.channelManagement")}>
      <Link className="ota-tab" to={connectionPath}><Link2 size={16} aria-hidden="true" />{connectionPath === '/id/ota' ? 'Kênh OTA' : 'Kết nối Channex'}</Link>
      <Link className="ota-tab is-active" to={historyPath} aria-current="page"><Clock3 size={16} aria-hidden="true" />Lịch sử đồng bộ</Link>
    </nav>}
    {error && <div ref={errorNotice} tabIndex={-1} className="ota-notice ota-notice--error" role="alert"><AlertCircle size={18} aria-hidden="true" /><div><strong>Chưa thể thử lại yêu cầu</strong><p>{error}</p></div></div>}
    {message && <div ref={successNotice} tabIndex={-1} className="ota-notice ota-notice--success" role="status"><CheckCircle2 size={18} aria-hidden="true" /><p>{message}</p></div>}
    {!writeAccess.allowed && <div className="ota-notice ota-notice--info" role="status"><Info size={18} aria-hidden="true" /><p>{accessMessage}</p></div>}
    <section className="ota-panel" aria-labelledby="ota-history-title">
      <div className="ota-section-header">
        <div><h2 id="ota-history-title">Hoạt động gần đây</h2><p>Tối đa 50 yêu cầu mới nhất của khách sạn.</p></div>
        <div className="ota-history-filter"><label className="ota-field" htmlFor="ota-history-status">{tUi("common.status")}<select id="ota-history-status" value={status} onChange={event => setStatus(event.target.value)}><option value="">{tUi("common.allStatuses")}</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{labelUi(label)}</option>)}</select></label>{query.data && <span className="ota-history-count" aria-live="polite">{rows.length} / {jobs.length} yêu cầu</span>}</div>
      </div>
      {query.loading ? <div className="ota-state ota-state--loading" role="status"><span className="ota-state-icon"><RefreshCw size={24} aria-hidden="true" /></span><h3>Đang tải lịch sử đồng bộ</h3><p>Đang lấy trạng thái mới nhất từ khách sạn.</p></div>
        : query.error ? <div className="ota-state" role="alert"><span className="ota-state-icon"><AlertCircle size={24} aria-hidden="true" /></span><h3>Chưa tải được lịch sử</h3><p>{query.error}</p><button type="button" className="ota-button ota-button--secondary" onClick={refresh}>Thử tải lại</button></div>
        : !rows.length ? <div className="ota-state ota-state--empty"><span className="ota-state-icon"><History size={26} aria-hidden="true" /></span><h3>{jobs.length ? 'Chưa có yêu cầu ở trạng thái này' : 'Chưa có lịch sử đồng bộ'}</h3><p>{jobs.length ? 'Chọn trạng thái khác để xem các yêu cầu gần đây.' : 'Gửi yêu cầu từ trang kết nối Channex. Quá trình xử lý và kết quả sẽ xuất hiện tại đây.'}</p>{jobs.length ? <button type="button" className="ota-button ota-button--secondary" onClick={() => setStatus('')}>Xem tất cả trạng thái</button> : <Link className="ota-button ota-button--secondary" to={connectionPath}>Mở kết nối Channex</Link>}</div>
        : <div className="ota-table-scroll" tabIndex={0} role="region" aria-label="Bảng lịch sử đồng bộ, có thể cuộn ngang">
          <table className="ota-table" aria-label="Danh sách yêu cầu đồng bộ"><thead><tr><th scope="col">Yêu cầu đồng bộ</th><th scope="col">Ngày tạo</th><th scope="col">Khoảng ngày</th><th scope="col">{tUi("common.status")}</th><th scope="col">Số lần xử lý</th><th scope="col">Kết quả</th><th scope="col">{tUi("common.actions")}</th></tr></thead><tbody>{rows.map(row => {
            const Icon = jobIcons[row.kind] || RefreshCw;
            const blocked = syncBlockReason(query.data?.connection, query.data?.mappings || [], row.kind);
            return <tr key={row.id}>
              <td><div className="ota-job-type"><span className="ota-job-icon"><Icon size={18} aria-hidden="true" /></span><strong>{channelJobLabel(row)}</strong></div>{row.revisionId && <small className="ota-cell-meta">Mã cập nhật: {row.revisionId}</small>}</td>
              <td><time dateTime={row.createdAt}>{displayTime(row.createdAt)}</time></td>
              <td>{row.start && row.end ? <><span>{displayDate(row.start)} → {displayDate(row.end)}</span><small className="ota-cell-meta">Không gồm ngày kết thúc</small></> : <span className="ota-cell-meta">Không áp dụng khoảng ngày</span>}</td>
              <td><span className={`ota-status ota-status--${Object.hasOwn(statuses, row.status) ? row.status : 'queued'}`}><span className="ota-status-dot" aria-hidden="true" />{statuses[row.status] || 'Chưa rõ trạng thái'}</span></td>
              <td>{row.attempts} lần</td>
              <td className={`ota-result${row.status === 'failed' ? ' ota-result--error' : ''}`}>{row.errorCode ? <>{errors[row.errorCode] || 'Yêu cầu chưa hoàn tất. Nhờ quản trị viên kiểm tra kết nối và dữ liệu tại Channex.'}{row.status === 'queued' && <small className="ota-cell-meta">Đã xếp hàng tự động thử lại</small>}</> : row.status === 'succeeded' ? channelJobSuccessMessage(row) : row.status === 'processing' ? 'Đang trao đổi dữ liệu với Channex' : 'Chờ đến lượt xử lý'}{row.completedAt && <small className="ota-cell-meta">Kết thúc {displayTime(row.completedAt)}</small>}</td>
              <td>{row.status === 'failed' && writeAccess.allowed ? <div className="ota-retry-action"><button type="button" className="ota-button ota-button--secondary ota-button--small" disabled={busy || Boolean(blocked)} aria-describedby={blocked ? `ota-retry-${row.id}` : undefined} onClick={() => retry(row)}><RotateCcw size={14} aria-hidden="true" />{retryingId === row.id ? 'Đang gửi…' : tUi("common.retry")}</button>{blocked && <small className="ota-cell-meta" id={`ota-retry-${row.id}`}>{blocked}</small>}</div> : <span className="ota-cell-meta">—</span>}</td>
            </tr>;
          })}</tbody></table>
        </div>}
      {query.data && <footer className="ota-history-footer"><Info size={15} aria-hidden="true" /><p>Các yêu cầu đang chờ sẽ được xử lý lần lượt. {tUi('channels.refreshHint')}</p></footer>}
    </section>
  </div>;
}
