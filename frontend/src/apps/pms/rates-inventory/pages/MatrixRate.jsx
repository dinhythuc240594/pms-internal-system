import { t as tUi, useI18n } from '../../../../shared/i18n/useI18n.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, Save, CalendarDays } from 'lucide-react';
import { usePms } from '../../data/usePms';
import { today, addDays, nights } from '../../data/model';
import { useInventoryQuery } from '../../inventory/useInventoryQuery';
import { rateRangeError, selectedRateRanges } from '../rateRange';
import DailyRateMatrix from '../components/DailyRateMatrix';
import '../../components/DomainForms.css';
import '../RatesInventory.css';
import './MatrixRate.css';

export default function MatrixRate() {
  useI18n();
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
    if (action === 'price' && (price === '' || !Number.isFinite(Number(price)) || Number(price) < 0)) { setError(tUi('rates.invalidPrice')); return; }
    setBusy(true); setError(''); setNotice('');
    let completed = 0;
    try {
      for (const range of selectedRateRanges(types, days, selected)) {
        await saveRate({ ...range, ...(action === 'price' ? { price } : { stopSell: action === 'close' }) });
        completed += nights(range.start, range.end);
      }
      setSelected(new Set()); setPrice(''); setNotice(tUi(action === 'price' ? 'rates.priceSuccess' : action === 'close' ? 'rates.closeSuccess' : 'rates.openSuccess', { count: completed }));
    } catch (err) { setError(`${err.message}${completed ? ' ' + tUi('rates.partialSave', { count: completed }) : ''}`); }
    finally { setBusy(false); setVersion(value => value + 1); }
  }
  return <div className="pms-domain-page pms-rates-page pms-matrix-page">
    <header className="domain-toolbar rates-page-heading"><div><span className="rates-kicker">{tUi("nav.rates")}</span><h1>{tUi("nav.dailyRates")}</h1><p>{tUi("rates.intro")}</p></div><Link className="rates-link-button" to="/id/gia/ari"><CalendarDays size={16} aria-hidden="true" />{' '}{tUi("rates.blocks")}</Link></header>
    <section className="domain-panel rates-filters"><div className="domain-fields"><label>{tUi("common.fromDate")}<input type="date" required disabled={busy} value={range.start} onChange={event => changeRange({ ...range, start: event.target.value })} /></label><label>{tUi("rates.endExclusive")}<input type="date" required min={range.start ? addDays(range.start, 1) : undefined} disabled={busy} value={range.end} onChange={event => changeRange({ ...range, end: event.target.value })} /></label><label>{tUi("common.roomType")}<select value={typeId} disabled={busy} onChange={event => { setTypeId(event.target.value); setSelected(new Set()); }}><option value="">{tUi("common.allRoomTypes")}</option>{roomTypes.filter(type => type.active !== false).map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><div className="rates-period-actions"><button aria-label={tUi("rates.previousSeven")} disabled={busy || Boolean(rangeError)} onClick={() => changeRange({ start: addDays(range.start, -7), end: addDays(range.end, -7) })}><ChevronLeft size={16} aria-hidden="true" /></button><button disabled={busy} onClick={() => changeRange({ start: today(settings.timezone), end: addDays(today(settings.timezone), 14) })}>{tUi("common.today")}</button><button aria-label={tUi("rates.nextSeven")} disabled={busy || Boolean(rangeError)} onClick={() => changeRange({ start: addDays(range.start, 7), end: addDays(range.end, 7) })}><ChevronRight size={16} aria-hidden="true" /></button><button aria-label={tUi("rates.reload")} disabled={busy || loading || Boolean(rangeError)} onClick={() => setVersion(value => value + 1)}><RefreshCw size={16} aria-hidden="true" /></button></div></div><p className="rates-muted">{tUi("rates.rangeHint")}</p></section>
    {(rangeError || error) && <p className="domain-error" role="alert">{rangeError || error}</p>}{notice && <p className="rates-notice is-success" role="status">{notice}</p>}
    {loadError && <div className="domain-error" role="alert">{loadError} <button onClick={() => setVersion(value => value + 1)}>{tUi("common.retry")}</button></div>}
    {!writable && <p className="rates-notice" role="status">{tUi("rates.readOnly")}</p>}
    {writable && selected.size > 0 && <section className="domain-panel rates-bulk-panel" aria-label={tUi("rates.updateSelected")}><div className="rates-section-heading"><div><h2>{tUi('rates.selectedTitle', { count: selected.size })}</h2><p>{tUi("rates.selectedHint")}</p></div><button disabled={busy} onClick={() => setSelected(new Set())}>{tUi("rates.deselect")}</button></div><form className="domain-fields" onSubmit={event => save(event)}><label>{tUi('rates.newPrice', { currency: settings.currency })}<input required type="number" min="0" step="0.0001" value={price} disabled={busy} onChange={event => setPrice(event.target.value)} /></label><button type="submit" className="primary rates-icon-button" disabled={busy || loading || Boolean(loadError)}><Save size={16} aria-hidden="true" /> {busy ? tUi("common.saving") : tUi("rates.updatePrice")}</button><button type="button" disabled={busy || loading || Boolean(loadError)} onClick={() => save(null, 'open')}>{tUi("rates.openSell")}</button><button type="button" className="rates-danger-button" disabled={busy || loading || Boolean(loadError)} onClick={() => save(null, 'close')}>{tUi("rates.stopSell")}</button></form></section>}
    {!rangeError && <section className="domain-panel rates-table-panel"><div className="rates-section-heading"><div><h2>{tUi("rates.calendar")}</h2><p>{tUi('rates.summary', { days: days.length, types: types.length, currency: settings.currency })}</p></div><div className="rates-legend"><span><i className="is-active" />{' '}{tUi("rates.available")}</span><span><i className="is-low" />{' '}{tUi("rates.lowStock")}</span><span><i className="is-paused" />{' '}{tUi("rates.soldOut")}</span></div></div>
      {loading ? <p className="rates-empty" role="status">{tUi("rates.loading")}</p> : !loadError && <DailyRateMatrix types={types} days={days} rates={rates} availability={availability} settings={settings} selected={selected} writable={writable} busy={busy} onToggle={toggle} onSelectRow={selectRow} />}
      <p className="rates-table-note">{tUi("rates.note")}</p>
    </section>}
  </div>;
}
