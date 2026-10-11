import React from 'react';
import { Link } from 'react-router-dom';
import { usePms } from '../../data/usePms';
import { today, money } from '../../data/model';
import { Users, LogIn, LogOut, Percent, Clock, CheckCircle2, AlertCircle, ArrowUpRight, CalendarDays } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { settings, getDashboardReport } = usePms();
  const date = today(settings.timezone);
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [revision, setRevision] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    setData(null);
    getDashboardReport(date).then(res => {
      if (mounted) setData(res);
    }).catch(err => {
      if (mounted) setError(err.message);
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [date, getDashboardReport, revision]);

  const { arriving = '—', departing = '—', occupied = '—', activeRooms = 0, chart = [], arrivalBookings = [], departureBookings = [] } = data || {};
  const alerts = data?.alerts;
  const hasFinance = Boolean(data?.financial);

  return (
    <div className="pms-dashboard">
      <div className="pms-dashboard-heading">
        <div>
          <p className="pms-dashboard-eyebrow">Vận hành khách sạn</p>
          <h1>Tổng quan hôm nay</h1>
          <p className="pms-dashboard-subtitle"><CalendarDays size={14} aria-hidden="true" /> Ngày <time dateTime={date}>{date.split('-').reverse().join('/')}</time></p>
        </div>
      </div>

      {error && <div role="alert" className="pms-dashboard-error"><AlertCircle size={18} aria-hidden="true" /><span>{error}</span><button type="button" onClick={() => setRevision(v => v + 1)}>Thử lại</button></div>}

      <dl className="pms-dashboard-metrics" aria-busy={loading}>
        <MetricCard title="Đang chờ nhận phòng" value={String(arriving)} unit="phòng" detail="Chờ nhận hôm nay" icon={<LogIn size={20} />} />
        <MetricCard title="Đang chờ trả phòng" value={String(departing)} unit="phòng" detail="Dự kiến trả hôm nay" icon={<LogOut size={20} />} />
        <MetricCard title="Phòng đang có khách" value={String(occupied)} unit="phòng" detail="Đã nhận phòng" icon={<Users size={20} />} />
        <MetricCard title="Công suất phòng" value={data ? `${Number(data.occupancy).toFixed(1)}%` : '—'} detail={data ? `${occupied}/${activeRooms} phòng đang sử dụng` : loading ? 'Đang tải' : 'Chưa có số liệu'} icon={<Percent size={20} />} highlight />
      </dl>

      <p role="status" className="pms-dashboard-sync">
        {loading ? 'Đang tải số liệu…' : data ? <><CheckCircle2 size={14} aria-hidden="true" /> Số liệu phòng được đồng bộ từ máy chủ.</> : 'Chưa tải được số liệu.'}
      </p>

      {data && <>
        <div className="pms-dashboard-overview">
          <ChartPanel chart={chart} hasFinance={hasFinance} currency={data.currency} />
          <section className="pms-dashboard-panel pms-dashboard-tasks" aria-labelledby="dashboard-tasks-title">
            <div className="pms-dashboard-panel-heading"><div><h2 id="dashboard-tasks-title">Cần xử lý ngay</h2><p>Các việc đang chờ trong hôm nay</p></div><Clock size={18} aria-hidden="true" /></div>
            <div className="pms-dashboard-task-list">
              {alerts?.dirtyRooms.length > 0 && <TaskItem icon={<AlertCircle size={18} />} title={`${alerts.dirtyRooms.length} phòng bẩn chưa dọn`} desc={'Phòng ' + alerts.dirtyRooms.map(r => r.number).join(', ')} tone="danger" to="/id/housekeeping/status" />}
              {alerts?.inspectionRooms.length > 0 && <TaskItem icon={<CheckCircle2 size={18} />} title={`${alerts.inspectionRooms.length} phòng chờ kiểm tra`} desc={'Phòng ' + alerts.inspectionRooms.map(r => r.number).join(', ')} to="/id/housekeeping/status" />}
              {alerts?.overdueDepartures.length > 0 && <TaskItem icon={<Clock size={18} />} title={`${alerts.overdueDepartures.length} đặt phòng quá ngày trả`} desc={alerts.overdueDepartures.map(b => b.guest).join(', ')} tone="warning" to="/id/reservations" />}
              {alerts?.pendingArrivals.length > 0 && <TaskItem icon={<Users size={18} />} title={`${alerts.pendingArrivals.length} đặt phòng đến hôm nay`} desc={alerts.pendingArrivals.map(b => b.guest).join(', ')} to="/id/reservations" />}
              {!Object.values(alerts || {}).some(rows => rows.length) && <div className="pms-dashboard-empty"><CheckCircle2 size={24} aria-hidden="true" /><p>Không có việc cần xử lý.</p></div>}
            </div>
          </section>
        </div>

        <div className="pms-dashboard-bookings">
          <ListContainer title="Đang chờ nhận phòng" count={arrivalBookings.length} icon={<LogIn size={18} />}>
            {arrivalBookings.map(b => <ListItem key={b.id} name={b.guest} bookingId={b.id} room={'Phòng ' + b.rooms.join(', ')} time={settings.checkInTime} status={b.balance !== undefined ? 'Công nợ: ' + money(b.balance, b.currency) : 'Chờ nhận phòng'} action="Xem đặt phòng" />)}
            {!arrivalBookings.length && <p className="pms-dashboard-list-empty">Không có đặt phòng trong danh sách.</p>}
          </ListContainer>
          <ListContainer title="Đang chờ trả phòng" count={departureBookings.length} icon={<LogOut size={18} />}>
            {departureBookings.map(b => <ListItem key={b.id} name={b.guest} bookingId={b.id} room={'Phòng ' + b.rooms.join(', ')} time={settings.checkOutTime} status={b.balance !== undefined ? 'Công nợ: ' + money(b.balance, b.currency) : 'Chờ trả phòng'} action="Xem thanh toán" />)}
            {!departureBookings.length && <p className="pms-dashboard-list-empty">Không có đặt phòng trong danh sách.</p>}
          </ListContainer>
        </div>
      </>}
    </div>
  );
}

const MetricCard = ({ title, value, unit, detail, icon, highlight }) => (
  <div className={`pms-dashboard-metric${highlight ? ' pms-dashboard-metric-highlight' : ''}`}>
    <dt className="pms-dashboard-metric-top"><span>{title}</span><span className="pms-dashboard-metric-icon" aria-hidden="true">{icon}</span></dt>
    <dd className="pms-dashboard-metric-value"><strong>{value}</strong>{unit && <span>{unit}</span>}</dd>
    <dd className="pms-dashboard-metric-detail">{detail}</dd>
  </div>
);

function ChartPanel({ chart, hasFinance, currency }) {
  const maximumRevenue = Math.max(1, ...chart.map(row => Number(row.realizedRevenue || 0)));
  return (
    <section className="pms-dashboard-panel pms-dashboard-chart-panel" aria-labelledby="dashboard-chart-title">
      <div className="pms-dashboard-panel-heading">
        <div><h2 id="dashboard-chart-title">{hasFinance ? 'Doanh thu & công suất' : 'Công suất phòng'}</h2><p>7 ngày gần nhất{hasFinance ? ` · ${currency}` : ''}</p></div>
        <Link className="pms-dashboard-text-link" to={hasFinance ? '/id/reports/revenue' : '/id/room-diagram'}>Chi tiết <ArrowUpRight size={14} aria-hidden="true" /></Link>
      </div>
      <div className="pms-dashboard-chart-content">
        <div className="pms-dashboard-chart-legend">
          {hasFinance && <span><i className="pms-dashboard-revenue-key" aria-hidden="true" />Doanh thu ghi nhận</span>}
          <span><i className="pms-dashboard-occupancy-key" aria-hidden="true" />Công suất phòng</span>
        </div>
        <div className="pms-dashboard-chart" role="img" aria-label={`${hasFinance ? 'Biểu đồ doanh thu ghi nhận và công suất' : 'Biểu đồ công suất'} từng ngày; số liệu chi tiết có trong bảng bên dưới.`}>
          {chart.map(row => <div className="pms-dashboard-chart-column" key={row.date} title={`${row.date}: công suất ${Number(row.occupancy).toFixed(1)}%${hasFinance ? ', doanh thu ghi nhận ' + money(row.realizedRevenue, currency) : ''}`}>
            {hasFinance && <div className="pms-dashboard-revenue-bar" style={{ height: `${Math.max(0, Number(row.realizedRevenue) / maximumRevenue * 100)}%` }} />}
            <div className="pms-dashboard-occupancy-bar" style={{ height: `${Math.min(100, Number(row.occupancy))}%` }} />
          </div>)}
        </div>
        <div className="pms-dashboard-chart-dates" aria-hidden="true">{chart.map(row => <span key={row.date}>{row.date.slice(5).split('-').reverse().join('/')}</span>)}</div>
        <p className="pms-dashboard-chart-note">{hasFinance ? 'Doanh thu ghi nhận từ hóa đơn đã chốt. ' : ''}Công suất theo số phòng đã phục vụ; hôm nay tính phòng đang có khách.</p>
        <details className="pms-dashboard-chart-details">
          <summary>Xem số liệu từng ngày</summary>
          <div className="pms-dashboard-chart-table-wrap" role="region" aria-label="Số liệu biểu đồ theo ngày" tabIndex={0}>
            <table><caption>Chi tiết số liệu trong biểu đồ</caption><thead><tr><th scope="col">Ngày</th><th scope="col">Phòng có khách</th><th scope="col">Công suất</th>{hasFinance && <th scope="col">Doanh thu ghi nhận</th>}</tr></thead>
              <tbody>{chart.map(row => <tr key={row.date}><th scope="row">{row.date.split('-').reverse().join('/')}</th><td>{row.occupied}/{row.capacity}</td><td>{Number(row.occupancy).toFixed(1)}%</td>{hasFinance && <td>{money(row.realizedRevenue, currency)}</td>}</tr>)}</tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}

const TaskItem = ({ icon, title, desc, tone = 'info', to }) => (
  <Link className="pms-dashboard-task" to={to}>
    <span className={`pms-dashboard-task-icon pms-dashboard-task-${tone}`} aria-hidden="true">{icon}</span>
    <span className="pms-dashboard-task-copy"><strong>{title}</strong><span>{desc}</span></span>
    <ArrowUpRight size={14} className="pms-dashboard-task-arrow" aria-hidden="true" />
  </Link>
);

const ListContainer = ({ title, count, icon, children }) => (
  <section className="pms-dashboard-panel pms-dashboard-booking-panel" aria-label={title}>
    <div className="pms-dashboard-panel-heading">
      <div className="pms-dashboard-list-title"><span aria-hidden="true">{icon}</span><h2>{title}</h2><span className="pms-dashboard-count">{count}</span></div>
      <Link className="pms-dashboard-text-link" to="/id/reservations">Xem tất cả <ArrowUpRight size={14} aria-hidden="true" /></Link>
    </div>
    <div className="pms-dashboard-booking-list">{children}</div>
  </section>
);

const ListItem = ({ name, bookingId, room, time, status, action }) => (
  <div className="pms-dashboard-booking">
    <div className="pms-dashboard-guest"><span className="pms-dashboard-avatar" aria-hidden="true">{name.charAt(0)}</span><div><strong>{name}</strong><span className="pms-dashboard-room">{room}</span><span className="pms-dashboard-booking-id">#{bookingId}</span></div></div>
    <div className="pms-dashboard-booking-action"><div className="pms-dashboard-booking-status"><span><Clock size={12} aria-hidden="true" />{time}</span><p>{status}</p></div><Link to="/id/reservations" aria-label={`${action}: ${name}`}>{action}</Link></div>
  </div>
);
