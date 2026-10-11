import React, { useEffect, useRef, useState } from 'react';
import { usePms } from '../../data/usePms';
import { timestamp, bookingEvent } from '../../data/presentation';
import { money as formatMoney } from '../../data/model';
const input = { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, width: '100%', background: '#fff' };
const btn = { padding: '8px 16px', border: 0, borderRadius: 6, background: '#4f46e5', color: '#fff', cursor: 'pointer' };
const cell = { padding: 12, borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#374151' };
export default function BookingTabs({ tab, booking }) {
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
  const field = (key, label, type = 'text', required = true) => <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#4b5563' }}>{label}<input aria-label={label} style={input} type={type} min={type === 'number' ? '0.0001' : undefined} step={type === 'number' ? '0.0001' : undefined} value={form[key] || ''} onChange={e => update(key, e.target.value)} required={required} /></label>;
  const select = (key, label, rows) => <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>{label}<select aria-label={label} style={input} value={form[key] || ''} onChange={e => update(key, e.target.value)}><option value="">Chọn…</option>{rows.filter(r => r.active !== false).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>;
  const table = (headers, rows) => <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{headers.map(h => <th key={h} style={cell}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row,i) => <tr key={i}>{row.map((value,j) => <td key={j} style={cell}>{value}</td>)}</tr>) : <tr><td colSpan={headers.length} style={cell}>Chưa có dữ liệu.</td></tr>}</tbody></table>;
  return <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
    {error && <p role="alert" style={{ color: '#dc2626' }}>{error}</p>}{notice && <p role="status" style={{ color: '#059669' }}>{notice}</p>}
    {tab === 'kháchhàng' && <>
      {guests.map((guest,index) => <div key={guest.id || index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 16 }}>
        {['name','phone','email'].map(key => <input key={key} aria-label={key+' khách '+(index+1)} style={input} value={guest[key] || ''} placeholder={{name:'Họ tên',phone:'Điện thoại',email:'Email'}[key]} disabled={!canWrite} onChange={e => setGuests(list => list.map((g,i) => i === index ? {...g,[key]:e.target.value} : g))} />)}
        <button disabled={!canWrite || guests.length === 1} onClick={() => setGuests(list => list.filter((_,i) => i !== index))}>Xóa</button>
      </div>)}
      <button style={btn} disabled={!canWrite} onClick={() => setGuests(list => [...list,{name:'',phone:'',email:''}])}>+ Thêm khách</button>{' '}
      <button style={btn} disabled={busy || !canWrite} onClick={() => run(() => updateBooking(booking.id,{guests}))}>Lưu khách lưu trú</button>
    </>}
    {tab === 'dịchvụ' && <>
      {table(['Dịch vụ / Khoản phí','SL','Đơn giá','Thành tiền'],(booking.charges || []).map(row => [row.description,row.quantity,money(row.unitPrice),money(row.amount ?? Number(row.quantity)*Number(row.unitPrice))]))}
      <form onSubmit={e => { e.preventDefault(); run(() => addCharge(booking.id,{...form,type:form.type||'service',quantity:form.quantity||'1'},intent.current)); }} style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:16,marginTop:20}}>
        <fieldset disabled={busy || !canWrite || booking.status === 'CHECKED_OUT' || booking.status === 'CANCELLED'} style={{border:0,padding:0,display:'contents'}}>
          {select('serviceId','Dịch vụ',services)}{field('description','Nội dung khoản phí')}{field('quantity','Số lượng','number')}{field('unitPrice','Đơn giá','number')}
          {select('type','Loại khoản phí',[{id:'service',name:'Dịch vụ'},{id:'fee',name:'Phụ thu'},{id:'tax',name:'Thuế'},{id:'discount',name:'Giảm giá'}])}
          <button style={btn} type="submit">Thêm khoản phí</button>
        </fieldset>
      </form>
    </>}
    {tab === 'giáphòng' && <>{table(['Phòng','Ngày','Giá từng đêm'],(booking.nightlyRates||[]).map(row=>[row.room,row.date,money(row.price)]))}<p>Giá đã chốt tại thời điểm đặt phòng. Tổng: <strong>{money((booking.nightlyRates||[]).reduce((sum,row)=>sum+Number(row.price),0))}</strong></p></>}
    {tab === 'thanhtoán' && <>
      <p>Đã thanh toán: <strong>{money(booking.paid)}</strong> · Số dư: <strong>{money(booking.balance)}</strong></p>
      {table(['Thời gian','Phương thức','Số tiền','Hoàn tiền'],(booking.payments||[]).map(row=>[timestamp(row.createdAt),row.method||row.methodName||paymentMethods.find(m=>m.id===row.methodId)?.name,money(row.amount),money(row.refunded ?? row.refundedAmount ?? 0)]))}
      {table(['Hoàn tiền lúc','Số tiền','Lý do','Người thực hiện'],(booking.payments||[]).flatMap(p=>(p.refunds||[]).map(r=>[timestamp(r.createdAt),money(r.amount),r.reason,r.actor])))}
      <form onSubmit={e=>{e.preventDefault();run(()=>addPayment(booking.id,form,intent.current));}} style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:16,marginTop:20}}><fieldset disabled={busy||!canWrite||Number(booking.balance)<=0||booking.status==='CHECKED_OUT'||booking.status==='CANCELLED'} style={{border:0,padding:0,display:'contents'}}>{field('amount','Số tiền thanh toán','number')}{select('methodId','Phương thức thanh toán',paymentMethods)}{select('fundId','Quỹ nhận tiền',bookingFunds)}{field('note','Ghi chú thanh toán','text',false)}<button style={btn} type="submit">Ghi nhận thanh toán</button></fieldset></form>
      <form onSubmit={e=>{e.preventDefault();run(()=>refundPayment(booking.id,form.paymentId,{amount:form.refundAmount,reason:form.reason},intent.current));}} style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:16,marginTop:24}}><fieldset disabled={busy||!canWrite||booking.status==='CHECKED_OUT'} style={{border:0,padding:0,display:'contents'}}>{select('paymentId','Giao dịch cần hoàn tiền',(booking.payments||[]).map(p=>({id:p.id,name:timestamp(p.createdAt)+' · '+money(p.amount)})))}{field('refundAmount','Số tiền hoàn','number')}{field('reason','Lý do hoàn tiền')}<button style={btn} type="submit">Hoàn tiền</button></fieldset></form>
    </>}
    {tab === 'thanhtoán' && booking.status==='CHECKED_OUT' && access('finance.adjust').allowed && <form onSubmit={e=>{e.preventDefault();const credit=form.adjustType!=='debit';run(()=>adjustBooking(booking.id,{type:credit?'credit':'debit',amount:form.adjustAmount,reason:form.adjustReason,...(credit?{paymentId:form.adjustPaymentId}:{methodId:form.adjustMethodId,fundId:form.adjustFundId})}));}} style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginTop:24}}><h3 style={{gridColumn:'1/-1'}}>Điều chỉnh sau checkout</h3><fieldset disabled={busy} style={{border:0,padding:0,display:'contents'}}>{select('adjustType','Loại điều chỉnh',[{id:'credit',name:'Giảm tiền và hoàn'},{id:'debit',name:'Thu bổ sung'}])}{field('adjustAmount','Số tiền điều chỉnh','number')}{field('adjustReason','Lý do điều chỉnh')}{form.adjustType==='debit'?<>{select('adjustMethodId','Phương thức thu bổ sung',paymentMethods)}{select('adjustFundId','Quỹ thu bổ sung',bookingFunds)}</>:select('adjustPaymentId','Khoản thu gốc',(booking.payments||[]).map(row=>({id:row.id,name:timestamp(row.createdAt)+' · '+money(row.amount)})))}<button style={btn}>Ghi điều chỉnh và giao dịch đối ứng</button></fieldset></form>}
    {tab === 'ghichú' && <>{table(['Thời gian','Người ghi','Ghi chú'],(booking.notes||[]).map(row=>[timestamp(row.createdAt),row.actor||row.authorName||row.userName||row.createdBy,row.text||row.body||row.content]))}<form onSubmit={e=>{e.preventDefault();run(()=>addNote(booking.id,{text:form.text}));}} style={{marginTop:20}}>{field('text','Ghi chú mới')}<button type="submit" style={{...btn,marginTop:12}} disabled={busy||!canWrite}>Thêm ghi chú</button></form></>}
    {tab === 'lịchsử' && table(['Thời gian','Người thực hiện','Thao tác','Chi tiết'],(booking.history||[]).map(row=>[timestamp(row.createdAt||row.at),row.actor||row.userName||'—',bookingEvent(row,booking.currency).label,bookingEvent(row,booking.currency).detail]))}
  </section>;
}
