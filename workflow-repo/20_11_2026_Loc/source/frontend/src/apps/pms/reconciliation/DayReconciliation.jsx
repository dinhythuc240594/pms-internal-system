import { formatDate, formatDateTime } from '../../../shared/lib/date.js';
import DateInput from '../../../shared/components/DateInput.jsx';
import { useEffect, useRef, useState } from 'react';
import { CalendarCheck, CheckCheck, History, RefreshCw } from 'lucide-react';
import { usePms } from '../data/usePms';
import { createIntentJournal } from '../data/api';
import { today, money } from '../data/model';
import { useI18n } from '../../../shared/i18n/useI18n';
import FormDialog from '../components/FormDialog';
import './DayReconciliation.css';
import NightAuditPanel from './NightAuditPanel';

const intentStorage = () => { try { return sessionStorage; } catch { return undefined; } };

export default function DayReconciliation() {
  const { t } = useI18n();
  const { settings, tenantId, user, authGeneration, requestTenant, access, workspaceRevision } = usePms();
  const [day, setDay] = useState(() => today(settings.timezone));
  const [dayValid, setDayValid] = useState(true);
  const [previewResult, setPreviewResult] = useState(null), [historyResult, setHistoryResult] = useState(null);
  const [actionError, setActionError] = useState(''), [stalePreview, setStalePreview] = useState(false), [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0), [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(false), [note, setNote] = useState(''), [acknowledged, setAcknowledged] = useState(false);
  const [dialogError, setDialogError] = useState(''), [notice, setNotice] = useState(''), [selectedRecord, setSelectedRecord] = useState(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [journal] = useState(() => createIntentJournal(intentStorage()));
  const inFlight = useRef(false), current = useRef(null);
  const scope = `${tenantId}:${user?.id}:${authGeneration}`;
  const maxDay = today(settings.timezone);
  const valid = dayValid && /^\d{4}-\d{2}-\d{2}$/.test(day) && day <= maxDay;
  const canConfirm = access('reconciliation.confirm').allowed;
  const previewKey = JSON.stringify([scope, day, revision, workspaceRevision]);
  const historyKey = JSON.stringify([previewKey, page, historyRevision]);
  const preview = !stalePreview && previewResult?.key === previewKey ? previewResult.data : null;
  const history = historyResult?.key === historyKey ? historyResult.data : null;
  const error = actionError || (previewResult?.key === previewKey ? previewResult.error : '');
  const historyError = historyResult?.key === historyKey ? historyResult.error : '';
  const loading = valid && previewResult?.key !== previewKey;
  const savedView = selectedRecord?.scope === scope && selectedRecord?.day === day ? selectedRecord.record : null;

  useEffect(() => {
    let mounted = true;
    if (valid) requestTenant(`/reconciliation?date=${encodeURIComponent(day)}`).then(data => {
      if (mounted) setPreviewResult({ key: previewKey, data, error: '' });
    }).catch(err => {
      if (mounted) setPreviewResult({ key: previewKey, data: null, error: err.message });
    });
    return () => { mounted = false; };
  }, [requestTenant, previewKey, day, valid]);

  useEffect(() => {
    let mounted = true;
    if (valid) requestTenant(`/reconciliation/history?${new URLSearchParams({ date: day, page, pageSize: 10 })}`).then(data => {
      if (mounted) setHistoryResult({ key: historyKey, data, error: '' });
    }).catch(err => { if (mounted) setHistoryResult({ key: historyKey, data: null, error: err.message }); });
    return () => { mounted = false; };
  }, [requestTenant, historyKey, day, valid, page]);

  useEffect(() => {
    current.current = { scope, requestTenant };
    return () => { current.current = { scope: null }; };
  }, [scope, requestTenant]);

  function changeDay(value) {
    setDay(value); setPage(1); setNotice(''); setNote(''); setSelectedRecord(null); setActionError(''); setStalePreview(false);
  }
  function reload() { setNotice(''); setActionError(''); setStalePreview(false); setSelectedRecord(null); setRevision(value => value + 1); }
  function openConfirmation() { setAcknowledged(false); setDialogError(''); setDialog(true); }
  async function confirm(event) {
    event.preventDefault();
    if (inFlight.current || !valid || !preview || !acknowledged || !canConfirm) return;
    inFlight.current = true; setBusy(true); setDialogError('');
    const operationScope = scope;
    const body = { date: day, previewToken: preview.previewToken, note };
    const path = `/api/tenants/${encodeURIComponent(tenantId)}/reconciliation/confirm`;
    try {
      const intent = await journal.acquire(path, body, undefined, user?.id);
      if (current.current.scope !== operationScope) return;
      const result = await current.current.requestTenant('/reconciliation/confirm', { method: 'POST', body, intent: intent.key });
      journal.confirm(intent);
      if (current.current.scope !== operationScope) return;
      setDialog(false); setNote(''); setNotice(t('reconciliation.saved')); setSelectedRecord({ scope, day, record: result });
      // History changes after a confirmation; the displayed saved snapshot stays fixed.
      setPage(1); setHistoryRevision(value => value + 1);
    } catch (err) {
      if (current.current.scope === operationScope) {
        if (err.code === 'preview_changed') { setDialog(false); setStalePreview(true); setActionError(err.message); }
        else setDialogError(err.message);
      }
    } finally { inFlight.current = false; if (current.current.scope === operationScope) setBusy(false); }
  }

  const data = valid ? savedView?.snapshot || preview : null;
  const timestamp = (value, timezone = settings.timezone) => formatDateTime(value, timezone);
  const totalPages = Math.max(1, Math.ceil((history?.pagination.totalItems || 0) / 10));
  return <div className="day-reconciliation" data-i18n-ignore>
    <header className="day-reconciliation-heading"><div><h1><CalendarCheck size={24} aria-hidden="true" />{t('reconciliation.title')}</h1><p>{t('reconciliation.intro')}</p></div></header>
    <p className="day-reconciliation-notice">{t('reconciliation.boundary')}</p>
    <section className="day-reconciliation-filter" aria-label={t('reconciliation.current')}>
      <label htmlFor="reconciliation-date">{t('reconciliation.date')}<DateInput id="reconciliation-date" required value={day} max={maxDay} disabled={busy || dialog} onValidityChange={setDayValid} onChange={changeDay} aria-invalid={!valid} aria-describedby={!valid ? 'reconciliation-date-error' : undefined} /></label>
      <p>{t('reconciliation.timezone')}<strong>{settings.timezone}</strong></p>
      <button type="button" disabled={loading || busy || dialog || !valid} onClick={reload}><RefreshCw size={16} aria-hidden="true" />{t('reconciliation.reload')}</button>
    </section>
    {!valid && <p id="reconciliation-date-error" className="day-reconciliation-error" role="alert">{t('reconciliation.invalidDate')}</p>}
    {notice && <p className="day-reconciliation-success" role="status">{notice}</p>}
    {error && <div className="day-reconciliation-error" role="alert"><p>{error}</p><button type="button" disabled={busy || loading} onClick={reload}>{t('reconciliation.retry')}</button></div>}
    {loading && <p role="status">{t('reconciliation.loading')}</p>}
    {data && <>
      <section className="day-reconciliation-snapshot" aria-label={savedView ? t('reconciliation.savedView') : t('reconciliation.current')}>
        <div><h2>{savedView ? t('reconciliation.savedView') : t('reconciliation.current')}</h2><p>{t('reconciliation.captured')}: <strong>{timestamp(data.generatedAt, data.timezone)}</strong></p>{savedView && <p>{t('reconciliation.by')}: <span>{savedView.actor}</span> · {t('reconciliation.savedAt')}: {timestamp(savedView.createdAt, data.timezone)}</p>}</div>
        {savedView && <button type="button" disabled={busy} onClick={() => setSelectedRecord(null)}>{t('reconciliation.backToPreview')}</button>}
      </section>
      {savedView && <p className="day-reconciliation-notice">{t('reconciliation.snapshotNote')}<br /><span className="day-reconciliation-note-text">{savedView.note || t('reconciliation.noNote')}</span></p>}
      <div className="day-reconciliation-cards" aria-label={t('reconciliation.cashNote')}>
        {[[t('reconciliation.receipts'), data.summary.cashReceived], [t('reconciliation.refunds'), data.summary.cashRefunded], [t('reconciliation.net'), data.summary.netReceipts]].map(([label, amount]) => <div className="day-reconciliation-card" key={label}><span>{label}</span><strong>{money(amount, data.currency)}</strong></div>)}
      </div>
      <p className="day-reconciliation-help">{t('reconciliation.cashNote')}</p>
      <p className="day-reconciliation-help">{t('reconciliation.historical')}</p>
      <div className="day-reconciliation-stays"><StayList title={t('reconciliation.arrivals')} rows={data.arrivals}  /><StayList title={t('reconciliation.departures')} rows={data.departures}  /></div>
      <section className="day-reconciliation-section" aria-labelledby="reconciliation-funds-heading"><h2 id="reconciliation-funds-heading">{t('reconciliation.funds')}</h2><p className="day-reconciliation-help">{t('reconciliation.fundNote')}</p>
        <div className="day-reconciliation-fund-list">{data.funds.length ? data.funds.map(fund => <article className="day-reconciliation-fund" key={`${fund.fundId}:${fund.currency}`}><h3>{fund.fund} <small>{fund.currency}</small></h3><dl>{[['opening', t('reconciliation.opening')], ['income', t('reconciliation.income')], ['outflow', t('reconciliation.outflow')], ['closing', t('reconciliation.closing')]].map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{money(fund[key], fund.currency)}</dd></div>)}</dl></article>) : <p>{t('reconciliation.emptyFunds')}</p>}</div>
      </section>
      {!savedView && <div className="day-reconciliation-confirm"><button type="button" className="is-primary" disabled={!canConfirm || busy || loading || !preview} onClick={openConfirmation}><CheckCheck size={18} aria-hidden="true" />{t('reconciliation.confirm')}</button>{!canConfirm && <p className="day-reconciliation-help">{t('reconciliation.readOnly')}</p>}</div>}
    </>}
    {valid && <section className="day-reconciliation-section" aria-labelledby="reconciliation-history-heading"><h2 id="reconciliation-history-heading"><History size={20} aria-hidden="true" />{t('reconciliation.history')}</h2>
      {historyError && <div className="day-reconciliation-error" role="alert"><p>{t('reconciliation.historyError')} {historyError}</p><button type="button" disabled={busy} onClick={reload}>{t('reconciliation.retry')}</button></div>}
      {!history && !historyError && <p role="status">{t('reconciliation.loading')}</p>}
      {history?.confirmations.length === 0 && <p>{t('reconciliation.emptyHistory')}</p>}
      {history?.confirmations.map(record => <article className="day-reconciliation-record" key={record.id}><div><strong>{timestamp(record.createdAt, record.timezone)}</strong><p>{t('reconciliation.by')}: {record.actor}</p><p className="day-reconciliation-note-text">{record.note || t('reconciliation.noNote')}</p></div><button type="button" disabled={busy || dialog} aria-pressed={savedView?.id === record.id} onClick={() => { setSelectedRecord({ scope, day, record }); setNotice(''); }}>{t('reconciliation.view')}</button></article>)}
      {totalPages > 1 && <nav className="day-reconciliation-pagination" aria-label={t('reconciliation.history')}><button type="button" disabled={page === 1 || !history || busy} onClick={() => setPage(value => value - 1)}>{t('reconciliation.previous')}</button><span>{t('reconciliation.page')} {page} / {totalPages}</span><button type="button" disabled={page >= totalPages || !history || busy} onClick={() => setPage(value => value + 1)}>{t('reconciliation.next')}</button></nav>}
    </section>}
    {dialog && preview && <FormDialog title={t('reconciliation.confirmTitle')} busy={busy} error={dialogError} onClose={() => setDialog(false)}><form className="day-reconciliation-dialog" onSubmit={confirm} data-i18n-ignore>
      <p>{t('reconciliation.confirmHelp')}</p><dl><div><dt>{t('reconciliation.date')}</dt><dd>{formatDate(day)} · {preview.timezone}</dd></div><div><dt>{t('reconciliation.unresolved')}</dt><dd>{preview.arrivals.length + preview.departures.length}</dd></div></dl>
      <label>{t('reconciliation.note')}<textarea value={note} maxLength={1000} rows={4} disabled={busy} onChange={event => setNote(event.target.value)} aria-describedby="reconciliation-note-hint" /></label><p id="reconciliation-note-hint" className="day-reconciliation-help">{t('reconciliation.noteHint')}</p>
      <label className="day-reconciliation-ack"><input type="checkbox" required checked={acknowledged} disabled={busy} onChange={event => setAcknowledged(event.target.checked)} /><span>{t('reconciliation.acknowledge')}</span></label>
      <div className="day-reconciliation-dialog-actions"><button type="button" disabled={busy} onClick={() => setDialog(false)}>{t('reconciliation.cancel')}</button><button type="submit" className="is-primary" disabled={busy || !acknowledged}>{busy ? t('reconciliation.saving') : t('reconciliation.confirm')}</button></div>
    </form></FormDialog>}
    <NightAuditPanel />
  </div>;
}

function StayList({ title, rows }) {
  const { t } = useI18n();
  return <section className="day-reconciliation-section"><h2>{title} <span className="day-reconciliation-count">{rows.length}</span></h2>{rows.length ? <ul className="day-reconciliation-stay-list">{rows.map(row => <li key={row.id}><div><strong>{row.guest}</strong><small>{t('reconciliation.booking')}: {row.id}</small></div><dl><div><dt>{t('reconciliation.rooms')}</dt><dd>{row.rooms.join(', ') || '—'}</dd></div><div><dt>{t('reconciliation.checkIn')}</dt><dd>{formatDate(row.checkIn)}</dd></div><div><dt>{t('reconciliation.checkOut')}</dt><dd>{formatDate(row.checkOut)}</dd></div></dl></li>)}</ul> : <p>{t('reconciliation.none')}</p>}</section>;
}
