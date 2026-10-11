import { useEffect, useRef, useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { usePms } from '../../data/usePms';
import { today } from '../../data/model';
import '../../components/DomainForms.css';

const kinds = { arrival: 'Khách đến', departure: 'Khách rời', stayover: 'Khách lưu trú', dirty: 'Phòng bẩn', checkout: 'Sau trả phòng' };
const statuses = { pending: 'Chờ dọn', in_progress: 'Đang dọn', inspection: 'Đang kiểm tra', completed: 'Đã hoàn tất', cancelled: 'Đã hủy' };
const closed = task => ['completed', 'cancelled'].includes(task.status);

function TaskCard({ task, staff, shifts, canManage, canWrite, busy, act, assignTask, updateTask }) {
  const [staffId, setStaffId] = useState(task.staffId || '');
  const [shiftId, setShiftId] = useState(task.shiftId || '');
  const [note, setNote] = useState(task.note);
  const worker = staff.find(row => row.id === task.staffId);
  const changeStatus = status => act(() => updateTask(task.id, { status, note, revision: task.revision }), `Đã cập nhật phòng ${task.room}: ${statuses[status].toLocaleLowerCase('vi')}.`);
  const availableShifts = shifts.filter(row => row.active && row.staffId === staffId && row.date === task.date);

  return <article className="domain-panel">
    <div className="domain-toolbar"><div><h3>Phòng {task.room}</h3><p>{kinds[task.kind]} · {task.date}</p></div><span>{statuses[task.status]}</span></div>
    <p>Nhân viên: <strong>{worker?.name || 'Chưa phân công'}</strong></p>
    {task.startedAt && <p>Bắt đầu: {new Date(task.startedAt).toLocaleString('vi-VN')}</p>}
    {task.completedAt && <p>Hoàn tất: {new Date(task.completedAt).toLocaleString('vi-VN')}</p>}
    {!closed(task) && canManage && <form onSubmit={event => { event.preventDefault(); act(() => assignTask(task.id, { staffId: staffId || null, shiftId: shiftId || null, revision: task.revision }), `Đã ${staffId ? 'phân công' : 'gỡ phân công'} phòng ${task.room}.`); }}>
      <fieldset className="domain-fields" disabled={busy}>
        <label>Phân công phòng {task.room}<select value={staffId} onChange={event => { setStaffId(event.target.value); setShiftId(''); }}><option value="">Chưa phân công</option>{staff.filter(row => row.active).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label>Ca cho phòng {task.room}<select value={shiftId} onChange={event => setShiftId(event.target.value)} disabled={!staffId}><option value="">Không gắn ca</option>{availableShifts.map(row => <option key={row.id} value={row.id}>{row.startTime} – {row.endTime}</option>)}</select></label>
        <button type="submit" className="primary">Lưu phân công</button>
      </fieldset>
      <p>Đổi phân công sẽ đưa công việc về chờ dọn để người nhận mới bắt đầu lại.</p>
    </form>}
    {closed(task) ? task.note && <p>Ghi chú: {task.note}</p> : canWrite && <>
      <label>Ghi chú phòng {task.room}<textarea maxLength={1000} rows={2} value={note} disabled={busy} onChange={event => setNote(event.target.value)} /></label>
      <div className="domain-toolbar">
        {task.status === 'pending' && <button type="button" className="primary" disabled={busy} onClick={() => changeStatus('in_progress')}>Bắt đầu dọn phòng {task.room}</button>}
        {task.status === 'in_progress' && <button type="button" className="success" disabled={busy} onClick={() => changeStatus('inspection')}>Gửi kiểm tra phòng {task.room}</button>}
        {task.status === 'inspection' && canManage && <><button type="button" className="success" disabled={busy} onClick={() => changeStatus('completed')}>Xác nhận sạch phòng {task.room}</button><button type="button" disabled={busy} onClick={() => changeStatus('in_progress')}>Yêu cầu dọn lại phòng {task.room}</button></>}
        {canManage && <button type="button" disabled={busy} onClick={() => changeStatus('cancelled')}>Hủy công việc phòng {task.room}</button>}
      </div>
      {task.status === 'inspection' && !canManage && <p>Đã gửi kiểm tra. Lễ tân hoặc quản lý sẽ xác nhận phòng sạch.</p>}
    </>}
  </article>;
}

export default function HousekeepingPlan() {
  const pms = usePms();
  return <PlanWorkspace key={`${pms.tenantId}:${pms.settings.timezone}`} pms={pms} />;
}

function PlanWorkspace({ pms }) {
  const { settings, tenantId, housekeepingStaff = [], housekeepingTasks = [],
    access, requestTenant, generateHousekeepingPlan, assignHousekeepingTask, updateHousekeepingTask } = pms;
  const [date, setDate] = useState(today(settings.timezone));
  const [loaded, setLoaded] = useState({ date: '', tasks: [], shifts: [], source: null, reload: -1, error: '' }), [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [reload, setReload] = useState(0);
  const canManage = access('housekeeping.manage').allowed, canWrite = access('housekeeping.write').allowed;
  const requests = useRef(requestTenant);
  useEffect(() => { requests.current = requestTenant; }, [requestTenant]);
  // Provider methods change identity on refresh; the workspace task array is the stable refresh signal.
  useEffect(() => {
    let active = true;
    if (!date) return () => { active = false; };
    const params = new URLSearchParams({ date });
    Promise.all([requests.current('/housekeeping/tasks?' + params), requests.current('/housekeeping/shifts?' + params)])
      .then(([data, shifts]) => { if (active) setLoaded({ date, tasks: data.tasks, shifts: shifts.shifts, source: housekeepingTasks, reload, error: '' }); })
      .catch(err => { if (active) setLoaded({ date, tasks: [], shifts: [], source: housekeepingTasks, reload, error: err.message }); });
    return () => { active = false; };
  }, [date, tenantId, housekeepingTasks, reload]);
  async function act(action, message) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { const result = await action(); setNotice(typeof message === 'function' ? message(result) : message); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  const loading = Boolean(date) && (loaded.date !== date || loaded.source !== housekeepingTasks || loaded.reload !== reload);
  const tasks = loaded.date === date && !loading ? loaded.tasks : [];
  const visible = tasks.filter(task => !status || task.status === status);
  const failure = error || (!loading && loaded.error);

  return <div className="pms-domain-page">
    <header className="domain-toolbar"><div><h1>Kế hoạch dọn phòng</h1><p>{canManage ? 'Lập kế hoạch từ lượt khách đến, khách rời, lưu trú và phòng bẩn.' : 'Công việc được giao cho bạn. Dọn xong cần gửi kiểm tra trước khi xác nhận sạch.'}</p></div></header>
    <section className="domain-panel"><div className="domain-toolbar">
      <label>Ngày kế hoạch<input type="date" required value={date} disabled={busy} onChange={event => { setDate(event.target.value); setNotice(''); }} /></label>
      <label>Lọc trạng thái<select value={status} onChange={event => setStatus(event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button type="button" disabled={busy || loading || !date} onClick={() => setReload(value => value + 1)}><RefreshCw size={16} aria-hidden="true" /> Tải lại công việc</button>
      {canManage && <button type="button" className="primary" disabled={busy || loading || !date} onClick={() => act(() => generateHousekeepingPlan({ date }), result => `Đã lập kế hoạch: thêm ${result.created} công việc. Những công việc đã có được giữ nguyên.`)}><Calendar size={16} aria-hidden="true" /> {busy ? 'Đang xử lý…' : 'Tạo kế hoạch tự động'}</button>}
    </div><p>{tasks.length} công việc · {tasks.filter(task => task.status === 'inspection').length} chờ kiểm tra · {tasks.filter(task => task.status === 'completed').length} hoàn tất</p></section>
    {failure && <div className="domain-error" role="alert"><p>{failure}</p><button type="button" disabled={busy} onClick={() => { setError(''); setReload(value => value + 1); }}>Tải lại phiên bản công việc</button></div>}
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Đang tải công việc buồng phòng…</p> : <div className="domain-grid">
      {visible.map(task => <TaskCard key={`${task.id}:${task.revision}`} task={task} staff={housekeepingStaff} shifts={loaded.shifts} canManage={canManage} canWrite={canWrite} busy={busy} act={act} assignTask={assignHousekeepingTask} updateTask={updateHousekeepingTask} />)}
      {!visible.length && <section className="domain-panel"><h2>Chưa có công việc</h2><p>{status ? 'Không có công việc khớp bộ lọc này.' : canManage ? 'Chọn ngày và tạo kế hoạch tự động để bắt đầu phân công.' : 'Chưa có công việc được giao cho bạn trong ngày này.'}</p></section>}
    </div>}
  </div>;
}
