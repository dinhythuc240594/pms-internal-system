import { useEffect, useRef, useState } from 'react';
import { Phone, Save, User, UserPlus } from 'lucide-react';
import { usePms } from '../../data/usePms';
import { today } from '../../data/model';
import '../../components/DomainForms.css';

const blankStaff = () => ({ name: '', phone: '', userId: '', active: true });

export default function HousekeepingStaff() {
  const pms = usePms();
  return <StaffWorkspace key={`${pms.tenantId}:${pms.settings.timezone}`} pms={pms} />;
}

function StaffWorkspace({ pms }) {
  const { housekeepingStaff: staff = [], housekeepingShifts: shifts = [], users = [], settings,
    tenantId, access, saveHousekeepingStaff, saveHousekeepingShift } = pms;
  const [search, setSearch] = useState('');
  const [staffForm, setStaffForm] = useState(blankStaff);
  const [shiftForm, setShiftForm] = useState({ staffId: '', date: today(settings.timezone), startTime: '08:00', endTime: '16:00', note: '', active: true });
  const [date, setDate] = useState(today(settings.timezone));
  const [loaded, setLoaded] = useState({date:'',shifts:[],source:null,error:''});
  const requests = useRef(pms.requestTenant);
  useEffect(()=>{requests.current=pms.requestTenant;},[pms.requestTenant]);
  useEffect(()=>{
    let current=true;
    if(!date)return()=>{current=false;};
    requests.current('/housekeeping/shifts?'+new URLSearchParams({date})).then(data=>{if(current)setLoaded({date,shifts:data.shifts,source:shifts,error:''});}).catch(err=>{if(current)setLoaded({date,shifts:[],source:shifts,error:err.message});});
    return()=>{current=false;};
  },[date,tenantId,shifts]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const canManage = access('housekeeping.manage').allowed;
  const accounts = pms.housekeepingAccounts || users.filter(account => account.active !== false && account.memberships?.some(member => member.tenantId === tenantId && member.role === 'HOUSEKEEPING' && member.active !== false));
  const visibleStaff = staff.filter(row => `${row.name} ${row.phone}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const shiftLoading=Boolean(date)&&(loaded.date!==date||loaded.source!==shifts);
  const visibleShifts = loaded.date===date&&!shiftLoading ? [...loaded.shifts].sort((a, b) => a.startTime.localeCompare(b.startTime)) : [];
  const staffName = id => staff.find(row => row.id === id)?.name || 'Nhân viên';
  async function save(action, message, after) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); after?.(); setNotice(message); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function editStaff(row) { setStaffForm({ id: row.id, name: row.name, phone: row.phone, userId: row.userId || '', active: row.active }); setError(''); setNotice(''); }
  function editShift(row) { setShiftForm({ ...row }); setError(''); setNotice(''); }

  return <div className="pms-domain-page">
    <header className="domain-toolbar"><div><h1>Nhân viên buồng phòng</h1><p>Quản lý đội ngũ, tài khoản nhận việc và ca làm việc.</p></div><span>{staff.length} nhân viên</span></header>
    {error && <p className="domain-error" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <div className="domain-grid">
      <section className="domain-panel">
        <div className="domain-toolbar"><h2>Danh sách nhân viên</h2><label>Tìm nhân viên<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Họ tên hoặc số điện thoại" /></label></div>
        {!visibleStaff.length && <p>Chưa có nhân viên phù hợp. Thêm nhân viên để phân công công việc.</p>}
        <div className="domain-fields">
          {visibleStaff.map(row => <article key={row.id} className="domain-panel">
            <div className="domain-toolbar"><h3><User size={18} aria-hidden="true" /> {row.name}</h3><span>{row.active ? 'Đang hoạt động' : 'Ngừng hoạt động'}</span></div>
            <p><Phone size={14} aria-hidden="true" /> {row.phone || 'Chưa có số điện thoại'}</p>
            <p>{row.userId ? 'Đã liên kết tài khoản nhận việc' : 'Chưa liên kết tài khoản; quản lý có thể điều phối công việc.'}</p>
            {canManage && <div className="domain-toolbar"><button type="button" disabled={busy} onClick={() => editStaff(row)}>Sửa thông tin</button><button type="button" disabled={busy} onClick={() => save(() => saveHousekeepingStaff({ id: row.id, active: !row.active }), 'Đã cập nhật trạng thái nhân viên.')}>{row.active ? 'Ngừng hoạt động' : 'Kích hoạt'}</button></div>}
          </article>)}
        </div>
      </section>
      {canManage && <section className="domain-panel"><h2><UserPlus size={18} aria-hidden="true" /> {staffForm.id ? 'Sửa nhân viên' : 'Thêm nhân viên'}</h2>
        <form onSubmit={event => { event.preventDefault(); save(() => saveHousekeepingStaff({ ...staffForm, userId: staffForm.userId || null }), 'Đã lưu nhân viên.', () => setStaffForm(blankStaff())); }}>
          <fieldset disabled={busy} className="domain-fields">
            <label>Họ tên<input required maxLength={160} value={staffForm.name} onChange={event => setStaffForm({ ...staffForm, name: event.target.value })} autoComplete="name" /></label>
            <label>Số điện thoại<input type="tel" maxLength={40} value={staffForm.phone} onChange={event => setStaffForm({ ...staffForm, phone: event.target.value })} autoComplete="tel" /></label>
            <label>Tài khoản nhận việc<select value={staffForm.userId} onChange={event => setStaffForm({ ...staffForm, userId: event.target.value })}><option value="">Chưa liên kết tài khoản</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}{staffForm.userId && !accounts.some(account => account.id === staffForm.userId) && <option value={staffForm.userId}>Tài khoản đang liên kết</option>}</select></label>
            <p>Chỉ liên kết tài khoản buồng phòng đang hoạt động trong khách sạn. Chủ khách sạn tạo tài khoản tại mục Nhân viên.</p>
            <label>Trạng thái<select value={staffForm.active ? 'active' : 'inactive'} onChange={event => setStaffForm({ ...staffForm, active: event.target.value === 'active' })}><option value="active">Đang hoạt động</option><option value="inactive">Ngừng hoạt động</option></select></label>
            <div className="domain-toolbar"><button type="button" onClick={() => setStaffForm(blankStaff())}>Hủy chỉnh sửa</button><button className="primary" type="submit"><Save size={16} aria-hidden="true" /> {busy ? 'Đang lưu…' : 'Lưu nhân viên'}</button></div>
          </fieldset>
        </form>
      </section>}
    </div>
    <section className="domain-panel"><div className="domain-toolbar"><div><h2>Ca làm việc</h2><p>Ca trong cùng ngày; thời gian kết thúc phải sau thời gian bắt đầu.</p></div><label>Ngày xem ca<input type="date" required value={date} onChange={event => setDate(event.target.value)} /></label></div>
      {!shiftLoading&&loaded.error&&<p className="domain-error" role="alert">{loaded.error}</p>}
      <div style={{ overflowX: 'auto' }}><table><caption>Ca làm việc ngày {date}</caption><thead><tr><th>Nhân viên</th><th>Giờ làm</th><th>Ghi chú</th><th>Trạng thái</th>{canManage && <th>Thao tác</th>}</tr></thead><tbody>{visibleShifts.map(row => <tr key={row.id}><td>{staffName(row.staffId)}</td><td>{row.startTime} – {row.endTime}</td><td>{row.note || '—'}</td><td>{row.active ? 'Đang áp dụng' : 'Đã ngừng'}</td>{canManage && <td><button type="button" disabled={busy} onClick={() => editShift(row)}>Sửa ca</button></td>}</tr>)}{!visibleShifts.length && <tr><td colSpan={canManage ? 5 : 4}>{shiftLoading?'Đang tải ca làm việc…':loaded.error?'Không tải được ca; chọn lại ngày để thử lại.':'Chưa có ca làm việc cho ngày này.'}</td></tr>}</tbody></table></div>
      {canManage && <form onSubmit={event => { event.preventDefault(); save(() => saveHousekeepingShift(shiftForm), 'Đã lưu ca làm việc.', () => { setDate(shiftForm.date); setShiftForm({ staffId: '', date: shiftForm.date, startTime: '08:00', endTime: '16:00', note: '', active: true }); }); }}>
        <h3>{shiftForm.id ? 'Sửa ca làm việc' : 'Thêm ca làm việc'}</h3><fieldset disabled={busy} className="domain-fields">
          <label>Nhân viên của ca<select required value={shiftForm.staffId} onChange={event => setShiftForm({ ...shiftForm, staffId: event.target.value })}><option value="">Chọn nhân viên</option>{staff.filter(row => row.active || row.id === shiftForm.staffId).map(row => <option key={row.id} value={row.id}>{row.name}{!row.active ? ' (đã ngừng)' : ''}</option>)}</select></label>
          <label>Ngày ca<input type="date" required value={shiftForm.date} onChange={event => setShiftForm({ ...shiftForm, date: event.target.value })} /></label>
          <label>Giờ bắt đầu<input type="time" required value={shiftForm.startTime} onChange={event => setShiftForm({ ...shiftForm, startTime: event.target.value })} /></label>
          <label>Giờ kết thúc<input type="time" required value={shiftForm.endTime} onChange={event => setShiftForm({ ...shiftForm, endTime: event.target.value })} /></label>
          <label>Ghi chú ca<input maxLength={500} value={shiftForm.note} onChange={event => setShiftForm({ ...shiftForm, note: event.target.value })} /></label>
          <label>Áp dụng ca<select value={shiftForm.active ? 'active' : 'inactive'} onChange={event => setShiftForm({ ...shiftForm, active: event.target.value === 'active' })}><option value="active">Đang áp dụng</option><option value="inactive">Đã ngừng</option></select></label>
          <div className="domain-toolbar"><button type="button" onClick={() => setShiftForm({ staffId: '', date, startTime: '08:00', endTime: '16:00', note: '', active: true })}>Hủy chỉnh sửa ca</button><button type="submit" className="primary">{busy ? 'Đang lưu…' : 'Lưu ca làm việc'}</button></div>
        </fieldset>
      </form>}
    </section>
  </div>;
}
