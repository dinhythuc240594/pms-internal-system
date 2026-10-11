import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { usePms } from '../../data/usePms';
import { today } from '../../data/model';
import { useInventoryQuery } from '../useInventoryQuery';
import InventoryDocuments from '../InventoryDocuments';
import { quantityText } from '../values';
import '../../components/DomainForms.css';
import '../Inventory.css';

export default function InventoryStock() {
  const pms = usePms();
  return <StockWorkspace key={`${pms.tenantId}:${pms.user?.id}`} pms={pms} />;
}

function StockWorkspace({ pms }) {
  const [filters, setFilters] = useState({ warehouseId: '', start: '', end: today(pms.settings.timezone) });
  const [search, setSearch] = useState(''), [lowOnly, setLowOnly] = useState(false), [version, setVersion] = useState(0);
  const masters = useInventoryQuery('/inventory/masters', version);
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ''));
  const report = useInventoryQuery('/inventory/stock?' + query, version);
  const rows = (report.data?.rows || []).filter(row => (!lowOnly || row.lowStock) && `${row.item} ${row.sku}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const summary = report.data?.summary;
  function filter(field, value) { setFilters(previous => ({ ...previous, [field]: value })); }
  return <div className="pms-domain-page pms-inventory">
    <header className="domain-toolbar"><div><h1>Tồn kho & Nhập xuất tồn</h1><p>Theo dõi số lượng đầu kỳ, tăng giảm trong kỳ và tồn hiện tại của từng kho.</p></div><div className="domain-toolbar"><button type="button" className="inventory-icon-button" onClick={() => setVersion(value => value + 1)}><RefreshCw size={16} aria-hidden="true" /> Tải lại báo cáo</button><Link to="/id/inventory/in">Phiếu nhập kho</Link></div></header>
    <section className="domain-panel"><div className="domain-fields"><label>Kho báo cáo<select value={filters.warehouseId} onChange={event => filter('warehouseId', event.target.value)}><option value="">Tất cả kho</option>{(masters.data?.warehouses || []).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label>Từ ngày báo cáo<input type="date" value={filters.start} onChange={event => filter('start', event.target.value)} /></label><label>Đến ngày báo cáo<input type="date" min={filters.start || undefined} max={today(pms.settings.timezone)} value={filters.end} onChange={event => filter('end', event.target.value)} /></label><label>Tìm mặt hàng<input type="search" placeholder="Tên hoặc SKU" value={search} onChange={event => setSearch(event.target.value)} /></label><label className="inventory-checkbox"><input type="checkbox" checked={lowOnly} onChange={event => setLowOnly(event.target.checked)} /> Chỉ xem tồn thấp</label></div></section>
    {masters.error && <p className="domain-error" role="alert">{masters.error}</p>}
    {report.loading && <p role="status">Đang tải số lượng và giá trị tồn kho…</p>}
    {report.error && <div className="domain-error" role="alert"><p>{report.error}</p><button type="button" onClick={report.refresh}>Thử lại báo cáo</button></div>}
    {summary && <><div className="domain-stats"><div>Mặt hàng / kho<strong>{summary.rowCount}</strong></div><div>Tồn cuối kỳ dưới mức tối thiểu<strong>{summary.lowStockCount}</strong></div><div>Giá trị tồn cuối kỳ ({summary.currency})<strong>{quantityText(summary.valuation)}</strong></div></div>
      {summary.reconciled === false && <p className="domain-error" role="alert">Sổ biến động chưa khớp với tồn hiện tại. Tải lại và đối chiếu các phiếu kho trước khi ghi giao dịch mới.</p>}
      <section className="domain-panel"><div className="inventory-scroll"><table><caption>{rows.length} dòng phù hợp. Tồn cuối kỳ và giá vốn theo ngày kết thúc đã chọn; tồn hiện tại phản ánh dữ liệu mới nhất.</caption><thead><tr><th>Kho</th><th>Mặt hàng</th><th>SKU</th><th>Đơn vị</th><th>Tồn đầu kỳ</th><th>Nhập trong kỳ</th><th>Xuất trong kỳ</th><th>Tồn cuối kỳ</th><th>Tồn hiện tại</th><th>Giá vốn TB cuối kỳ</th><th>Giá trị cuối kỳ ({summary.currency})</th><th>Cảnh báo</th></tr></thead><tbody>{rows.map(row => <tr key={`${row.warehouseId}:${row.itemId}`}><td>{row.warehouse}</td><td>{row.item}</td><td>{row.sku || '—'}</td><td>{row.unit || '—'}</td><td>{quantityText(row.openingQuantity)}</td><td>{quantityText(row.received)}</td><td>{quantityText(row.issued)}</td><td>{quantityText(row.closingQuantity)}</td><td>{quantityText(row.quantity)}</td><td>{quantityText(row.unitCost)}</td><td>{quantityText(row.costValue)}</td><td className={row.lowStock ? 'inventory-low' : undefined}>{row.lowStock ? `Tồn thấp · mức tối thiểu ${quantityText(row.minStock)}` : 'Đủ mức tối thiểu'}</td></tr>)}{!rows.length && <tr><td colSpan={12}>Chưa có số liệu phù hợp. Ghi tồn đầu kỳ hoặc phiếu nhập để bắt đầu theo dõi hàng hóa.</td></tr>}</tbody></table></div></section>
    </>}
    <InventoryDocuments kind="all" embedded onChanged={() => setVersion(value => value + 1)} />
  </div>;
}
