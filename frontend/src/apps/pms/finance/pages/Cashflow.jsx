import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftRight, ArrowUpRight, ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { money as formatMoney, today } from '../../data/model';
import { usePms } from '../../data/usePms';

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
  const { tab } = useParams();
  const navigate = useNavigate();
  const pms = usePms();
  const { funds, settings, tenantId, user, cashDocuments, ledger, access } = pms;
  const users = pms.cashbookActors || pms.users;
  const activeTab = tab === 'bank' ? 'bank' : 'cash';
  const [filters, setFilters] = useState({ startDate: '', endDate: today(settings.timezone), fundId: '', actorId: '', currency: settings.currency, page: 1 });
  const [book, setBook] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [reload, setReload] = useState(0), [form, setForm] = useState(null), [busy, setBusy] = useState(false), [formError, setFormError] = useState(''), [notice, setNotice] = useState('');
  const dialog = useRef(null), inFlight = useRef(false), current = useRef(null), generation = useRef(0);
  current.current = { pms, tenantId, userId: user?.id };
  const scope = `${tenantId || ''}:${user?.id || ''}`;
  const visibleFunds = funds.filter(fund => activeTab === 'bank' ? fund.type?.toUpperCase() === 'BANK' : fund.type?.toUpperCase() !== 'BANK');
  const activeFunds = visibleFunds.filter(fund => fund.active !== false && (fund.currency || settings.currency) === filters.currency);
  const canWrite = access('cashbook.write').allowed, canReverse = access('cashbook.reverse').allowed;
  const sameScope = token => token === `${current.current.tenantId || ''}:${current.current.userId || ''}`;
  const filterKey = JSON.stringify({ ...filters, fundType: activeTab, pageSize: 20 });

  useEffect(() => {
    setFilters({ startDate: '', endDate: today(settings.timezone), fundId: '', actorId: '', currency: settings.currency, page: 1 });
    setForm(null); setFormError(''); setNotice(''); setBook(null); setBusy(false);
  }, [scope, activeTab]);
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
  }, [scope, filterKey, reload]);
  useEffect(() => {
    if (form && !dialog.current.open) dialog.current.showModal();
    if (!form && dialog.current.open) dialog.current.close();
  }, [Boolean(form)]);

  function filter(name, value) { setFilters(previous => ({ ...previous, [name]: value, ...(name === 'currency' ? { fundId: '' } : {}), page: 1 })); }
  function openCreate(type) {
    setFormError(''); setNotice('');
    setForm({ mode: 'create', type, amount: '', fundId: activeFunds[0]?.id || '', toFundId: '', description: '', date: today(settings.timezone) });
  }
  function closeForm() { if (!inFlight.current) setForm(null); }
  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setFormError('');
    const token = scope;
    try {
      if (form.mode === 'reverse') await pms.reverseCashDocument(form.document.id, { reason: form.reason });
      else await pms.createCashDocument({ type: form.type, amount: form.amount, fundId: form.fundId, description: form.description, currency: filters.currency,
        ...(form.type === 'transfer' ? { toFundId: form.toFundId } : {}), ...(form.type === 'opening' ? { date: form.date } : {}) });
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
  const currencyOptions = [...new Set([settings.currency, 'VND', 'USD', ...ledger.map(row => row.currency)])].filter(Boolean);

  return (
    <div className="pms-original" style={{ padding: 24, background: '#f4f5f7', minHeight: '100%', fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, color: '#111827', margin: '0 0 12px' }}>Quản lý Thu Chi</h1>
          <div style={{ display: 'flex', gap: 4, padding: 4, background: '#e5e7eb', borderRadius: 8, width: 'fit-content' }}>
            {['cash', 'bank'].map(type => <button type="button" key={type} aria-pressed={activeTab === type} disabled={busy} onClick={() => navigate('/id/cashflow/' + type)} style={{ ...button, border: 0, background: activeTab === type ? '#fff' : 'transparent', fontWeight: activeTab === type ? 600 : 400 }}>{type === 'bank' ? 'Quỹ tiền gửi' : 'Quỹ tiền mặt'}</button>)}
          </div>
        </div>
        {canWrite && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['receipt', Plus], ['expense', Minus], ['withdrawal', ArrowUpRight], ['transfer', ArrowLeftRight], ['opening', Wallet]].map(([type, Icon]) => <button key={type} type="button" style={type === 'receipt' ? primary : button} disabled={busy || !activeFunds.length} onClick={() => openCreate(type)}><Icon size={16} aria-hidden="true" />{TYPES[type]}</button>)}
        </div>}
      </div>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>Số dư đầu kỳ + tiền vào − tiền ra = số dư cuối kỳ. Chuyển quỹ và hoàn tiền được ghi riêng để đối soát.</p>
      {notice && <p role="status" style={{ color: '#047857' }}>{notice}</p>}
      {error && <div role="alert" style={{ ...errorBox, marginBottom: 20 }}>{error} <button type="button" style={button} onClick={() => setReload(value => value + 1)}>Tải lại</button></div>}
      <div aria-busy={loading} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[['opening', 'Số dư đầu kỳ', Wallet, '#4b5563'], ['income', 'Tiền vào trong kỳ', TrendingUp, '#059669'], ['outflow', 'Tiền ra trong kỳ', TrendingDown, '#dc2626'], ['closing', 'Số dư cuối kỳ', Wallet, '#0c7cd5']].map(([key, label, Icon, color]) => <div key={key} style={{ ...card, padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}><Icon size={24} color={color} aria-hidden="true" /><div><div style={{ color: '#6b7280', fontSize: 13, marginBottom: 7 }}>{label}</div><strong style={{ fontSize: 22, color }}>{summary ? money(summary[key]) : '—'}</strong></div></div>)}
      </div>
      <div style={{ ...card, padding: 16, display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <label style={field}>Từ ngày<input type="date" style={control} value={filters.startDate} onChange={event => filter('startDate', event.target.value)} /></label>
        <label style={field}>Đến ngày<input type="date" style={control} min={filters.startDate || undefined} value={filters.endDate} onChange={event => filter('endDate', event.target.value)} /></label>
        <label style={{ ...field, flex: 1 }}>Quỹ<select style={control} value={filters.fundId} onChange={event => filter('fundId', event.target.value)}><option value="">Tất cả quỹ {activeTab === 'bank' ? 'tiền gửi' : 'tiền mặt'}</option>{visibleFunds.map(fund => <option key={fund.id} value={fund.id}>{fund.name}{fund.active === false ? ' (ngừng dùng)' : ''}</option>)}</select></label>
        <label style={field}>Người ghi sổ<select style={control} value={filters.actorId} onChange={event => filter('actorId', event.target.value)}><option value="">Tất cả nhân viên</option>{users.map(actor => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></label>
        <label style={field}>Tiền tệ<select style={control} value={filters.currency} onChange={event => filter('currency', event.target.value)}>{currencyOptions.map(currency => <option key={currency}>{currency}</option>)}</select></label>
      </div>
      {filters.actorId && <p style={{ color: '#6b7280', fontSize: 13 }}>Tổng kỳ đang lọc theo người ghi sổ. Số dư từng quỹ bên dưới gồm tất cả người ghi sổ.</p>}
      <div style={{ ...card, overflow: 'hidden' }} aria-busy={loading}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 870, textAlign: 'left' }}>
            <thead><tr style={{ background: '#f9fafb' }}>{['Ngày ghi sổ', 'Nội dung', 'Quỹ', 'Nhân viên', 'Tiền vào', 'Tiền ra', 'Thao tác'].map((title, index) => <th key={title} scope="col" style={{ ...cell, fontSize: 13, fontWeight: 600, textAlign: index === 4 || index === 5 ? 'right' : 'left' }}>{title}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ ...cell, padding: 30, textAlign: 'center' }} role="status">Đang tải sổ quỹ…</td></tr> : !transactions.length ? <tr><td colSpan={7} style={{ ...cell, padding: 30, textAlign: 'center', color: '#6b7280' }}>Không có giao dịch trong kỳ đã chọn.</td></tr> : transactions.map(row => {
                const amount = Number(row.amount), document = documentById.get(row.cashDocumentId);
                const canUndo = canReverse && document && document.type !== 'reversal' && Number(document.amount) > 0 && !reversed.has(document.id);
                return <tr key={row.id}>
                  <td style={cell}>{row.date}<div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Ghi nhận {new Date(row.createdAt).toLocaleString('vi-VN', { timeZone: settings.timezone })}</div></td>
                  <td style={cell}><div style={{ fontWeight: 500 }}>{row.description}</div><div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{ENTRY_TYPES[row.type] || row.type} · {row.id}</div>{row.reversalOfId && <div style={{ fontSize: 12, color: '#6b7280' }}>Đảo giao dịch {row.reversalOfId}</div>}</td>
                  <td style={cell}>{funds.find(fund => fund.id === row.fundId)?.name || row.fundId}</td>
                  <td style={cell}>{users.find(actor => actor.id === row.userId)?.name || '—'}</td>
                  <td style={{ ...cell, textAlign: 'right', color: '#059669', fontWeight: 600 }}>{amount > 0 ? money(row.amount) : '—'}</td>
                  <td style={{ ...cell, textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>{amount < 0 ? money(-amount) : '—'}</td>
                  <td style={cell}>{canUndo ? <button type="button" style={button} disabled={busy} onClick={() => { setFormError(''); setForm({ mode: 'reverse', document, reason: '' }); }}><RotateCcw size={14} aria-hidden="true" />Đảo phiếu</button> : document && reversed.has(document.id) ? <span style={{ fontSize: 12, color: '#6b7280' }}>Đã đảo</span> : '—'}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#f9fafb' }}>
          <span style={{ color: '#6b7280', fontSize: 13 }}>{book?.pagination.totalItems || 0} giao dịch · Trang {filters.page}/{totalPages}</span>
          <div style={{ display: 'flex', gap: 8 }}><button type="button" style={button} disabled={loading || filters.page <= 1} onClick={() => setFilters(previous => ({ ...previous, page: previous.page - 1 }))}><ChevronLeft size={16} aria-hidden="true" />Trước</button><button type="button" style={button} disabled={loading || filters.page >= totalPages} onClick={() => setFilters(previous => ({ ...previous, page: previous.page + 1 }))}>Sau<ChevronRight size={16} aria-hidden="true" /></button></div>
        </div>
      </div>
      {!!book?.fundBalances.length && <div style={{ ...card, marginTop: 20, padding: 20 }}><h2 style={{ fontSize: 16, margin: '0 0 14px', color: '#111827' }}>Số dư quỹ hiện tại</h2><div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>{book.fundBalances.map(fund => <div key={fund.fundId}><div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>{fund.fund}</div><strong style={{ color: '#111827' }}>{money(fund.balance)}</strong></div>)}</div></div>}
      <dialog ref={dialog} aria-labelledby="cash-document-title" onCancel={event => { if (inFlight.current) event.preventDefault(); else setForm(null); }} onClose={() => { if (!inFlight.current) setForm(null); }} style={{ border: '1px solid #e5e7eb', borderRadius: 14, width: 'min(520px, calc(100vw - 48px))', maxHeight: '85vh', padding: 24, boxShadow: '0 16px 50px #11182730' }}>
        {form && <form onSubmit={submit} aria-busy={busy}>
          <h2 id="cash-document-title" style={{ margin: '0 0 20px', fontSize: 20, color: '#111827' }}>{form.mode === 'reverse' ? 'Đảo chứng từ' : TYPES[form.type]}</h2>
          {formError && <p role="alert" style={errorBox}>{formError}</p>}
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 16, minWidth: 0 }}>
            {form.mode === 'reverse' ? <>
              <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>Phiếu {form.document.id} · {form.document.description} · {formatMoney(form.document.amount, form.document.currency)}. Hệ thống sẽ ghi giao dịch ngược vào quỹ gốc.</p>
              <label style={field}>Lý do đảo phiếu<textarea autoFocus style={{ ...control, minHeight: 90 }} required maxLength={500} value={form.reason} onChange={event => setForm(previous => ({ ...previous, reason: event.target.value }))} /></label>
            </> : <>
              <label style={field}>Quỹ {form.type === 'transfer' ? 'chuyển' : ''}<select autoFocus style={control} required value={form.fundId} onChange={event => setForm(previous => ({ ...previous, fundId: event.target.value, toFundId: previous.toFundId === event.target.value ? '' : previous.toFundId }))}><option value="">Chọn quỹ</option>{activeFunds.map(fund => <option key={fund.id} value={fund.id}>{fund.name}</option>)}</select></label>
              {form.type === 'transfer' && <label style={field}>Quỹ nhận<select style={control} required value={form.toFundId} onChange={event => setForm(previous => ({ ...previous, toFundId: event.target.value }))}><option value="">Chọn quỹ nhận</option>{funds.filter(fund => fund.active !== false && fund.id !== form.fundId && (fund.currency || settings.currency) === filters.currency).map(fund => <option key={fund.id} value={fund.id}>{fund.name}</option>)}</select></label>}
              <label style={field}>Số tiền ({filters.currency})<input style={control} type="number" required min={form.type === 'opening' ? '0' : '0.0001'} step="0.0001" max="999999999999999.9999" inputMode="decimal" value={form.amount} onChange={event => setForm(previous => ({ ...previous, amount: event.target.value }))} /></label>
              {form.type === 'opening' && <><label style={field}>Ngày đầu kỳ<input type="date" style={control} required max={today(settings.timezone)} value={form.date} onChange={event => setForm(previous => ({ ...previous, date: event.target.value }))} /></label><p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>Mỗi quỹ chỉ nhập đầu kỳ một lần. Ngày này phải trước các giao dịch đã có; thời điểm tạo phiếu vẫn được lưu.</p></>}
              <label style={field}>Diễn giải<textarea style={{ ...control, minHeight: 90 }} required maxLength={500} value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} /></label>
            </>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}><button type="button" style={button} onClick={closeForm}>Đóng</button><button type="submit" style={primary}>{busy ? 'Đang ghi sổ…' : form.mode === 'reverse' ? 'Ghi phiếu đảo' : 'Ghi sổ'}</button></div>
          </fieldset>
        </form>}
      </dialog>
    </div>
  );
}
