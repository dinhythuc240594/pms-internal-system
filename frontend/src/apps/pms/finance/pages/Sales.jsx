import React, { useEffect, useRef, useState } from 'react';
import { usePms } from '../../data/usePms';
import { money } from '../../data/model';
import '../../components/DomainForms.css';

const labels={DRAFT:'Bản nháp',POSTED:'Đã ghi nhận',CANCELLED:'Đã hủy'};
export default function Sales(){
  const p=usePms(), [selected,setSelected]=useState(null),[editing,setEditing]=useState(false);
  const [form,setForm]=useState({customerName:'',note:'',items:[]}),[query,setQuery]=useState('');
  const [category,setCategory]=useState(''),[bookingId,setBookingId]=useState('');
  const [payment,setPayment]=useState({amount:'',methodId:'',fundId:''});
  const [refund,setRefund]=useState({paymentId:'',amount:'',reason:''}),[reason,setReason]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [posting,setPosting]=useState(null), inFlight=useRef(false);
  const [invoice,setInvoice]=useState(null),[listing,setListing]=useState({posInvoices:[],pagination:{totalItems:0}});
  const [page,setPage]=useState(1),[search,setSearch]=useState(''),[listLoading,setListLoading]=useState(false),[listVersion,setListVersion]=useState(0);
  const draft=!invoice||invoice.status==='DRAFT';
  useEffect(()=>{
    if(editing)return;
    let current=true;setListLoading(true);setError('');
    p.getPosInvoices({q:search,page,pageSize:25}).then(result=>{if(current)setListing(result);}).catch(e=>{if(current)setError(e.message);}).finally(()=>{if(current)setListLoading(false);});
    return()=>{current=false;};
  },[editing,search,page,listVersion,p.tenantId]);
  const fmt=value=>money(value,invoice?.currency||p.settings.currency);
  async function run(fn){if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');try{await fn();}catch(e){setError(e.message);}finally{inFlight.current=false;setBusy(false);}}
  function open(row){
    setInvoice(row||null);
    setSelected(row?.id||null);setEditing(true);setReason('');setError('');setPosting(null);setBookingId(row?.bookingId||'');
    setForm({customerName:row?.customerName||'',note:row?.note||'',items:(row?.items||[]).map(item=>({...item}))});
    setPayment({amount:row?.balance||'',methodId:'',fundId:''});setRefund({paymentId:'',amount:'',reason:''});
  }
  const change=(i,key,value)=>setForm(old=>({...old,items:old.items.map((row,index)=>i===index?{...row,[key]:value}:row)}));
  async function save(){
    const result=await p.savePosInvoice({...(selected?{id:selected}:{}),customerName:form.customerName,note:form.note,items:form.items.map(({serviceId,quantity,unitPrice})=>({serviceId,quantity,unitPrice}))});
    setSelected(result.id);setInvoice(result);return result;
  }
  async function post(){let target=posting;if(!target){const saved=await save();target={id:saved.id,body:bookingId?{bookingId}:{}};setPosting(target);}const result=await p.postPosInvoice(target.id,target.body);setInvoice(result);setPosting(null);setPayment(old=>({...old,amount:result.balance}));}
  return <div className="pms-domain-page">
    <div className="domain-toolbar"><div><h1>Quản lý bán hàng</h1><p>Hóa đơn dịch vụ, minibar và đền bù ngoài tiền phòng</p></div>
      {editing?<button disabled={busy} onClick={()=>setEditing(false)}>← Danh sách hóa đơn</button>:<button className="primary" disabled={!p.access('pos.write').allowed} onClick={()=>open(null)}>+ Thêm mới</button>}
    </div>{error&&<p role="alert" className="domain-error">{error}</p>}
    {!editing?<div className="domain-panel"><form className="domain-toolbar" onSubmit={e=>{e.preventDefault();setSearch(query.trim());setPage(1);setListVersion(v=>v+1);}}><label>Tìm hóa đơn<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Mã, tên khách, ghi chú"/></label><button disabled={listLoading}>Tìm / tải lại</button></form>
      <table><thead><tr><th>Ngày</th><th>Mã</th><th>Tên khách</th><th>Trạng thái</th><th>Tổng tiền</th><th>Đã thu</th><th>Còn lại</th><th></th></tr></thead><tbody>
        {!listLoading&&listing.posInvoices.map(row=><tr key={row.id}><td>{new Date(row.createdAt).toLocaleDateString('vi-VN')}</td><td>{row.id.slice(0,12)}</td><td>{row.customerName||'Khách lẻ'}</td><td>{labels[row.status]}</td><td>{money(row.total,row.currency)}</td><td>{money(row.paid,row.currency)}</td><td>{row.bookingId?'Ghi vào booking':money(row.balance,row.currency)}</td><td><button disabled={busy} onClick={()=>run(async()=>open(await p.getPosInvoice(row.id)))}>Chi tiết</button></td></tr>)}
        {listLoading?<tr><td colSpan={8}>Đang tải hóa đơn…</td></tr>:!listing.posInvoices.length&&<tr><td colSpan={8}>Không có hóa đơn phù hợp.</td></tr>}
      </tbody></table><div className="domain-toolbar" style={{marginTop:16}}><span>Trang {page} · {listing.pagination.totalItems} hóa đơn</span><div><button disabled={listLoading||page===1} onClick={()=>setPage(v=>v-1)}>Trang trước</button><button disabled={listLoading||page*25>=listing.pagination.totalItems} onClick={()=>setPage(v=>v+1)}>Trang sau</button></div></div></div>:<div className="domain-grid">
      {draft&&<div className="domain-panel"><h2>Chọn dịch vụ</h2><label>Nhóm dịch vụ<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Tất cả</option>{p.serviceCategories.filter(row=>row.active!==false).map(row=><option key={row.id}>{row.name}</option>)}</select></label>
        <div className="domain-fields" style={{marginTop:20}}>{p.services.filter(row=>row.active!==false&&(!category||row.category===category)).map(row=><button key={row.id} disabled={busy||Boolean(posting)||!p.access('pos.write').allowed} onClick={()=>setForm(old=>({...old,items:old.items.some(item=>item.serviceId===row.id)?old.items:[...old.items,{serviceId:row.id,description:row.name,quantity:'1',unitPrice:String(row.price)}]}))}>{row.name}<br/>{fmt(row.price)}</button>)}</div>
      </div>}
      <div className="domain-panel"><h2>Hóa đơn dịch vụ · {labels[invoice?.status]||'Bản nháp mới'}</h2>
        <fieldset disabled={busy||Boolean(posting)||!draft||!p.access('pos.write').allowed} style={{border:0,padding:0}}>
          <div className="domain-fields"><label>Tên khách<input value={form.customerName} onChange={e=>setForm(old=>({...old,customerName:e.target.value}))}/></label><label>Ghi chú<input value={form.note} onChange={e=>setForm(old=>({...old,note:e.target.value}))}/></label></div>
          <table><thead><tr><th>Dịch vụ</th><th>Số lượng</th><th>Đơn giá</th><th></th></tr></thead><tbody>{form.items.map((row,i)=><tr key={i}><td>{row.description}</td><td><input aria-label={'Số lượng '+row.description} type="number" min="0.0001" step="0.0001" value={row.quantity} onChange={e=>change(i,'quantity',e.target.value)}/></td><td><input aria-label={'Đơn giá '+row.description} type="number" min="0" step="0.0001" value={row.unitPrice} onChange={e=>change(i,'unitPrice',e.target.value)}/></td><td><button onClick={()=>setForm(old=>({...old,items:old.items.filter((_,index)=>index!==i)}))}>Bỏ</button></td></tr>)}</tbody></table>
          {draft&&<><label style={{marginTop:16}}>Ghi vào booking<select value={bookingId} onChange={e=>setBookingId(e.target.value)}><option value="">Khách lẻ · thu tại POS</option>{p.bookings.filter(row=>['CONFIRMED','IN_HOUSE'].includes(row.status)&&row.currency===(invoice?.currency||p.settings.currency)).map(row=><option key={row.id} value={row.id}>{row.guest} · {row.id.slice(0,10)}</option>)}</select></label><div className="domain-fields" style={{marginTop:16}}><button disabled={!form.items.length} onClick={()=>run(save)}>Lưu nháp</button><button className="primary" disabled={!form.items.length} onClick={()=>run(post)}>Ghi nhận hóa đơn</button></div></>}
        </fieldset>
        {posting&&<p role="status">Đang chờ xác nhận ghi nhận hóa đơn. <button disabled={busy} onClick={()=>run(post)}>Kiểm tra và thử lại</button></p>}
        {invoice&&<p>Tổng đã lưu: <strong>{fmt(invoice.total)}</strong> · Đã thu: {fmt(invoice.paid)} · Còn lại: {fmt(invoice.balance)}</p>}
        {invoice?.bookingId&&<p>Đã ghi chi phí vào booking {invoice.bookingId}. Thanh toán tại chi tiết đặt phòng.</p>}
        {invoice?.status==='POSTED'&&!invoice.bookingId&&<>
          <form onSubmit={e=>{e.preventDefault();run(async()=>{const updated=await p.payPosInvoice(invoice.id,payment);setInvoice(updated);setPayment(old=>({...old,amount:updated.balance}));});}}><h2>Thanh toán</h2><fieldset disabled={busy||!p.access('payments.write').allowed} style={{border:0,padding:0}}><div className="domain-fields">
            <label>Số tiền<input required type="number" min="0.0001" step="0.0001" value={payment.amount} onChange={e=>setPayment(old=>({...old,amount:e.target.value}))}/></label>
            <label>Phương thức<select required value={payment.methodId} onChange={e=>setPayment(old=>({...old,methodId:e.target.value}))}><option value="">Chọn phương thức</option>{p.paymentMethods.filter(row=>row.active!==false).map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label>Quỹ thu<select required value={payment.fundId} onChange={e=>setPayment(old=>({...old,fundId:e.target.value}))}><option value="">Chọn quỹ</option>{p.funds.filter(row=>row.active!==false&&(row.currency||p.settings.currency)===invoice.currency).map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          </div><button className="success">Thu tiền</button></fieldset></form>
          {!!invoice.payments.length&&<><h2 style={{marginTop:24}}>Các khoản thanh toán</h2><table><thead><tr><th>Ngày</th><th>Quỹ</th><th>Đã thu</th><th>Đã hoàn</th></tr></thead><tbody>{invoice.payments.map(row=><tr key={row.id}><td>{new Date(row.createdAt).toLocaleString('vi-VN')}</td><td>{row.fund}</td><td>{fmt(row.amount)}</td><td>{fmt(row.refunded)}</td></tr>)}</tbody></table>
            <form onSubmit={e=>{e.preventDefault();run(async()=>{const updated=await p.refundPosInvoice(invoice.id,refund.paymentId,{amount:refund.amount,reason:refund.reason});setInvoice(updated);setRefund({paymentId:'',amount:'',reason:''});});}}><fieldset disabled={busy||!p.access('payments.write').allowed} style={{border:0,padding:0}}><div className="domain-fields">
              <label>Khoản hoàn<select required value={refund.paymentId} onChange={e=>setRefund(old=>({...old,paymentId:e.target.value}))}><option value="">Chọn khoản đã thu</option>{invoice.payments.map(row=><option key={row.id} value={row.id}>{row.fund} · {fmt(row.amount)}</option>)}</select></label><label>Số tiền hoàn<input required type="number" min="0.0001" step="0.0001" value={refund.amount} onChange={e=>setRefund(old=>({...old,amount:e.target.value}))}/></label><label>Lý do hoàn<input required value={refund.reason} onChange={e=>setRefund(old=>({...old,reason:e.target.value}))}/></label>
            </div><button>Hoàn tiền</button></fieldset></form></>}
        </>}
        {invoice&&invoice.status!=='CANCELLED'&&p.access('pos.cancel').allowed&&<form onSubmit={e=>{e.preventDefault();run(async()=>setInvoice(await p.cancelPosInvoice(invoice.id,{reason})));}} style={{marginTop:24}}><div className="domain-fields"><label>Lý do hủy hóa đơn<input required value={reason} onChange={e=>setReason(e.target.value)}/></label><button disabled={busy}>Hủy và ghi giao dịch đối ứng</button></div></form>}
        {invoice?.status==='CANCELLED'&&<p>Lý do hủy: {invoice.cancellationReason}</p>}
      </div>
    </div>}
  </div>;
}
