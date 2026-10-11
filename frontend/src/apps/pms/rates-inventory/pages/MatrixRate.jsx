import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, Save, CalendarDays } from 'lucide-react';
import { usePms } from '../../data/usePms';
import { today, addDays, nights, money } from '../../data/model';
import { useInventoryQuery } from '../../inventory/useInventoryQuery';
import { rateRangeError, selectedRateRanges } from '../rateRange';
import '../../components/DomainForms.css';
import '../RatesInventory.css';

export default function MatrixRate() {
  const { roomTypes, settings, access, saveRate } = usePms();
  const [range, setRange] = useState({ start: today(settings.timezone), end: addDays(today(settings.timezone), 14) });
  const [typeId, setTypeId] = useState(''), [selected, setSelected] = useState(new Set()), [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [version, setVersion] = useState(0);
  const rangeError = rateRangeError(range, 31);
  const query = rangeError ? null : new URLSearchParams(range).toString();
  const rateQuery = useInventoryQuery(query ? '/rates?' + query : null, version);
  const availabilityQuery = useInventoryQuery(query ? '/availability?' + query : null, version);
  const loading = rateQuery.loading || availabilityQuery.loading;
  const loadError = rateQuery.error || availabilityQuery.error;
  const writable = access('settings.write', 'ARI_MANAGEMENT', true).allowed;
  const types = roomTypes.filter(type => type.active !== false && (!typeId || type.id === typeId));
  const days = [];
  if (!rangeError) for (let date = range.start; date < range.end; date = addDays(date, 1)) days.push(date);
  const rates = rateQuery.data?.rates || [], availability = availabilityQuery.data?.availability || [];
  function changeRange(next) { setRange(next); setSelected(new Set()); setError(''); setNotice(''); }
  function toggle(key) { setSelected(old => { const next = new Set(old); if (next.has(key)) next.delete(key); else next.add(key); return next; }); }
  function selectRow(type) {
    const keys = days.map(date => `${type.id}:${date}`);
    setSelected(old => { const next = new Set(old); const all = keys.every(key => next.has(key)); keys.forEach(key => all ? next.delete(key) : next.add(key)); return next; });
  }
  async function save(event, action = 'price') {
    event?.preventDefault();
    if (busy || !writable || !selected.size || loading || loadError || rangeError) return;
    if (action === 'price' && (price === '' || !Number.isFinite(Number(price)) || Number(price) < 0)) { setError('Nhập giá mới hợp lệ, lớn hơn hoặc bằng 0.'); return; }
    setBusy(true); setError(''); setNotice('');
    let completed = 0;
    try {
      for (const range of selectedRateRanges(types, days, selected)) {
        await saveRate({ ...range, ...(action === 'price' ? { price } : { stopSell: action === 'close' }) });
        completed += nights(range.start, range.end);
      }
      setSelected(new Set()); setPrice(''); setNotice(`Đã ${action === 'price' ? 'cập nhật giá' : action === 'close' ? 'dừng bán' : 'mở bán'} ${completed} ô đã chọn.`);
    } catch (err) { setError(`${err.message}${completed ? ` Đã lưu ${completed} ô; hãy đối chiếu bảng trước khi thử lại.` : ''}`); }
    finally { setBusy(false); setVersion(value => value + 1); }
  }
  return <div className="pms-domain-page pms-rates-page">
    <header className="domain-toolbar rates-page-heading"><div><span className="rates-kicker">Giá & Phòng trống</span><h1>Giá & Phòng trống hàng ngày</h1><p>Đối chiếu phòng còn bán và cập nhật giá theo từng ngày.</p></div><Link className="rates-link-button" to="/id/gia/ari"><CalendarDays size={16} aria-hidden="true" /> Giá & khóa phòng</Link></header>
    <section className="domain-panel rates-filters"><div className="domain-fields"><label>Từ ngày<input type="date" required disabled={busy} value={range.start} onChange={event => changeRange({ ...range, start: event.target.value })} /></label><label>Đến ngày (không gồm)<input type="date" required min={range.start ? addDays(range.start, 1) : undefined} disabled={busy} value={range.end} onChange={event => changeRange({ ...range, end: event.target.value })} /></label><label>Loại phòng<select value={typeId} disabled={busy} onChange={event => { setTypeId(event.target.value); setSelected(new Set()); }}><option value="">Tất cả loại phòng</option>{roomTypes.filter(type => type.active !== false).map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><div className="rates-period-actions"><button aria-label="Lùi 7 ngày" disabled={busy || Boolean(rangeError)} onClick={() => changeRange({ start: addDays(range.start, -7), end: addDays(range.end, -7) })}><ChevronLeft size={16} aria-hidden="true" /></button><button disabled={busy} onClick={() => changeRange({ start: today(settings.timezone), end: addDays(today(settings.timezone), 14) })}>Hôm nay</button><button aria-label="Tiến 7 ngày" disabled={busy || Boolean(rangeError)} onClick={() => changeRange({ start: addDays(range.start, 7), end: addDays(range.end, 7) })}><ChevronRight size={16} aria-hidden="true" /></button><button aria-label="Tải lại giá và phòng trống" disabled={busy || loading || Boolean(rangeError)} onClick={() => setVersion(value => value + 1)}><RefreshCw size={16} aria-hidden="true" /></button></div></div><p className="rates-muted">Tối đa 31 ngày mỗi lần. Chọn từng ô giá hoặc chọn cả hàng để cập nhật nhiều ngày.</p></section>
    {(rangeError || error) && <p className="domain-error" role="alert">{rangeError || error}</p>}{notice && <p className="rates-notice is-success" role="status">{notice}</p>}
    {loadError && <div className="domain-error" role="alert">{loadError} <button onClick={() => setVersion(value => value + 1)}>Thử lại</button></div>}
    {!writable && <p className="rates-notice" role="status">Bạn đang ở chế độ xem. Cần quyền quản lý cấu hình để cập nhật giá hoặc trạng thái bán.</p>}
    {!rangeError && <section className="domain-panel rates-table-panel"><div className="rates-section-heading"><div><h2>Lịch giá & phòng còn bán</h2><p>{days.length} ngày · {types.length} loại phòng · Giá / đêm ({settings.currency})</p></div><div className="rates-legend"><span><i className="is-active" /> Còn bán</span><span><i className="is-low" /> Còn 1–2 phòng</span><span><i className="is-paused" /> Hết phòng / dừng bán</span></div></div>
      {loading ? <p className="rates-empty" role="status">Đang tải giá và phòng trống…</p> : !loadError && <div className="rates-scroll rates-matrix-scroll" tabIndex={0} role="region" aria-label="Bảng giá và phòng trống theo ngày"><table className="rates-matrix"><thead><tr><th scope="col">Loại phòng / Giá mỗi đêm</th>{days.map(date => <th scope="col" key={date} className={[0, 6].includes(new Date(`${date}T12:00:00`).getDay()) ? 'is-weekend' : undefined}><strong>{new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</strong><small>{new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN', { weekday: 'short' })}</small></th>)}</tr></thead><tbody>{types.map(type => <tr key={type.id}><th scope="row"><strong>{type.name}</strong><small className="rates-muted">Phòng còn bán / Giá</small>{writable && <button className="rates-row-select" disabled={busy} onClick={() => selectRow(type)}>{days.every(date => selected.has(`${type.id}:${date}`)) ? 'Bỏ chọn hàng' : 'Chọn cả hàng'}</button>}</th>{days.map(date => {
        const rate = rates.find(row => row.roomTypeId === type.id && row.date === date);
        const stock = availability.find(row => row.roomTypeId === type.id && row.date === date);
        const stopped = Boolean(rate?.stopSell || stock?.stopSell);
        const count = stock?.available;
        const state = stopped || count === 0 ? 'is-paused' : count <= 2 ? 'is-low' : 'is-active';
        const key = `${type.id}:${date}`;
        return <td key={date}><span className={`rates-stock ${state}`}>{stopped ? 'Dừng bán' : count === undefined ? '—' : `${count} phòng`}</span><button className="rates-cell" aria-pressed={selected.has(key)} aria-label={`${type.name}, ${date}, ${money(rate?.price ?? type.price, settings.currency)}`} disabled={busy || !writable} onClick={() => toggle(key)}>{money(rate?.price ?? type.price, settings.currency)}{selected.has(key) && <small>Đã chọn</small>}</button></td>;
      })}</tr>)}{!types.length && <tr><td colSpan={days.length + 1} className="rates-empty">Chưa có loại phòng phù hợp.</td></tr>}</tbody></table></div>}
      <p className="rates-table-note">Phòng còn bán đã trừ đặt phòng, khóa phòng và dừng bán. Đổi giá không tự mở lại ngày đã dừng bán.</p>
    </section>}
    {writable && selected.size > 0 && <section className="domain-panel rates-bulk-panel" aria-label="Cập nhật ô đã chọn"><div className="rates-section-heading"><div><h2>Đã chọn {selected.size} ô giá</h2><p>Cập nhật chỉ áp dụng cho loại phòng và ngày đang chọn.</p></div><button disabled={busy} onClick={() => setSelected(new Set())}>Bỏ chọn</button></div><form className="domain-fields" onSubmit={event => save(event)}><label>Giá mới / đêm ({settings.currency})<input required type="number" min="0" step="0.0001" value={price} disabled={busy} onChange={event => setPrice(event.target.value)} /></label><button type="submit" className="primary rates-icon-button" disabled={busy || loading || Boolean(loadError)}><Save size={16} aria-hidden="true" /> {busy ? 'Đang lưu…' : 'Cập nhật giá'}</button><button type="button" disabled={busy || loading || Boolean(loadError)} onClick={() => save(null, 'open')}>Mở bán</button><button type="button" className="rates-danger-button" disabled={busy || loading || Boolean(loadError)} onClick={() => save(null, 'close')}>Dừng bán</button></form></section>}
  </div>;
}
