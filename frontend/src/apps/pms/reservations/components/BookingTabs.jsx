import { t as tUi, tr as labelUi, useI18n } from '../../../../shared/i18n/useI18n.js';
import React, { useEffect, useRef, useState } from 'react';
import { usePms } from '../../data/usePms';
import { timestamp, bookingEvent } from '../../data/presentation';
import { money as formatMoney } from '../../data/model';
const cell = { padding: 12, borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#374151' };
export default function BookingTabs({ tab, booking }) {
  useI18n();
  const money=value=>formatMoney(value,booking.currency);
  const { services, paymentMethods, funds, settings, access, addCharge, addPayment, refundPayment, addNote, updateBooking, adjustBooking } = usePms();
  const bookingFunds = funds.filter(row => (row.currency || settings.currency) === booking.currency);
  const [form, setForm] = useState({});
  const [guests, setGuests] = useState(() => booking.guests || []);
  useEffect(() => setGuests(booking.guests || []), [booking.guests]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const intent = useRef(crypto.randomUUID());
  const update = (key, value) => { setForm(f => ({ ...f, [key]: value })); intent.current = crypto.randomUUID(); setNotice(''); };
  const run = async fn => { if (busy) return; setBusy(true); setError(''); setNotice(''); try { await fn(); setNotice('Đã lưu.'); setForm({}); intent.current = crypto.randomUUID(); } catch(err) { setError(err.message); } finally { setBusy(false); } };
  const canWrite = access(['thanhtoán','dịchvụ'].includes(tab) ? 'payments.write' : 'reservations.write').allowed && (tab !== 'kháchhàng' || (access('guests.write').allowed && ['CONFIRMED','IN_HOUSE'].includes(booking.status)));
  const field = (key, label, type = 'text', required = true) => <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#4b5563' }}>{labelUi(label)}<input aria-label={labelUi(label)} className="booking-detail-input" type={type} inputMode={type === 'number' ? 'decimal' : undefined} min={type === 'number' ? '0.0001' : undefined} step={type === 'number' ? '0.0001' : undefined} value={form[key] || ''} onChange={e => update(key, e.target.value)} required={required} disabled={busy} /></label>;
  const select = (key, label, rows) => <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>{labelUi(label)}<select aria-label={labelUi(label)} className="booking-detail-input" value={form[key] || ''} onChange={e => update(key, e.target.value)}><option value="">Chọn…</option>{rows.filter(r => r.active !== false).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>;
  const table = (headers, rows) => <div className="booking-detail-table-wrap" tabIndex={0} role="region" aria-label={headers.join(', ')}><table role="table" style={{ width: '100%', borderCollapse: 'collapse' }}><thead role="rowgroup"><tr role="row">{headers.map(h => <th role="columnheader" scope="col" key={h} style={cell}>{h}</th>)}</tr></thead><tbody role="rowgroup">{rows.length ? rows.map((row,i) => <tr role="row" key={i}>{row.map((value,j) => <td role="cell" data-label={headers[j]} key={j} style={cell}>{value}</td>)}</tr>) : <tr role="row"><td role="cell" colSpan={headers.length} style={cell}>Chưa có dữ liệu.</td></tr>}</tbody></table></div>;
  return <section className="booking-detail-section">
    {error && <p role="alert" style={{ color: '#dc2626' }}>{error}</p>}{notice && <p role="status" style={{ color: '#059669' }}>{notice}</p>}
    {tab === 'kháchhàng' && <>
      {guests.map((guest,index) => <div key={guest.id || index} className="booking-detail-guests-row">
        {['name','phone','email'].map(key => <input key={key} type={{name:'text',phone:'tel',email:'email'}[key]} aria-label={key+' khách '+(index+1)} className="booking-detail-input" value={guest[key] || ''} placeholder={{name:tUi("common.name"),phone:'Điện thoại',email:'Email'}[key]} disabled={busy || !canWrite} onChange={e => setGuests(list => list.map((g,i) => i === index ? {...g,[key]:e.target.value} : g))} />)}
        <button type="button" className="booking-detail-button booking-detail-button--danger" disabled={busy || !canWrite || guests.length === 1} onClick={() => setGuests(list => list.filter((_,i) => i !== index))}>Xóa</button>
      </div>)}
      <div className="booking-detail-form-actions">
        <button type="button" className="booking-detail-button" disabled={busy || !canWrite} onClick={() => setGuests(list => [...list,{name:'',phone:'',email:''}])}>+ Thêm khách</button>
        <button type="button" className="booking-detail-button booking-detail-button--primary" disabled={busy || !canWrite} onClick={() => run(() => updateBooking(booking.id,{guests}))}>Lưu khách lưu trú</button>
      </div>
    </>}
    {tab === 'dịchvụ' && <>
      {table(['Dịch vụ / Khoản phí','SL','Đơn giá','Thành tiền'],(booking.charges || []).map(row => [row.description,row.quantity,money(row.unitPrice),money(row.amount ?? Number(row.quantity)*Number(row.unitPrice))]))}
      <form onSubmit={e => { e.preventDefault(); run(() => addCharge(booking.id,{...form,type:form.type||'service',quantity:form.quantity||'1'},intent.current)); }} className="booking-detail-form">
        <fieldset disabled={busy || !canWrite || booking.status === 'CHECKED_OUT' || booking.status === 'CANCELLED'} style={{border:0,padding:0,display:'contents'}}>
          {select('serviceId','Dịch vụ',services)}{field('description','Nội dung khoản phí')}{field('quantity','Số lượng','number')}{field('unitPrice','Đơn giá','number')}
          {select('type','Loại khoản phí',[{id:'service',name:'Dịch vụ'},{id:'fee',name:'Phụ thu'},{id:'tax',name:'Thuế'},{id:'discount',name:'Giảm giá'}])}
          <button className="booking-detail-button booking-detail-button--primary" type="submit">Thêm khoản phí</button>
        </fieldset>
      </form>
    </>}
    {tab === 'giáphòng' && <>{table(['Phòng','Ngày','Giá từng đêm'],(booking.nightlyRates||[]).map(row=>[row.room,row.date,money(row.price)]))}<p>Giá đã chốt tại thời điểm đặt phòng. Tổng: <strong>{money((booking.nightlyRates||[]).reduce((sum,row)=>sum+Number(row.price),0))}</strong></p></>}
    {tab === 'thanhtoán' && <>
      <p>Đã thanh toán: <strong>{money(booking.paid)}</strong> · Số dư: <strong>{money(booking.balance)}</strong></p>
      {table(['Thời gian','Phương thức','Số tiền','Hoàn tiền'],(booking.payments||[]).map(row=>[timestamp(row.createdAt, settings.timezone),row.method||row.methodName||paymentMethods.find(m=>m.id===row.methodId)?.name,money(row.amount),money(row.refunded ?? row.refundedAmount ?? 0)]))}
      {table(['Hoàn tiền lúc','Số tiền','Lý do','Người thực hiện'],(booking.payments||[]).flatMap(p=>(p.refunds||[]).map(r=>[timestamp(r.createdAt, settings.timezone),money(r.amount),r.reason,r.actor])))}
      <form onSubmit={e=>{e.preventDefault();run(()=>addPayment(booking.id,form,intent.current));}} className="booking-detail-form"><fieldset disabled={busy||!canWrite||Number(booking.balance)<=0||booking.status==='CHECKED_OUT'||booking.status==='CANCELLED'} style={{border:0,padding:0,display:'contents'}}>{field('amount','Số tiền thanh toán','number')}{select('methodId','Phương thức thanh toán',paymentMethods)}{select('fundId','Quỹ nhận tiền',bookingFunds)}{field('note','Ghi chú thanh toán','text',false)}<button className="booking-detail-button booking-detail-button--primary" type="submit">Ghi nhận thanh toán</button></fieldset></form>
      <form onSubmit={e=>{e.preventDefault();run(()=>refundPayment(booking.id,form.paymentId,{amount:form.refundAmount,reason:form.reason},intent.current));}} className="booking-detail-form"><fieldset disabled={busy||!canWrite||booking.status==='CHECKED_OUT'} style={{border:0,padding:0,display:'contents'}}>{select('paymentId','Giao dịch cần hoàn tiền',(booking.payments||[]).map(p=>({id:p.id,name:timestamp(p.createdAt, settings.timezone)+' · '+money(p.amount)})))}{field('refundAmount','Số tiền hoàn','number')}{field('reason','Lý do hoàn tiền')}<button className="booking-detail-button booking-detail-button--danger" type="submit">Hoàn tiền</button></fieldset></form>
    </>}
    {tab === 'thanhtoán' && booking.status==='CHECKED_OUT' && access('finance.adjust').allowed && <form onSubmit={e=>{e.preventDefault();const credit=form.adjustType!=='debit';run(()=>adjustBooking(booking.id,{type:credit?'credit':'debit',amount:form.adjustAmount,reason:form.adjustReason,...(credit?{paymentId:form.adjustPaymentId}:{methodId:form.adjustMethodId,fundId:form.adjustFundId})}));}} className="booking-detail-form"><h3 style={{gridColumn:'1/-1'}}>Điều chỉnh sau checkout</h3><fieldset disabled={busy} style={{border:0,padding:0,display:'contents'}}>{select('adjustType','Loại điều chỉnh',[{id:'credit',name:'Giảm tiền và hoàn'},{id:'debit',name:'Thu bổ sung'}])}{field('adjustAmount','Số tiền điều chỉnh','number')}{field('adjustReason','Lý do điều chỉnh')}{form.adjustType==='debit'?<>{select('adjustMethodId','Phương thức thu bổ sung',paymentMethods)}{select('adjustFundId','Quỹ thu bổ sung',bookingFunds)}</>:select('adjustPaymentId','Khoản thu gốc',(booking.payments||[]).map(row=>({id:row.id,name:timestamp(row.createdAt, settings.timezone)+' · '+money(row.amount)})))}<button type="submit" className="booking-detail-button booking-detail-button--primary">Ghi điều chỉnh và giao dịch đối ứng</button></fieldset></form>}
    {tab === 'ghichú' && <>{table(['Thời gian','Người ghi','Ghi chú'],(booking.notes||[]).map(row=>[timestamp(row.createdAt, settings.timezone),row.actor||row.authorName||row.userName||row.createdBy,row.text||row.body||row.content]))}<form onSubmit={e=>{e.preventDefault();run(()=>addNote(booking.id,{text:form.text}));}} className="booking-detail-form booking-detail-form--note">{field('text','Ghi chú mới')}<button type="submit" className="booking-detail-button booking-detail-button--primary" disabled={busy||!canWrite}>Thêm ghi chú</button></form></>}
    {tab === 'lịchsử' && table(['Thời gian','Người thực hiện','Thao tác','Chi tiết'],(booking.history||[]).map(row=>[timestamp(row.createdAt||row.at, settings.timezone),row.actor||row.userName||'—',bookingEvent(row,booking.currency).label,bookingEvent(row,booking.currency).detail]))}
  </section>;
}
