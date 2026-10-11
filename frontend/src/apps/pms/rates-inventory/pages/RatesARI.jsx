import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import NightlyRates from './NightlyRates';
import { usePms } from '../../data/usePms';
import { today, addDays, money } from '../../data/model';
import '../../components/DomainForms.css';
import '../RatesInventory.css';

export default function RatesARI() {
  const { roomTypes, rates, settings, access, saveRate } = usePms();
  const [error, setError] = useState(''), [busy, setBusy] = useState(''), [notice, setNotice] = useState('');
  const date = today(settings.timezone);
  const writable = access('settings.write', 'ARI_MANAGEMENT', true).allowed;
  const activeTypes = roomTypes.filter(type => type.active !== false);
  const confirmedNotice = notice && Boolean(rates.find(row => row.roomTypeId === notice.typeId && row.date === date)?.stopSell) === notice.stopped;
  async function toggle(type, stopped) {
    if (busy || !writable) return;
    setBusy(type.id); setError(''); setNotice('');
    try { await saveRate({ roomTypeId: type.id, start: date, end: addDays(date, 1), stopSell: !stopped }); setNotice({ typeId: type.id, stopped: !stopped, text: `${type.name}: đã ${stopped ? 'mở' : 'dừng'} bán hôm nay.` }); }
    catch (err) { setError(err.message); } finally { setBusy(''); }
  }
  return <div className="pms-domain-page pms-rates-page">
    <header className="domain-toolbar rates-page-heading"><div><span className="rates-kicker">Giá & Phòng trống</span><h1>Giá cho lịch đặt phòng</h1><p>Kiểm soát giá từng đêm và trạng thái bán của khách sạn.</p></div><Link className="rates-link-button" to="/id/ari"><CalendarDays size={16} aria-hidden="true" /> Mở lịch đặt phòng</Link></header>
    {error && <p className="domain-error" role="alert">{error}</p>}{confirmedNotice && <p className="rates-notice is-success" role="status">{notice.text}</p>}
    <section className="domain-panel rates-table-panel"><div className="rates-section-heading"><div><h2>Trạng thái bán hôm nay</h2><p>{new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })} · Dừng bán sẽ chặn đặt phòng mới cho ngày này.</p></div></div>
      <div className="rates-scroll"><table><thead><tr><th scope="col">Loại phòng</th><th scope="col">Giá / đêm ({settings.currency})</th><th scope="col">Trạng thái bán</th><th scope="col">Thao tác</th></tr></thead><tbody>{activeTypes.map(type => {
        const rate = rates.find(row => row.roomTypeId === type.id && row.date === date);
        const stopped = Boolean(rate?.stopSell);
        return <tr key={type.id}><th scope="row">{type.name}<small className="rates-muted">{rate ? 'Giá từng đêm' : 'Giá cơ bản'}</small></th><td className="rates-price">{money(rate?.price ?? type.price, settings.currency)}</td><td><span className={`rates-badge ${stopped ? 'is-paused' : 'is-active'}`}>{stopped ? 'Dừng bán' : 'Đang bán'}</span></td><td><button className="rates-icon-button" disabled={Boolean(busy) || !writable} onClick={() => toggle(type, stopped)} aria-label={`${stopped ? 'Mở' : 'Dừng'} bán ${type.name} hôm nay`}>{busy === type.id ? 'Đang lưu…' : stopped ? 'Mở bán' : 'Dừng bán'}</button></td></tr>;
      })}{!activeTypes.length && <tr><td colSpan={4} className="rates-empty">Chưa có loại phòng đang hoạt động.</td></tr>}</tbody></table></div>
    </section>
    <NightlyRates />
  </div>;
}
