import React, { useState } from 'react';
import { usePms } from '../../data/usePms';
import { Search } from 'lucide-react';

export default function Guests() {
  const { guests, bookings, saveGuest, access } = usePms();
  const [query,setQuery] = useState(''), [draft,setDraft] = useState({name:'',phone:'',email:'',identityNumber:'',nationality:''});
  const [error,setError] = useState(''), [notice,setNotice] = useState(''), [busy,setBusy] = useState(false);
  const canWrite = access('guests.write').allowed;
  const mockGuests = guests.filter(g => (g.name+' '+g.phone+' '+g.email).toLowerCase().includes(query.toLowerCase())).map(g => ({...g,totalVisits:bookings.filter(b=>b.guests?.some(item=>item.id===g.id)).length}));
  async function save(input) { if(busy)return;setBusy(true);setError('');setNotice('');try{await saveGuest(input);setDraft({name:'',phone:'',email:''});setNotice('Đã lưu hồ sơ khách.');}catch(err){setError(err.message);}finally{setBusy(false);} }


  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>Hồ sơ Khách hàng</h1>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 16px', flex: 1 }}>
          <Search color="#64748b" size={20} />
          <input type="text" aria-label="Tìm khách" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm theo tên, SĐT, Email..." style={{ border: 'none', outline: 'none', marginLeft: '12px', width: '100%', fontSize: '16px' }} />
        </div>
      </div>

      {error && <p role="alert" style={{color:'#dc2626'}}>{error}</p>}{notice && <p role="status">{notice}</p>}
      {canWrite && <form onSubmit={e=>{e.preventDefault();save(draft);}} style={{display:'flex',flexWrap:'wrap',gap:16,padding:24,background:'#fff',borderRadius:12,marginBottom:24}}>{['name','phone','email','identityNumber','nationality'].map(key=><input key={key} aria-label={key} required={key==='name'} type={key==='email'?'email':'text'} placeholder={{name:'Họ tên khách',phone:'Điện thoại',email:'Email',identityNumber:'CCCD / Hộ chiếu',nationality:'Quốc tịch'}[key]} value={draft[key]||''} onChange={e=>setDraft(d=>({...d,[key]:e.target.value}))} style={{padding:10,border:'1px solid #cbd5e1',borderRadius:8}}/>)}<button disabled={busy} type="submit">{draft.id?'Lưu khách':'Thêm khách'}</button>{draft.id&&<button type="button" onClick={()=>setDraft({name:'',phone:'',email:''})}>Hủy</button>}</form>}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '16px', color: '#475569', fontWeight: 'bold' }}>Mã khách</th>
              <th style={{ padding: '16px', color: '#475569', fontWeight: 'bold' }}>Họ và tên</th>
              <th style={{ padding: '16px', color: '#475569', fontWeight: 'bold' }}>Số điện thoại</th>
              <th style={{ padding: '16px', color: '#475569', fontWeight: 'bold' }}>Email</th>
              <th style={{ padding: '16px', color: '#475569', fontWeight: 'bold' }}>Số lần đến</th>
            </tr>
          </thead>
          <tbody>
            {mockGuests.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '16px', color: '#64748b', fontSize: '16px' }}>{item.id}</td>
                <td style={{ padding: '16px', fontWeight: 'bold', fontSize: '16px' }}>{item.name}</td>
                <td style={{ padding: '16px', fontSize: '16px' }}>{item.phone}</td>
                <td style={{ padding: '16px', fontSize: '16px', color: '#2563eb' }}>{item.email}</td>
                <td style={{ padding: '16px', fontSize: '16px', fontWeight: 'bold' }}>{item.totalVisits} lần {canWrite && <><button onClick={()=>setDraft(item)}>Sửa</button> <button disabled={busy} onClick={()=>save({...item,active:item.active===false})}>{item.active===false?'Kích hoạt':'Ngừng sử dụng'}</button></>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
