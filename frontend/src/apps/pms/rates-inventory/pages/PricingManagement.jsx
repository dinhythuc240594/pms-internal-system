import { t as tUi, tr as labelUi, useI18n } from '../../../../shared/i18n/useI18n.js';
import { useEffect, useState } from 'react';
import { Pencil, Plus, X } from 'lucide-react';
import { usePms } from '../../data/usePms';
import { money } from '../../data/model';
import LegacyOverlay from '../../components/LegacyOverlay';
import '../../components/DomainForms.css';
import '../RatesInventory.css';

const titles = { rules: 'Giá nâng cao', vouchers: 'Vouchers', promotions: 'Khuyến mãi' };
const labels = { rules: 'quy tắc', vouchers: 'voucher', promotions: 'khuyến mãi' };
const descriptions = {
  rules: 'Điều chỉnh giá theo ngày trong tuần hoặc số đêm lưu trú.',
  vouchers: 'Quản lý mã giảm giá và điều kiện sử dụng cho đặt phòng mới.',
  promotions: 'Thiết lập ưu đãi đặt sớm, đặt sát ngày hoặc theo số đêm.',
};
const kinds = { weekend: 'Theo ngày trong tuần', los: 'Theo số đêm', earlybird: 'Đặt sớm', lastminute: 'Đặt sát ngày', staypay: 'Ở N đêm, trả M đêm' };
const weekdays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const defaults = {
  rules: { name: '', kind: 'weekend', roomTypeId: '', adjustmentPercent: '10', weekdays: [6, 7], minNights: 1, maxNights: '', priority: 0, active: true },
  vouchers: { name: '', code: '', discountType: 'percent', value: '10', minNights: 1, minTotal: '0', validFrom: '', validTo: '', usageLimit: '', active: true },
  promotions: { name: '', kind: 'earlybird', percent: '10', minDaysBefore: 7, maxDaysBefore: '', minNights: 1, stayN: 3, payM: 2, startDate: '', endDate: '', active: true },
};

export default function PricingManagement({ catalog = 'rules' }) {
  const { tenantId, user } = usePms();
  return <PricingEditor key={`${tenantId}:${user?.id}:${catalog}`} catalog={catalog} />;
}

function PricingEditor({ catalog }) {
  useI18n();
  const { requestTenant, savePricing, access, roomTypes, tenantId, settings } = usePms();
  const [rows, setRows] = useState([]), [form, setForm] = useState(null), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [message, setMessage] = useState('');
  const writable = access('settings.write', catalog === 'rules' ? 'ARI_MANAGEMENT' : 'VOUCHER_PROMO', true).allowed;
  const load = () => requestTenant('/pricing').then(data => setRows(data[catalog] || []));
  useEffect(() => {
    let live = true;
    requestTenant('/pricing').then(data => { if (live) setRows(data[catalog] || []); }).catch(err => { if (live) setError(err.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [requestTenant, catalog, tenantId]);
  const update = (key, value) => setForm(old => ({ ...old, [key]: value }));
  const close = () => { if (!busy) { setForm(null); setError(''); } };
  const edit = row => {
    setForm({ ...defaults[catalog], ...row, roomTypeId: row?.roomTypeId || '', maxNights: row?.maxNights ?? '', usageLimit: row?.usageLimit ?? '', maxDaysBefore: row?.maxDaysBefore ?? '' });
    setError(''); setMessage('');
  };
  async function retry() {
    setLoading(true); setError('');
    try { await load(); } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function save(event) {
    event.preventDefault(); if (busy || !writable) return;
    setBusy(true); setError(''); setMessage('');
    const input = Object.fromEntries(Object.keys(defaults[catalog]).map(key => [key, form[key]]));
    if (form.id) input.id = form.id;
    if (catalog === 'rules') { input.roomTypeId ||= null; input.maxNights = input.maxNights === '' ? null : Number(input.maxNights); }
    if (catalog === 'vouchers') { input.usageLimit = input.usageLimit === '' ? null : Number(input.usageLimit); delete input.usedCount; }
    if (catalog === 'promotions') input.maxDaysBefore = input.maxDaysBefore === '' ? null : Number(input.maxDaysBefore);
    for (const key of ['minNights', 'priority', 'minDaysBefore', 'stayN', 'payM']) if (key in input) input[key] = Number(input[key]);
    try {
      await savePricing(catalog, input);
      setForm(null);
      setMessage('Đã lưu cấu hình. Booking đã tạo giữ nguyên giá đã chốt.');
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const numberField = (key, label, min = 0, max, step = '1') => <label>{labelUi(label)}<input name={key} type="number" required value={form[key] ?? ''} min={min} max={max} step={step} onChange={event => update(key, event.target.value)} /></label>;
  const dateField = (key, label) => <label>{labelUi(label)}<input name={key} type="date" value={form[key] || ''} onChange={event => update(key, event.target.value)} /></label>;
  return <div className="pms-domain-page pms-rates-page">
    <header className="domain-toolbar rates-page-heading">
      <div><span className="rates-kicker">Giá &amp; Phòng trống</span><h1>{titles[catalog]}</h1><p>{descriptions[catalog]}</p></div>
      <div className="rates-toolbar-actions"><button type="button" className="primary" disabled={!writable || loading || busy} onClick={() => edit(null)}><Plus size={16} aria-hidden="true" /> Thêm {labels[catalog]}</button></div>
    </header>
    {error && !form && <div className="domain-error" role="alert">{error} <button type="button" disabled={loading || busy} onClick={retry}>Tải lại danh sách</button></div>}
    {message && <p className="rates-notice" role="status">{message}</p>}
    {!writable && <p className="rates-notice">Bạn có quyền xem cấu hình. Cần quyền quản lý để thêm hoặc chỉnh sửa.</p>}
    <section className="domain-panel" aria-label={`Danh sách ${labels[catalog]}`} aria-busy={loading}>
      <div className="rates-section-heading"><div><h2>{tUi("common.list")}{' '}{labels[catalog]}</h2><p className="rates-muted">{catalog === 'rules' ? 'Giá theo ngày được ưu tiên. Khi chưa có giá theo ngày, dùng quy tắc phù hợp có độ ưu tiên cao nhất.' : 'Voucher thay thế khuyến mãi. Nếu không dùng voucher, hệ thống chọn khuyến mãi phù hợp có mức giảm lớn nhất.'}</p></div>{!loading && <span className="rates-summary">{rows.length} cấu hình · {rows.filter(row => row.active).length} đang bật</span>}</div>
      {loading ? <div className="rates-empty" role="status"><strong>Đang tải cấu hình…</strong><p>Danh sách giá và ưu đãi sẽ xuất hiện tại đây.</p></div> : error && !rows.length ? <div className="rates-empty">Chưa tải được danh sách. Vui lòng thử lại.</div> : !rows.length ? <div className="rates-empty"><strong>Chưa có {labels[catalog]}</strong><p>{writable ? `Thêm ${labels[catalog]} đầu tiên để áp dụng cho đặt phòng mới.` : 'Chưa có cấu hình để hiển thị.'}</p></div> : <div className="rates-scroll" role="region" aria-label={`Bảng ${titles[catalog].toLowerCase()}`} tabIndex={0}><table><thead><tr><th scope="col">{catalog === 'vouchers' ? 'Voucher' : 'Tên cấu hình'}</th><th scope="col">Điều kiện áp dụng</th><th scope="col">{catalog === 'rules' ? 'Điều chỉnh giá' : 'Mức ưu đãi'}</th><th scope="col">{tUi("common.status")}</th><th scope="col">{tUi("common.actions")}</th></tr></thead><tbody>
        {rows.map(row => <tr key={row.id}>
          <td><strong>{row.name}</strong><div className="rates-muted">{row.code || kinds[row.kind]}</div></td>
          <td>{catalog === 'rules' ? <><span>{row.roomTypeId ? roomTypes.find(type => type.id === row.roomTypeId)?.name || 'Loại phòng đã ngừng sử dụng' : tUi("common.allRoomTypes")}</span><div className="rates-muted">{row.kind === 'weekend' && <>{(row.weekdays || []).map(day => weekdays[day - 1]).join(', ')}<br /></>}Từ {row.minNights} đến {row.maxNights ?? 'không giới hạn'} đêm</div></> : catalog === 'vouchers' ? <><span>Tối thiểu {row.minNights} đêm · {money(row.minTotal, settings.currency)}</span><div className="rates-muted">Đã dùng {row.usedCount || 0}/{row.usageLimit ?? 'không giới hạn'} lượt{(row.validFrom || row.validTo) && <><br />Hiệu lực: {row.validFrom || tUi("usage.unlimited")} → {row.validTo || tUi("usage.unlimited")}</>}</div></> : <><span>Tối thiểu {row.minNights} đêm</span><div className="rates-muted">{row.kind === 'staypay' ? 'Theo số đêm lưu trú' : `Đặt trước ${row.minDaysBefore}–${row.maxDaysBefore ?? 'không giới hạn'} ngày`}{(row.startDate || row.endDate) && <><br />Lưu trú: {row.startDate || tUi("usage.unlimited")} → {row.endDate || tUi("usage.unlimited")}</>}</div></>}</td>
          <td><strong>{catalog === 'rules' ? `${Number(row.adjustmentPercent) > 0 ? '+' : ''}${Number(row.adjustmentPercent)}%` : row.kind === 'staypay' ? `Ở ${row.stayN}, trả ${row.payM} đêm` : row.discountType === 'fixed' ? money(row.value, settings.currency) : `${Number(row.value ?? row.percent)}%`}</strong>{catalog === 'rules' && <div className="rates-muted">Ưu tiên {row.priority}</div>}</td>
          <td><span className={`rates-badge ${row.active ? 'is-active' : 'is-paused'}`}>{row.active ? 'Đang bật' : 'Đã tắt'}</span></td>
          <td><button type="button" className="rates-icon-button" disabled={!writable || busy} aria-label={`Sửa ${labels[catalog]} ${row.name}`} onClick={() => edit(row)}><Pencil size={15} aria-hidden="true" />{' '}{tUi("common.edit")}</button></td>
        </tr>)}
      </tbody></table></div>}
    </section>
    {form && <LegacyOverlay title={`${form.id ? tUi("common.edit") : 'Thêm'} ${labels[catalog]}`} onClose={close}>
      <div className="rates-dialog">
        <header className="rates-dialog-header"><div><span className="rates-kicker">{titles[catalog]}</span><h2>{form.id ? tUi("common.edit") : 'Thêm'} {labels[catalog]}</h2></div><button type="button" className="rates-icon-button" aria-label="Đóng cấu hình" disabled={busy} onClick={close}><X size={20} aria-hidden="true" /></button></header>
        <form onSubmit={save}>
          <div className="rates-dialog-body">
            {error && <p className="domain-error" role="alert">{error}</p>}
            <fieldset disabled={busy || !writable}>
              <section className="rates-form-section"><h3>Thông tin cấu hình</h3><div className="rates-form-grid">
                <label>Tên {labels[catalog]}<input name="name" required maxLength="120" value={form.name} onChange={event => update('name', event.target.value)} /></label>
                {catalog === 'vouchers' ? <label>Mã voucher<input name="code" required maxLength="40" value={form.code} onChange={event => update('code', event.target.value.toUpperCase())} /></label> : <label>Loại áp dụng<select name="kind" value={form.kind} onChange={event => { const kind = event.target.value; setForm(old => ({ ...old, kind, ...(catalog === 'promotions' ? { minDaysBefore: kind === 'earlybird' ? 7 : 0, maxDaysBefore: kind === 'lastminute' ? 2 : '' } : {}) })); }}>{Object.entries(kinds).filter(([key]) => catalog === 'rules' ? ['weekend', 'los'].includes(key) : ['earlybird', 'lastminute', 'staypay'].includes(key)).map(([key, label]) => <option key={key} value={key}>{labelUi(label)}</option>)}</select></label>}
                <label>{tUi("common.status")}<select name="active" value={String(form.active)} onChange={event => update('active', event.target.value === 'true')}><option value="true">Đang bật</option><option value="false">Đã tắt</option></select></label>
              </div></section>
              <section className="rates-form-section"><h3>{catalog === 'rules' ? 'Điều chỉnh giá' : 'Mức ưu đãi'}</h3><div className="rates-form-grid">
                {catalog === 'rules' && <><label>{tUi("common.roomType")}<select name="roomTypeId" value={form.roomTypeId} onChange={event => update('roomTypeId', event.target.value)}><option value="">{tUi("common.allRoomTypes")}</option>{roomTypes.filter(row => row.active !== false || row.id === form.roomTypeId).map(row => <option key={row.id} value={row.id}>{row.name}{row.active === false ? ' (ngừng sử dụng)' : ''}</option>)}</select></label>{numberField('adjustmentPercent', 'Điều chỉnh (%)', -100, 1000, '0.0001')}{numberField('priority', 'Độ ưu tiên', 0, 1000)}</>}
                {catalog === 'vouchers' && <><label>Kiểu giảm<select name="discountType" value={form.discountType} onChange={event => update('discountType', event.target.value)}><option value="percent">Phần trăm (%)</option><option value="fixed">Số tiền ({settings.currency})</option></select></label>{numberField('value', form.discountType === 'percent' ? 'Mức giảm (%)' : `Mức giảm (${settings.currency})`, 0, form.discountType === 'percent' ? 100 : undefined, '0.0001')}</>}
                {catalog === 'promotions' && (form.kind === 'staypay' ? <>{numberField('stayN', 'Ở N đêm', 2, 366)}{numberField('payM', 'Trả M đêm', 1, 365)}</> : numberField('percent', 'Mức giảm (%)', 0, 100, '0.0001'))}
              </div>{catalog === 'rules' && <p className="rates-muted">Số dương tăng giá, số âm giảm giá. Độ ưu tiên lớn hơn được chọn trước.</p>}</section>
              <section className="rates-form-section"><h3>Điều kiện áp dụng</h3>
                {catalog === 'rules' && form.kind === 'weekend' && <div className="rates-day-options" role="group" aria-label="Ngày áp dụng">{weekdays.map((day, i) => <label key={day} className="rates-checkbox"><input name="weekdays" type="checkbox" checked={form.weekdays.includes(i + 1)} onChange={event => update('weekdays', event.target.checked ? [...form.weekdays, i + 1] : form.weekdays.filter(n => n !== i + 1))} />{day}</label>)}</div>}
                <div className="rates-form-grid">{numberField('minNights', 'Số đêm tối thiểu', 1, 366)}
                  {catalog === 'rules' && <label>Số đêm tối đa<input name="maxNights" type="number" min="1" max="366" placeholder={tUi("usage.unlimited")} value={form.maxNights} onChange={event => update('maxNights', event.target.value)} /></label>}
                  {catalog === 'vouchers' && <>{numberField('minTotal', `Tổng trước giảm tối thiểu (${settings.currency})`, 0, undefined, '0.0001')}<label>Lượt dùng tối đa<input name="usageLimit" type="number" min="1" placeholder={tUi("usage.unlimited")} value={form.usageLimit} onChange={event => update('usageLimit', event.target.value)} /></label></>}
                  {catalog === 'promotions' && form.kind !== 'staypay' && <>{numberField('minDaysBefore', 'Đặt trước ít nhất (ngày)', 0)}<label>Đặt trước nhiều nhất (ngày)<input name="maxDaysBefore" type="number" min="0" placeholder={tUi("usage.unlimited")} value={form.maxDaysBefore} onChange={event => update('maxDaysBefore', event.target.value)} /></label></>}
                </div>
                {catalog !== 'rules' && <div className="rates-form-grid">{catalog === 'vouchers' ? <>{dateField('validFrom', 'Ngày đặt bắt đầu hiệu lực')}{dateField('validTo', 'Ngày hết hiệu lực')}</> : <>{dateField('startDate', 'Ngày lưu trú bắt đầu')}{dateField('endDate', 'Ngày lưu trú kết thúc')}</>}</div>}
                {catalog !== 'rules' && <p className="rates-muted">Để trống ngày nếu không giới hạn. Ngày kết thúc không nằm trong thời gian áp dụng.</p>}
              </section>
            </fieldset>
          </div>
          <footer className="rates-dialog-footer"><p className="rates-muted">Chỉ áp dụng cho báo giá và booking mới.</p><div className="rates-form-actions"><button type="button" disabled={busy} onClick={close}>{tUi("common.cancel")}</button><button className="primary" type="submit" disabled={busy || !writable}>{busy ? tUi("common.saving") : 'Lưu cấu hình'}</button></div></footer>
        </form>
      </div>
    </LegacyOverlay>}
  </div>;
}
