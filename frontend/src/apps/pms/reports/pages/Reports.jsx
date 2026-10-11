import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, BedDouble, CalendarDays, CircleDollarSign, Info, Moon } from 'lucide-react';
import { usePms } from '../../data/usePms';
import { today, addDays, nights, money as formatMoney } from '../../data/model';
import './Reports.css';

const displayDate = date => date.split('-').reverse().join('/');

export default function Reports() {
  const { rooms, roomTypes, settings, getRevenueReport, getFinancialReport } = usePms();
  const occupancy = useLocation().pathname.endsWith('/occupancy');
  const [selectedCurrency, setSelectedCurrency] = useState(settings.currency);
  const [basis, setBasis] = useState('original');
  const currency = basis === 'base' ? settings.currency : selectedCurrency;
  const money=value=>formatMoney(value,currency);
  const activeRooms=rooms.filter(r=>r.active!==false);
  const [start, setStart] = useState(today(settings.timezone));
  const [end, setEnd] = useState(addDays(today(settings.timezone), 7));
  const valid = start && end && nights(start, end) > 0 && nights(start, end) <= 366;
  const dates = valid ? Array.from({ length: nights(start, end) }, (_, i) => addDays(start, i)) : [];
  
  const [data,setData]=useState(null), [loading,setLoading]=useState(false), [error,setError]=useState(''), [revision,setRevision]=useState(0);
  
  useEffect(() => {
    let mounted = true;
    setData(null);setError('');setLoading(Boolean(valid));
    if (valid) {
      Promise.all([getRevenueReport(start,end,currency,basis),getFinancialReport(start,end,currency,basis)]).then(([forecast,financial])=>{
        if(mounted)setData({forecast:forecast.rows,financial});
      }).catch(err=>{if(mounted)setError(err.message);}).finally(()=>{if(mounted)setLoading(false);});
    }
    return () => { mounted = false; };
  }, [valid, start, end, currency, basis, getRevenueReport, getFinancialReport, revision]);

  const rows = dates.map(date => {
    const row = data?.forecast.find(r => r.date.split('T')[0] === date);
    return row || { date, reserved: 0, reservedRooms: 0, nights: 0, amount: '0.0000' };
  });
  const totalAmount = data?.financial.summary.forecastRoomRevenue;
  const financialRows=new Map(data?.financial.rows.map(row=>[row.date,row])||[]);
  const totalNights = rows.reduce((sum, row) => sum + row.nights, 0);
  const averageOccupancy = valid && activeRooms.length
    ? `${(rows.reduce((sum, row) => sum + row.reservedRooms, 0) / (activeRooms.length * rows.length) * 100).toFixed(1)}%`
    : '—';

  return (
    <div className="pms-original pms-reports">
      <header className="pms-reports-header">
        <div>
          <h1>{occupancy ? 'Hiệu suất phòng' : 'Báo cáo doanh thu phòng'}</h1>
          <p>Theo dõi doanh thu và công suất phòng theo khoảng thời gian.</p>
        </div>
        <span className="pms-reports-demo" role="status"><Info size={14} aria-hidden="true" /> {loading?'Đang tải…':data?'Dữ liệu máy chủ':'Chưa tải dữ liệu'}</span>
      </header>

      <nav className="pms-reports-tabs" aria-label="Loại báo cáo">
        <Link to="/id/reports/revenue" aria-current={!occupancy ? 'page' : undefined}>
          <CircleDollarSign size={18} aria-hidden="true" /> Doanh thu phòng
        </Link>
        <Link to="/id/reports/occupancy" aria-current={occupancy ? 'page' : undefined}>
          <BarChart3 size={18} aria-hidden="true" /> Hiệu suất phòng
        </Link>
      </nav>

      <section className="pms-reports-filter" aria-label="Bộ lọc thời gian">
        <div className="pms-reports-filter-title"><CalendarDays size={18} aria-hidden="true" /> Khoảng thời gian</div>
        <div className="pms-reports-date-fields">
          <label htmlFor="report-start">Từ ngày
            <input id="report-start" type="date" value={start} onInput={e => setStart(e.target.value)} onChange={e => setStart(e.target.value)} aria-invalid={!valid} aria-describedby={!valid ? 'report-date-error' : undefined} />
          </label>
          <label htmlFor="report-end">Đến ngày
            <input id="report-end" type="date" value={end} onInput={e => setEnd(e.target.value)} onChange={e => setEnd(e.target.value)} aria-invalid={!valid} aria-describedby={!valid ? 'report-date-error report-date-note' : 'report-date-note'} />
          </label>
          <label htmlFor="report-basis">Cơ sở tiền tệ
            <select id="report-basis" value={basis} onChange={e => setBasis(e.target.value)}><option value="original">Tiền gốc của giao dịch</option><option value="base">Tiền cơ sở đã chốt ({settings.currency})</option></select>
          </label>
          <label htmlFor="report-currency">Tiền tệ
            <select id="report-currency" value={currency} disabled={basis === 'base'} onChange={e => setSelectedCurrency(e.target.value)}>{['VND', 'USD'].map(code => <option key={code}>{code}</option>)}</select>
          </label>
        </div>
        <p id="report-date-note" className="pms-reports-filter-note">Không bao gồm ngày kết thúc. Số liệu cập nhật khi đổi ngày.</p>
      </section>

      {!valid && <p id="report-date-error" role="alert" className="pms-reports-error">Chọn khoảng ngày từ 1 đến 366 ngày.</p>}
      {error&&<p role="alert" className="pms-reports-error">{error} <button onClick={()=>setRevision(v=>v+1)}>Thử lại</button></p>}

      <div className="pms-reports-summary">
        <SummaryCard
          icon={occupancy ? <BedDouble size={20} aria-hidden="true" /> : <CircleDollarSign size={20} aria-hidden="true" />}
          label={occupancy ? 'Tổng số phòng' : 'Tiền phòng dự kiến'}
          value={occupancy ? activeRooms.length : data ? money(totalAmount) : '—'}
          description={occupancy ? 'Tại khách sạn đang chọn' : 'Trong khoảng thời gian đã chọn'}
        />
        <SummaryCard
          icon={occupancy ? <BarChart3 size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
          label={occupancy ? 'Công suất đặt phòng trung bình' : 'Tổng số đêm phòng'}
          value={data?(occupancy ? averageOccupancy : totalNights):'—'}
          description={occupancy ? 'Số phòng đã đặt / đang ở, gồm mọi tiền tệ' : 'Không gồm booking đã hủy'}
        />
        <SummaryCard
          icon={<CalendarDays size={20} aria-hidden="true" />}
          label="Thời gian báo cáo"
          value={valid ? `${rows.length} ngày` : '—'}
          description={valid ? `${displayDate(start)} – ${displayDate(addDays(end, -1))}` : 'Chọn khoảng ngày hợp lệ'}
        />
      </div>

      {data&&<div className="pms-reports-summary" aria-label="Chỉ số tài chính">
        <SummaryCard icon={<CircleDollarSign size={20}/>} label="Doanh thu ghi nhận" value={money(data.financial.summary.realizedRevenue)} description="Hóa đơn lưu trú/POS đã chốt trong kỳ"/>
        <SummaryCard icon={<CircleDollarSign size={20}/>} label="Thực thu từ khách" value={money(data.financial.summary.netReceipts)} description="Tiền khách thanh toán trừ hoàn tiền trong kỳ"/>
        <SummaryCard icon={<BedDouble size={20}/>} label="Giá phòng trung bình (ADR)" value={money(data.financial.summary.adr)} description={`${data.financial.summary.servedNights} đêm đã phục vụ, trước ngày kinh doanh hiện tại`}/>
        <SummaryCard icon={<CircleDollarSign size={20}/>} label="Tiền cọc hiện tại" value={money(data.financial.snapshot.deposits)} description="Đã thu cho các booking chưa nhận phòng"/>
        <SummaryCard icon={<CircleDollarSign size={20}/>} label="Công nợ hiện tại" value={money(data.financial.snapshot.debt)} description="Số tiền còn phải thu của booking/POS đang có dư nợ"/>
        <SummaryCard icon={<CalendarDays size={20}/>} label="Thời điểm số dư hiện tại" value={new Date(data.financial.snapshot.asOf).toLocaleTimeString('vi-VN',{timeZone:settings.timezone})} description={new Date(data.financial.snapshot.asOf).toLocaleDateString('vi-VN',{timeZone:settings.timezone})}/>
      </div>}

      <section className="pms-reports-table-card" aria-labelledby="report-table-title">
        <div className="pms-reports-table-heading">
          <h2 id="report-table-title">Chi tiết theo ngày</h2>
          {valid && <span className="pms-reports-count">{rows.length} ngày</span>}
        </div>
        <div className="pms-reports-table-scroll" tabIndex={0} role="region" aria-label="Bảng báo cáo theo ngày">
          <table>
            <thead>
              <tr>
                <th scope="col">Ngày</th>
                <th scope="col" className="pms-reports-number">{occupancy ? 'Phòng đã đặt / đang ở' : 'Số đêm phòng'}</th>
                <th scope="col" className="pms-reports-number">{occupancy ? 'Công suất đặt phòng' : 'Tiền phòng dự kiến'}</th>
                {!occupancy&&<><th scope="col" className="pms-reports-number">Doanh thu ghi nhận</th><th scope="col" className="pms-reports-number">Thực thu từ khách</th></>}
              </tr>
            </thead>
            <tbody>
              {data&&rows.map(row => (
                <tr key={row.date}>
                  <td><time dateTime={row.date}>{displayDate(row.date)}</time></td>
                  <td className="pms-reports-number">{occupancy ? `${row.reservedRooms} / ${activeRooms.length}` : row.nights}</td>
                  <td className="pms-reports-number pms-reports-value">
                    {occupancy ? <span className="pms-reports-occupancy">{activeRooms.length ? `${(row.reservedRooms / activeRooms.length * 100).toFixed(1)}%` : '—'}</span> : money(row.amount)}
                  </td>
                  {!occupancy&&<><td className="pms-reports-number">{money(financialRows.get(row.date)?.realizedRevenue||'0')}</td><td className="pms-reports-number">{money(financialRows.get(row.date)?.netReceipts||'0')}</td></>}
                </tr>
              ))}
              {!data&&<tr><td colSpan={occupancy?3:5} className="pms-reports-empty">{!valid?'Chọn khoảng ngày hợp lệ để xem báo cáo.':loading?'Đang tải số liệu…':'Chưa tải được số liệu.'}</td></tr>}
            </tbody>
            {data && <tfoot><tr>
              <th scope="row">{occupancy ? 'Trung bình trong kỳ' : 'Tổng cộng'}</th>
              <td className="pms-reports-number">{occupancy ? `${activeRooms.length} phòng` : totalNights}</td>
              <td className="pms-reports-number pms-reports-value">{occupancy ? averageOccupancy : money(totalAmount)}</td>
              {!occupancy&&<><td className="pms-reports-number">{money(data.financial.summary.realizedRevenue)}</td><td className="pms-reports-number">{money(data.financial.summary.netReceipts)}</td></>}
            </tr></tfoot>}
          </table>
        </div>
      </section>

      {data&&<section className="pms-reports-summary" aria-label="Đối soát sổ quỹ" style={{marginTop:16}}>
        <SummaryCard label="Số dư đầu kỳ" value={money(data.financial.summary.opening)} description="Tổng số dư ledger trước ngày bắt đầu"/>
        <SummaryCard label="Thu vào quỹ" value={money(data.financial.summary.income)} description="Các bút toán tăng quỹ trong kỳ"/>
        <SummaryCard label="Chi ra quỹ" value={money(data.financial.summary.outflow)} description="Các bút toán giảm quỹ trong kỳ"/>
        <SummaryCard label="Số dư cuối kỳ" value={money(data.financial.summary.closing)} description="Đầu kỳ + thu − chi; chuyển quỹ được đối ứng"/>
      </section>}

      {occupancy && <section className="pms-reports-room-types" aria-label="Hạng phòng">
        <span>Hạng phòng</span>
        {roomTypes.map(type => <span className="pms-reports-room-type" key={type.id}>{type.name} <strong>{rooms.filter(room => room.typeId === type.id).length}</strong></span>)}
      </section>}

      <p className="pms-reports-note"><Info size={16} aria-hidden="true" /><span>Doanh thu phòng dự kiến theo giá từng đêm đã chốt; chưa gồm dịch vụ, thuế và thanh toán. {basis === 'base' ? 'Số tiền cơ sở dùng tỷ giá đã lưu trên từng giao dịch, không tính lại theo tỷ giá hiện tại.' : 'Mỗi báo cáo chỉ tổng hợp một loại tiền gốc.'}</span></p>
      {data&&<div className="pms-reports-note"><Info size={16} aria-hidden="true"/><span>{Object.values(data.financial.definitions||{}).join(' ')}</span></div>}
    </div>
  );
}

function SummaryCard({ icon, label, value, description }) {
  return <div className="pms-reports-summary-card">
    <div className="pms-reports-summary-top"><span>{label}</span><span className="pms-reports-summary-icon">{icon}</span></div>
    <strong className="pms-reports-summary-value">{value}</strong>
    <p>{description}</p>
  </div>;
}
