import { decimalInput } from '../../../../shared/lib/number.js';
import { formatDate, formatDateTime } from '../../../../shared/lib/date.js';
import DateInput from '../../../../shared/components/DateInput.jsx';
import { t as tUi, tr as labelUi, useI18n } from '../../../../shared/i18n/useI18n.js';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react';
import { money as formatMoney, today } from '../../data/model';
import { usePms } from '../../data/usePms';
import { HOTEL_CURRENCY_CODES, isHotelCurrency } from '../../../../shared/lib/currencies.js';
import './Cashflow.css';

const TYPES = { receipt: 'Thu tiền', expense: 'Chi tiền', withdrawal: 'Rút tiền', transfer: 'Chuyển quỹ', opening: 'Số dư đầu kỳ' };
const ENTRY_TYPES = { payment: 'Thu đặt phòng', refund: 'Hoàn đặt phòng', pos_payment: 'Thu POS', pos_refund: 'Hoàn POS', receipt: 'Phiếu thu', expense: 'Phiếu chi', withdrawal: 'Rút tiền', transfer_in: 'Nhận chuyển quỹ', transfer_out: 'Chuyển quỹ', opening: 'Đầu kỳ', reversal: 'Đảo chứng từ' };
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12 };
const button = { border: '1px solid #d1d5db', borderRadius: 7, background: '#fff', color: '#374151', padding: '9px 12px', minHeight: 40, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' };
const primary = { ...button, background: '#0c7cd5', borderColor: '#0c7cd5', color: '#fff', fontWeight: 600 };
const control = { width: '100%', minHeight: 42, border: '1px solid #9ca3af', borderRadius: 7, padding: '8px 10px', background: '#fff', color: '#111827', fontSize: 14, boxSizing: 'border-box' };
const field = { display: 'grid', gap: 7, minWidth: 135, fontSize: 13, color: '#4b5563' };
const cell = { padding: '14px 16px', fontSize: 14, color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' };
const errorBox = { color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12 };

export default function Cashflow() {
  useI18n();
  const { tab } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const documentId = searchParams.get('documentId') || '';
  const linkedCurrency = searchParams.get('currency');
  const navigate = useNavigate();
  const pms = usePms();
  const { funds, settings, tenantId, user, cashDocuments, ledger, access, workspaceRevision, cashbookCategories = [] } = pms;
  const users = pms.cashbookActors || pms.users;
  const activeTab = tab === 'bank' ? 'bank' : 'cash';
  const [filters, setFilters] = useState({ startDate: '', endDate: documentId ? '' : today(settings.timezone), fundId: '', actorId: '', categoryId: '', currency: settings.currency, page: 1 });
  const [book, setBook] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [reload, setReload] = useState(0), [form, setForm] = useState(null), [busy, setBusy] = useState(false), [formError, setFormError] = useState(''), [notice, setNotice] = useState('');
  const dialog = useRef(null), inFlight = useRef(false), current = useRef(null), generation = useRef(0);
  current.current = { pms, tenantId, userId: user?.id };
  const scope = `${tenantId || ''}:${user?.id || ''}`;
  const visibleFunds = funds.filter(fund => activeTab === 'bank' ? fund.type?.toUpperCase() === 'BANK' : fund.type?.toUpperCase() !== 'BANK');
  const activeFunds = visibleFunds.filter(fund => fund.active !== false && (fund.currency || settings.currency) === filters.currency);
  const canWrite = access('cashbook.write').allowed, canReverse = access('cashbook.reverse').allowed;
  const sameScope = token => token === `${current.current.tenantId || ''}:${current.current.userId || ''}`;
  const filterKey = JSON.stringify({ ...filters, documentId, fundType: activeTab, pageSize: 20 });

  useEffect(() => {
    setFilters({ startDate: '', endDate: documentId ? '' : today(settings.timezone), fundId: '', actorId: '', categoryId: '', currency: isHotelCurrency(linkedCurrency) ? linkedCurrency : settings.currency, page: 1 });
    setForm(null); setFormError(''); setNotice(''); setBook(null); setBusy(false);
  }, [scope, activeTab, documentId, linkedCurrency]);
  useEffect(() => {
    const version = ++generation.current;
    setLoading(true); setError(''); setBook(null);
    current.current.pms.getCashbook(JSON.parse(filterKey)).then(result => {
      if (version === generation.current && sameScope(scope)) setBook(result);
    }).catch(err => {
      if (version === generation.current && sameScope(scope)) setError(err.message);
    }).finally(() => {
      if (version === generation.current && sameScope(scope)) setLoading(false);
    });
    return () => { ++generation.current; };
  }, [scope, filterKey, reload, workspaceRevision]);
  useEffect(() => {
    if (form && !dialog.current.open) dialog.current.showModal();
    if (!form && dialog.current.open) dialog.current.close();
  }, [Boolean(form)]);

  function filter(name, value) { setFilters(previous => ({ ...previous, [name]: value, ...(name === 'currency' ? { fundId: '' } : {}), page: 1 })); }
  function openCreate(type) {
    setFormError(''); setNotice('');
    setForm({ mode: 'create', type, amount: '', fundId: activeFunds[0]?.id || '', toFundId: '', categoryId: '', description: '', date: today(settings.timezone) });
  }
  function closeForm() { if (!inFlight.current) setForm(null); }
  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setFormError('');
    const token = scope;
    try {
      if (form.mode === 'reverse') await pms.reverseCashDocument(form.document.id, { reason: form.reason });
      else await pms.createCashDocument({ type: form.type, amount: decimalInput(form.amount, { min: form.type === 'opening' ? '0' : '0.0001' }), fundId: form.fundId, description: form.description, currency: filters.currency,
        ...(form.type === 'transfer' ? { toFundId: form.toFundId } : {}), ...(form.type === 'opening' ? { date: form.date } : {}), ...(form.categoryId ? { categoryId: form.categoryId } : {}) });
      if (sameScope(token)) { setForm(null); setNotice('Đã ghi sổ thành công.'); setReload(value => value + 1); }
    } catch (err) { if (sameScope(token)) setFormError(err.message); }
    finally { inFlight.current = false; if (sameScope(token)) setBusy(false); }
  }

  const money = amount => formatMoney(amount, book?.summary.currency || filters.currency);
  const summary = book?.summary, transactions = book?.ledger || [];
  const totalPages = Math.max(1, Math.ceil((book?.pagination.totalItems || 0) / 20));
  const documents = [...cashDocuments, ...(book?.cashDocuments || [])];
  const reversed = new Set(documents.map(document => document.reversalOfId).filter(Boolean));
  const documentById = new Map(documents.map(document => [document.id, document]));
  const currencyOptions = [...new Set([settings.currency, ...HOTEL_CURRENCY_CODES, ...ledger.map(row => row.currency)])].filter(Boolean);

  return (
    <div className="pms-original" style={{ padding: 24, background: '#f4f5f7', minHeight: '100%', fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, color: '#111827', margin: '0 0 12px' }}>{labelUi("Quản lý Thu Chi")}</h1>
          <div style={{ display: 'flex', gap: 4, padding: 4, background: '#e5e7eb', borderRadius: 8, width: 'fit-content' }}>
            {['cash', 'bank'].map(type => <button type="button" key={type} aria-pressed={activeTab === type} disabled={busy} onClick={() => navigate('/id/cashflow/' + type)} style={{ ...button, border: 0, background: activeTab === type ? '#fff' : 'transparent', fontWeight: activeTab === type ? 600 : 400 }}>{type === 'bank' ? tUi("nav.bank") : tUi("nav.cash")}</button>)}
          </div>
        </div>
        {canWrite && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['receipt', Plus], ['expense', Minus], ['withdrawal', ArrowUpRight], ['transfer', ArrowLeftRight], ['opening', Wallet]].map(([type, Icon]) => <button key={type} type="button" style={type === 'receipt' ? primary : button} disabled={busy || !activeFunds.length} onClick={() => openCreate(type)}><Icon size={16} aria-hidden="true" />{TYPES[type]}</button>)}
        </div>}
      </div>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>{labelUi("Số dư đầu kỳ + tiền vào − tiền ra = số dư cuối kỳ. Chuyển quỹ và hoàn tiền được ghi riêng để đối soát.")}</p>
      {notice && <p role="status" style={{ color: '#047857' }}>{notice}</p>}
      {error && <div role="alert" style={{ ...errorBox, marginBottom: 20 }}>{error} <button type="button" style={button} onClick={() => setReload(value => value + 1)}>{tUi("common.reload")}</button></div>}
      <div aria-busy={loading} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[['opening', 'Số dư đầu kỳ', Wallet, '#4b5563'], ['income', 'Tiền vào trong kỳ', TrendingUp, '#059669'], ['outflow', 'Tiền ra trong kỳ', TrendingDown, '#dc2626'], ['closing', 'Số dư cuối kỳ', Wallet, '#0c7cd5']].map(([key, label, Icon, color]) => <div key={key} style={{ ...card, padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}><Icon size={24} color={color} aria-hidden="true" /><div><div style={{ color: '#6b7280', fontSize: 13, marginBottom: 7 }}>{labelUi(label)}</div><strong style={{ fontSize: 22, color }}>{summary ? money(summary[key]) : '—'}</strong></div></div>)}
      </div>
      <div style={{ ...card, padding: 16, display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <label style={field}>{tUi("common.fromDate")}<DateInput style={control} value={filters.startDate} onChange={value => filter('startDate', value)} /></label>
        <label style={field}>{labelUi("Đến ngày")}<DateInput style={control} min={filters.startDate || undefined} value={filters.endDate} onChange={value => filter('endDate', value)} /></label>
        <label style={{ ...field, flex: 1 }}>{labelUi("Quỹ")}<select style={control} value={filters.fundId} onChange={event => filter('fundId', event.target.value)}><option value="">Tất cả quỹ {activeTab === 'bank' ? labelUi("tiền gửi") : labelUi("tiền mặt")}</option>{visibleFunds.map(fund => <option key={fund.id} value={fund.id}>{fund.name}{fund.active === false ? " " + labelUi("(ngừng dùng)") : ''}</option>)}</select></label>
        <label style={field}>{labelUi("Người ghi sổ")}<select style={control} value={filters.actorId} onChange={event => filter('actorId', event.target.value)}><option value="">{tUi("common.allStaff")}</option>{users.map(actor => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></label>
        <label style={field}>{labelUi("Danh mục")}<select style={control} value={filters.categoryId} onChange={event => filter('categoryId', event.target.value)}><option value="">{tUi("common.allCategories")}</option><option value="uncategorized">{labelUi("Chưa phân loại")}</option>{cashbookCategories.map(category => <option key={category.id} value={category.id}>{category.name}{category.active === false ? " " + labelUi("(ngừng dùng)") : ''}</option>)}</select></label>
        <label style={field}>{tUi("common.currency")}<select style={control} value={filters.currency} onChange={event => filter('currency', event.target.value)}>{currencyOptions.map(currency => <option key={currency}>{currency}</option>)}</select></label>
      </div>
      {filters.actorId && <p style={{ color: '#6b7280', fontSize: 13 }}>{labelUi("Tổng kỳ đang lọc theo người ghi sổ. Số dư từng quỹ bên dưới gồm tất cả người ghi sổ.")}</p>}
      {filters.categoryId && <p style={{ color: '#6b7280', fontSize: 13 }}>{labelUi("Tổng kỳ đang lọc theo danh mục. Số dư quỹ hiện tại bên dưới gồm tất cả danh mục.")}</p>}
      {documentId && <p style={{ color: '#6b7280', fontSize: 13 }}>Đang xem phiếu {documentId} và các phiếu đảo. Tổng kỳ chỉ gồm các giao dịch này. <button type="button" style={button} onClick={() => setSearchParams({})}>{labelUi("Xem toàn bộ sổ quỹ")}</button></p>}
      <div style={{ ...card, overflow: 'hidden' }} aria-busy={loading}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 870, textAlign: 'left' }}>
            <thead><tr style={{ background: '#f9fafb' }}>{['Ngày ghi sổ', 'Nội dung', 'Quỹ', 'Nhân viên', 'Tiền vào', 'Tiền ra', 'Thao tác'].map((title, index) => <th key={title} scope="col" style={{ ...cell, fontSize: 13, fontWeight: 600, textAlign: index === 4 || index === 5 ? 'right' : 'left' }}>{labelUi(title)}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ ...cell, padding: 30, textAlign: 'center' }} role="status">{labelUi("Đang tải sổ quỹ…")}</td></tr> : !transactions.length ? <tr><td colSpan={7} style={{ ...cell, padding: 30, textAlign: 'center', color: '#6b7280' }}>{labelUi("Không có giao dịch trong kỳ đã chọn.")}</td></tr> : transactions.map(row => {
                const amount = Number(row.amount), document = documentById.get(row.cashDocumentId);
                const canUndo = canReverse && document && document.type !== 'reversal' && Number(document.amount) > 0 && !reversed.has(document.id);
                return <tr key={row.id}>
                  <td style={cell}>{formatDate(row.date)}<div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Ghi nhận {formatDateTime(row.createdAt, settings.timezone)}</div></td>
                  <td style={cell}><div style={{ fontWeight: 500 }}>{row.description}</div><div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{ENTRY_TYPES[row.type] || row.type} · {row.id}</div><div style={{ fontSize: 12, color: '#6b7280' }}>{document?.categoryName || labelUi("Chưa phân loại")}</div>{row.reversalOfId && <div style={{ fontSize: 12, color: '#6b7280' }}>Đảo giao dịch {row.reversalOfId}</div>}</td>
                  <td style={cell}>{funds.find(fund => fund.id === row.fundId)?.name || row.fundId}</td>
                  <td style={cell}>{users.find(actor => actor.id === row.userId)?.name || '—'}</td>
                  <td style={{ ...cell, textAlign: 'right', color: '#059669', fontWeight: 600 }}>{amount > 0 ? money(row.amount) : '—'}</td>
                  <td style={{ ...cell, textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>{amount < 0 ? money(-amount) : '—'}</td>
                  <td style={cell}>{canUndo ? <button type="button" style={button} disabled={busy} onClick={() => { setFormError(''); setForm({ mode: 'reverse', document, reason: '' }); }}><RotateCcw size={14} aria-hidden="true" />{labelUi("Đảo phiếu")}</button> : document && reversed.has(document.id) ? <span style={{ fontSize: 12, color: '#6b7280' }}>{labelUi("Đã đảo")}</span> : '—'}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#f9fafb' }}>
          <span style={{ color: '#6b7280', fontSize: 13 }}>{book?.pagination.totalItems || 0} giao dịch · Trang {filters.page}/{totalPages}</span>
          <div style={{ display: 'flex', gap: 8 }}><button type="button" style={button} disabled={loading || filters.page <= 1} onClick={() => setFilters(previous => ({ ...previous, page: previous.page - 1 }))}><ChevronLeft size={16} aria-hidden="true" />{labelUi("Trước")}</button><button type="button" style={button} disabled={loading || filters.page >= totalPages} onClick={() => setFilters(previous => ({ ...previous, page: previous.page + 1 }))}>Sau<ChevronRight size={16} aria-hidden="true" /></button></div>
        </div>
      </div>
      {!!book?.fundBalances.length && <div style={{ ...card, marginTop: 20, padding: 20 }}><h2 style={{ fontSize: 16, margin: '0 0 14px', color: '#111827' }}>{labelUi("Số dư quỹ hiện tại")}</h2><div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>{book.fundBalances.map(fund => <div key={fund.fundId}><div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>{fund.fund}</div><strong style={{ color: '#111827' }}>{money(fund.balance)}</strong></div>)}</div></div>}
      <dialog ref={dialog} className="cashflow-drawer" aria-labelledby="cash-document-title" onCancel={event => { if (inFlight.current) event.preventDefault(); else setForm(null); }} onClose={() => { if (!inFlight.current) setForm(null); }}>
        {form && <form onSubmit={submit} aria-busy={busy}>
          <div className="cashflow-drawer-heading">
            <span className="cashflow-drawer-icon"><Wallet size={22} aria-hidden="true" /></span>
            <div className="cashflow-drawer-title"><p>{labelUi("Quản lý Thu Chi")}</p><h2 id="cash-document-title">{form.mode === 'reverse' ? labelUi("Đảo chứng từ") : TYPES[form.type]}</h2></div>
            <button type="button" className="cashflow-drawer-close" aria-label={tUi('common.closeWindow')} disabled={busy} onClick={closeForm}><X size={20} aria-hidden="true" /></button>
          </div>
          <div className="cashflow-drawer-body">
            {formError && <p role="alert" style={errorBox}>{formError}</p>}
            <fieldset disabled={busy}>
              {form.mode === 'reverse' ? <>
                <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>Phiếu {form.document.id} · {form.document.description} · {formatMoney(form.document.amount, form.document.currency)}. Hệ thống sẽ ghi giao dịch ngược vào quỹ gốc.</p>
                <label>{labelUi("Lý do đảo phiếu")}<textarea autoFocus required maxLength={500} value={form.reason} onChange={event => setForm(previous => ({ ...previous, reason: event.target.value }))} /></label>
              </> : <>
                <label>{labelUi("Quỹ")}{" "}{form.type === 'transfer' ? labelUi("chuyển") : ''}<select autoFocus required value={form.fundId} onChange={event => setForm(previous => ({ ...previous, fundId: event.target.value, toFundId: previous.toFundId === event.target.value ? '' : previous.toFundId }))}><option value="">{labelUi("Chọn quỹ")}</option>{activeFunds.map(fund => <option key={fund.id} value={fund.id}>{fund.name}</option>)}</select></label>
                {form.type === 'transfer' && <label>{labelUi("Quỹ nhận")}<select required value={form.toFundId} onChange={event => setForm(previous => ({ ...previous, toFundId: event.target.value }))}><option value="">{labelUi("Chọn quỹ nhận")}</option>{funds.filter(fund => fund.active !== false && fund.id !== form.fundId && (fund.currency || settings.currency) === filters.currency).map(fund => <option key={fund.id} value={fund.id}>{fund.name}</option>)}</select></label>}
                {['receipt', 'expense'].includes(form.type) && <label>{labelUi("Danh mục")}<select value={form.categoryId} onChange={event => setForm(previous => ({ ...previous, categoryId: event.target.value }))}><option value="">{labelUi("Chưa phân loại")}</option>{cashbookCategories.filter(category => category.active !== false && category.type === (form.type === 'receipt' ? 'INCOME' : 'EXPENSE')).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
                <label className="cashflow-amount">{labelUi("Số tiền")}<span className="cashflow-amount-control"><input aria-label={`Số tiền (${filters.currency})`} type="text" inputMode="decimal" pattern="[0-9]{1,15}([.][0-9]{1,4})?" maxLength={20} placeholder="0" required min={form.type === 'opening' ? '0' : '0.0001'} step="0.0001" max="999999999999999.9999" value={form.amount} onChange={event => setForm(previous => ({ ...previous, amount: event.target.value }))} /><span aria-hidden="true">{filters.currency}</span></span></label>
                {form.type === 'opening' && <><label>{labelUi("Ngày đầu kỳ")}<DateInput required max={today(settings.timezone)} value={form.date} onChange={value => setForm(previous => ({ ...previous, date: value }))} /></label><p className="cashflow-drawer-hint">{labelUi("Mỗi quỹ chỉ nhập đầu kỳ một lần. Ngày này phải trước các giao dịch đã có; thời điểm tạo phiếu vẫn được lưu.")}</p></>}
                <label>{labelUi("Diễn giải")}<textarea required maxLength={500} value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} /></label>
              </>}
            </fieldset>
          </div>
          <div className="cashflow-drawer-footer"><button type="button" disabled={busy} onClick={closeForm}>{tUi("common.close")}</button><button type="submit" className="cashflow-drawer-submit" disabled={busy}><Check size={17} aria-hidden="true" />{busy ? labelUi("Đang ghi sổ…") : form.mode === 'reverse' ? labelUi("Ghi phiếu đảo") : labelUi("Ghi sổ")}</button></div>
        </form>}
      </dialog>
    </div>
  );
}
