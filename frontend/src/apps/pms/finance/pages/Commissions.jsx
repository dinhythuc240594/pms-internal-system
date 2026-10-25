import { t as tUi, tr as labelUi, useI18n } from '../../../../shared/i18n/useI18n.js';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { money, today } from '../../data/model';
import { usePms } from '../../data/usePms';
import '../../components/DomainForms.css';

const statuses = { UNPAID: 'Chưa chi', PARTIAL: 'Chi một phần', PAID: 'Đã chi đủ', NEEDS_REVIEW: 'Cần đối soát' };

export default function Commissions() {
  const pms = usePms();
  return <CommissionPage key={`${pms.tenantId}:${pms.user?.id}:${pms.authGeneration}`} pms={pms} />;
}

function CommissionPage({ pms }) {
  useI18n();
  const { settings, workspaceRevision, funds = [], bookingSources = [], cashbookCategories = [] } = pms;
  const [filters, setFilters] = useState({ startDate: '', endDate: today(settings.timezone), currency: settings.currency, sourceId: '', status: '', page: 1, pageSize: 20 });
  const [result, setResult] = useState(null), [reload, setReload] = useState(0);
  const [form, setForm] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const current = useRef(pms), mounted = useRef(true), inFlight = useRef(false), opener = useRef(null);
  const canWrite = pms.access('cashbook.write').allowed;
  const filterKey = JSON.stringify(filters), requestKey = JSON.stringify([filterKey, workspaceRevision, reload]);
  const loaded = result?.key === requestKey, data = loaded ? result.data : null, loading = !loaded;
  const totalPages = Math.max(1, Math.ceil((data?.pagination?.totalItems || 0) / filters.pageSize));
  const currencies = [...new Set([settings.currency, 'VND', 'USD', ...funds.map(fund => fund.currency)])].filter(Boolean);
  const selected = form?.mode === 'pay' ? data?.items.find(item => item.id === form.record.id) : data?.candidates.find(candidate => candidate.bookingId === form?.record.bookingId);
  const activeFunds = funds.filter(fund => fund.active !== false && (fund.currency || settings.currency) === form?.record.currency);
  const expenseCategories = cashbookCategories.filter(category => category.active !== false && category.type === 'EXPENSE');
  const blocked = form?.mode === 'pay' && (selected?.needsReview || selected?.status === 'NEEDS_REVIEW' || selected?.status === 'PAID');

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => { current.current = pms; }, [pms]);
  useEffect(() => {
    let active = true;
    current.current.getCommissions(JSON.parse(filterKey)).then(data => {
      if (active) setResult({ key: requestKey, data, error: '' });
    }).catch(error => {
      if (active) setResult({ key: requestKey, data: null, error: error.message });
    });
    return () => { active = false; };
  }, [requestKey, filterKey]);

  function open(mode, record, event) {
    opener.current = event.currentTarget;
    setError(''); setNotice('');
    setForm({ mode, record, legacyPercent: '', confirmLegacyRate: false, amount: record.balance || '', fundId: funds.find(fund => fund.active !== false && (fund.currency || settings.currency) === record.currency)?.id || '', categoryId: '', note: '', intent: crypto.randomUUID() });
  }
  function close() {
    if (inFlight.current) return;
    setForm(null); setError(''); opener.current?.focus();
  }
  function change(name, value) {
    setForm(previous => ({ ...previous, [name]: value, intent: crypto.randomUUID() }));
  }
  function filter(name, value) {
    setFilters(previous => ({ ...previous, [name]: value, page: 1 }));
  }
  async function submit(event) {
    event.preventDefault();
    if (inFlight.current || !canWrite || loading || !selected || blocked) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      if (form.mode === 'settle') {
        await pms.settleCommission({ bookingId: form.record.bookingId, ...(form.record.missingRate ? { legacyPercent: form.legacyPercent, confirmLegacyRate: form.confirmLegacyRate } : {}) });
      } else {
        await pms.payCommission(form.record.id, { amount: form.amount, fundId: form.fundId, note: form.note, ...(form.categoryId ? { categoryId: form.categoryId } : {}) }, form.intent);
      }
      if (mounted.current) {
        setForm(null); setNotice(form.mode === 'settle' ? 'Đã chốt hoa hồng theo cơ sở tiền phòng.' : 'Đã ghi phiếu chi hoa hồng.');
        setReload(value => value + 1); opener.current?.focus();
      }
    } catch (error) { if (mounted.current) setError(error.message); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  function cashbookLink(payment, currency) {
    const fund = funds.find(fund => fund.id === payment.fundId);
    return `/id/cashflow/${fund?.type?.toUpperCase() === 'BANK' ? 'bank' : 'cash'}?${new URLSearchParams({ documentId: payment.cashDocumentId, currency })}`;
  }

  return <div className="pms-domain-page">
    <header className="domain-toolbar"><div><h1>Hoa hồng nguồn đặt phòng</h1><p>Chốt hoa hồng khi khách đã trả phòng, theo dõi khoản còn phải chi và phiếu chi.</p></div><button type="button" disabled={loading || busy} onClick={() => setReload(value => value + 1)}>{tUi("common.reload")}</button></header>
    <p>Cơ sở hoa hồng là tiền phòng sau giảm giá tiền phòng trong báo giá, không gồm dịch vụ và thuế. Chiết khấu hóa đơn và các điều chỉnh khác cần đối soát trước khi chi. Tỷ lệ và cơ sở tiền phòng được giữ nguyên sau khi chốt.</p>
    {notice && <p role="status">{notice}</p>}
    {loaded && result.error && <p className="domain-error" role="alert">{result.error} <button type="button" onClick={() => setReload(value => value + 1)}>{tUi("common.retry")}</button></p>}
    <section className="domain-stats" aria-label="Tổng hoa hồng" aria-busy={loading}>{[['accrued', 'Đã chốt'], ['paid', 'Đã chi'], ['balance', 'Còn phải chi']].map(([key, label]) => <div key={key}>{labelUi(label)}<strong>{data?.summary ? money(data.summary[key], data.summary.currency) : '—'}</strong></div>)}</section>
    <section className="domain-panel" aria-label="Bộ lọc hoa hồng"><fieldset disabled={Boolean(form)} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><div className="domain-fields">
      <label>{tUi("common.fromDate")}<input type="date" value={filters.startDate} onChange={event => filter('startDate', event.target.value)} /></label>
      <label>Đến ngày<input type="date" min={filters.startDate || undefined} value={filters.endDate} onChange={event => filter('endDate', event.target.value)} /></label>
      <label>{tUi("common.currency")}<select value={filters.currency} onChange={event => filter('currency', event.target.value)}>{currencies.map(currency => <option key={currency}>{currency}</option>)}</select></label>
      <label>{tUi('settings.bookingSources')}<select value={filters.sourceId} onChange={event => filter('sourceId', event.target.value)}><option value="">Tất cả nguồn</option>{bookingSources.map(source => <option key={source.id} value={source.id}>{source.name}{source.active === false ? ' (ngừng dùng)' : ''}</option>)}</select></label>
      <label>{tUi("common.status")}<select value={filters.status} onChange={event => filter('status', event.target.value)}><option value="">{tUi("common.allStatuses")}</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{labelUi(label)}</option>)}</select></label>
    </div></fieldset>{form && <p>Đóng biểu mẫu để đổi bộ lọc.</p>}</section>

    {form && <section className="domain-panel" aria-labelledby="commission-form-title"><form onSubmit={submit} aria-busy={busy}>
      <h2 id="commission-form-title">{form.mode === 'settle' ? 'Chốt hoa hồng' : 'Chi hoa hồng'} · {form.record.guestName}</h2>
      <p>{form.record.bookingId} · {form.record.sourceName}</p>
      {form.mode === 'settle' && selected?.needsReview && <p role="alert" className="domain-error">Lưu trú có chiết khấu hóa đơn chưa phân bổ hoặc điều chỉnh sau trả phòng. Chốt lưu cơ sở báo giá để đối soát; hệ thống chặn chi hoa hồng.</p>}
      {error && <p role="alert" className="domain-error">{error}</p>}
      {loading ? <p role="status">Đang cập nhật số liệu…</p> : !selected ? <p role="alert" className="domain-error">Khoản này không còn trong danh sách hiện tại. Đóng biểu mẫu để kiểm tra lại.</p> : blocked && <p role="alert" className="domain-error">{selected.needsReview || selected.status === 'NEEDS_REVIEW' ? 'Lưu trú có chiết khấu hóa đơn chưa phân bổ hoặc điều chỉnh sau trả phòng. Cần đối soát; hệ thống chặn chi thêm.' : 'Khoản hoa hồng đã được chi đủ.'}</p>}
      <fieldset disabled={busy || !canWrite} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {form.mode === 'settle' ? <>
          {form.record.missingRate ? <>
            <p>Đặt phòng cũ chưa lưu tỷ lệ hoa hồng. Nhập tỷ lệ đã xác nhận với nguồn đặt phòng trước khi chốt.</p>
            <div className="domain-fields"><label>Tỷ lệ hoa hồng (%)<input autoFocus type="number" required min="0" max="100" step="0.0001" inputMode="decimal" value={form.legacyPercent} onChange={event => change('legacyPercent', event.target.value)} /></label></div>
            <label style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}><input type="checkbox" required checked={form.confirmLegacyRate} onChange={event => change('confirmLegacyRate', event.target.checked)} style={{ width: 'auto', minHeight: 0 }} />Tôi xác nhận tỷ lệ hoa hồng cho đặt phòng cũ này.</label>
          </> : <p>Tỷ lệ đã lưu khi đặt phòng: <strong>{form.record.percent}%</strong>. Hệ thống tính và lưu tiền phòng sau giảm giá tại thời điểm chốt.</p>}
        </> : <>
          <p>Cơ sở đã chốt: <strong>{money(form.record.roomNet, form.record.currency)}</strong> × {form.record.percent}%. Hoa hồng: <strong>{money(form.record.amount, form.record.currency)}</strong>. Còn phải chi: <strong>{money(selected?.balance ?? form.record.balance, form.record.currency)}</strong>.</p>
          <div className="domain-fields">
            <label>Số tiền ({form.record.currency})<input autoFocus type="number" required min="0.0001" max={selected?.balance ?? form.record.balance} step="0.0001" inputMode="decimal" value={form.amount} onChange={event => change('amount', event.target.value)} /></label>
            <label>Quỹ chi<select required value={form.fundId} onChange={event => change('fundId', event.target.value)}><option value="">Chọn quỹ</option>{activeFunds.map(fund => <option key={fund.id} value={fund.id}>{fund.name}</option>)}</select></label>
            <label>Danh mục chi<select value={form.categoryId} onChange={event => change('categoryId', event.target.value)}><option value="">Chưa phân loại</option>{expenseCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          </div>
          {!activeFunds.length && <p role="alert" className="domain-error">Chưa có quỹ đang hoạt động bằng {form.record.currency} để chi hoa hồng.</p>}
          <label>{tUi("common.notes")}<textarea maxLength={500} value={form.note} onChange={event => change('note', event.target.value)} /></label>
        </>}
      </fieldset>
      <div className="domain-fields" style={{ marginTop: 16 }}><button type="button" disabled={busy} onClick={close}>{tUi("common.close")}</button><button className="primary" type="submit" autoFocus={form.mode === 'settle' && !form.record.missingRate} disabled={busy || !canWrite || loading || !selected || blocked || (form.mode === 'pay' && !activeFunds.some(fund => fund.id === form.fundId))}>{busy ? 'Đang ghi nhận…' : form.mode === 'settle' ? 'Chốt hoa hồng' : 'Ghi phiếu chi'}</button></div>
    </form></section>}

    <section className="domain-panel" tabIndex={0} aria-labelledby="commissions-title" aria-busy={loading}><h2 id="commissions-title">Hoa hồng đã chốt</h2><table>
      <thead><tr>{['Đặt phòng / khách', 'Nguồn', 'Tỷ lệ', 'Tiền phòng sau giảm', 'Hoa hồng', 'Đã chi', 'Còn phải chi', 'Trạng thái', 'Chi tiết'].map(title => <th key={title} scope="col">{labelUi(title)}</th>)}</tr></thead>
      <tbody>{data?.items.map(record => <tr key={record.id}>
        <td>{record.guestName}<br />{record.bookingId}</td><td>{record.sourceName}</td><td>{record.percent}%</td><td>{money(record.roomNet, record.currency)}</td><td>{money(record.amount, record.currency)}</td><td>{money(record.paid, record.currency)}</td><td>{money(record.balance, record.currency)}</td><td>{record.needsReview ? statuses.NEEDS_REVIEW : statuses[record.status] || record.status}</td>
        <td>{canWrite && <button type="button" disabled={busy || Boolean(form) || record.needsReview || record.status === 'NEEDS_REVIEW' || record.status === 'PAID'} onClick={event => open('pay', record, event)}>Chi hoa hồng</button>}{record.needsReview && <p>Cần đối soát chiết khấu hoặc điều chỉnh lưu trú.</p>}<details><summary>Cơ sở và lịch sử chi</summary><p>Cơ sở tiền phòng: {money(record.roomNet, record.currency)} · {record.percent}%.</p><p>Cơ sở tiền quy đổi đã chốt: {money(record.baseRoomNet, record.baseCurrency)}. Hoa hồng quy đổi: {money(record.baseAmount, record.baseCurrency)}.</p>{record.payments.length ? <ul>{record.payments.map(payment => <li key={payment.id}>{payment.date} · {money(payment.amount, record.currency)} · <Link to={cashbookLink(payment, record.currency)}>Phiếu {payment.cashDocumentId}</Link>{payment.reversed ? ' · Đã đảo phiếu' : ''}</li>)}</ul> : <p>Chưa có khoản chi.</p>}<p><Link to="/id/cashflow/cash">Mở sổ quỹ để đối soát hoặc đảo phiếu chi</Link></p></details></td>
      </tr>)}{!data?.items.length && <tr><td colSpan={9}>{loading ? 'Đang tải hoa hồng…' : data ? 'Chưa có hoa hồng đã chốt theo bộ lọc.' : 'Chưa tải được dữ liệu.'}</td></tr>}</tbody>
    </table></section>

    <section className="domain-panel" tabIndex={0} aria-labelledby="commission-candidates-title" aria-busy={loading}><h2 id="commission-candidates-title">Đặt phòng đã trả phòng, chưa chốt</h2><table>
      <thead><tr>{['Đặt phòng / khách', 'Ngày trả phòng', 'Nguồn', 'Tiền tệ', 'Tỷ lệ đã lưu', 'Thao tác'].map(title => <th key={title} scope="col">{labelUi(title)}</th>)}</tr></thead>
      <tbody>{data?.candidates.map(record => <tr key={record.bookingId}><td>{record.guestName}<br />{record.bookingId}</td><td>{record.checkOut}</td><td>{record.sourceName}</td><td>{record.currency}</td><td>{record.missingRate || record.percent == null ? 'Chưa có tỷ lệ · cần xác nhận' : `${record.percent}%`}</td><td>{canWrite ? <button type="button" disabled={busy || Boolean(form)} onClick={event => open('settle', record, event)}>Chốt hoa hồng</button> : 'Chỉ xem'}</td></tr>)}{!data?.candidates.length && <tr><td colSpan={6}>{loading ? 'Đang tải đặt phòng…' : data ? 'Không có đặt phòng chưa chốt theo bộ lọc.' : 'Chưa tải được dữ liệu.'}</td></tr>}</tbody>
    </table></section>
    <nav className="domain-fields" aria-label="Phân trang hoa hồng" style={{ marginTop: 16 }}>
      <span>{data?.pagination?.totalItems ?? ((data?.items.length || 0) + (data?.candidates.length || 0))} đặt phòng · Trang {filters.page}/{totalPages}. Tổng hoa hồng gồm toàn bộ kỳ đang lọc.</span>
      <button type="button" disabled={loading || busy || Boolean(form) || filters.page <= 1} onClick={() => setFilters(previous => ({ ...previous, page: previous.page - 1 }))}>Trang trước</button>
      <button type="button" disabled={loading || busy || Boolean(form) || filters.page >= totalPages} onClick={() => setFilters(previous => ({ ...previous, page: previous.page + 1 }))}>Trang sau</button>
    </nav>
  </div>;
}
