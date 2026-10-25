import { t as tUi, useI18n } from '../../../../shared/i18n/useI18n.js';
import { useRef, useState } from 'react';
import { Save } from 'lucide-react';
import { usePms } from '../../data/usePms';
import { useInventoryQuery } from '../useInventoryQuery';
import InventoryDocuments, { InventoryLines } from '../InventoryDocuments';
import { quantityText } from '../values';
import '../../components/DomainForms.css';
import '../Inventory.css';

const definitions = {
  warehouses: { title: 'Danh sách kho', description: 'Kho dùng để ghi nhận hàng nhập, hàng xuất và chuyển kho.', fields: [{ key: 'name', label: 'Tên kho', required: true }, { key: 'location', label: 'Vị trí' }, { key: 'isDefault', label: 'Kho mặc định', type: 'checkbox' }] },
  itemCategories: { title: 'Danh mục mặt hàng', description: 'Nhóm hàng hóa để sắp xếp và tra cứu.', fields: [{ key: 'name', label: 'Tên danh mục', required: true }, { key: 'parentId', label: 'Danh mục cha', catalog: 'itemCategories' }, { key: 'sortOrder', label: 'Thứ tự', type: 'number', integer: true, default: '0' }] },
  items: { title: 'Hàng hóa & Vật tư', description: 'Giá vốn ban đầu chỉ là cấu hình mặt hàng; tồn thực tế được ghi qua phiếu kho.', fields: [{ key: 'name', label: 'Tên mặt hàng', required: true }, { key: 'sku', label: 'Mã hàng / SKU', required: true }, { key: 'categoryId', label: 'Danh mục', catalog: 'itemCategories' }, { key: 'unit', label: 'Đơn vị tính', required: true }, { key: 'costPrice', label: 'Giá vốn cấu hình', type: 'number', default: '0' }, { key: 'sellingPrice', label: 'Giá bán', type: 'number', default: '0' }, { key: 'minStock', label: 'Ngưỡng cảnh báo tồn', type: 'number', default: '0' }] },
  suppliers: { title: 'Nhà cung cấp', description: 'Thông tin đối tác gắn với các phiếu nhập kho.', fields: [{ key: 'name', label: 'Tên nhà cung cấp', required: true }, { key: 'contactPerson', label: 'Người liên hệ' }, { key: 'phone', label: 'Điện thoại', type: 'tel' }, { key: 'email', label: 'Email', type: 'email' }, { key: 'address', label: 'Địa chỉ' }, { key: 'taxCode', label: 'Mã số thuế' }, { key: 'bankName', label: 'Ngân hàng' }, { key: 'bankAccount', label: 'Số tài khoản ngân hàng' }, { key: 'notes', label: 'Ghi chú', type: 'textarea' }] },
};

function MasterEditor({ catalog, data, pms, refreshed }) {
  useI18n();
  const definition = definitions[catalog];
  const blank = () => ({ active: true, ...Object.fromEntries(definition.fields.map(field => [field.key, field.default ?? (field.type === 'checkbox' ? false : '')])) });
  const [draft, setDraft] = useState(blank), [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const inFlight = useRef(false);
  const canWrite = pms.access('inventory.write').allowed;
  const rows = (data[catalog] || []).filter(row => `${row.name} ${row.sku || ''}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const change = (key, value) => setDraft(previous => ({ ...previous, [key]: value }));
  async function save(input, clear = false) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    try { await pms.saveInventoryMaster(catalog, input); if (clear) setDraft(blank()); setNotice('Đã lưu danh mục kho.'); refreshed(); }
    catch (err) { setError(err.message); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function submit(event) {
    event.preventDefault();
    const input = { ...(draft.id ? { id: draft.id } : {}), active: draft.active,
      ...Object.fromEntries(definition.fields.map(field => [field.key, field.integer ? Number(draft[field.key]) : field.catalog ? draft[field.key] || null : draft[field.key]])) };
    save(input, true);
  }
  const columns = definition.fields.filter(field => !['textarea', 'checkbox'].includes(field.type));
  function shown(row, field) {
    const value = row[field.key];
    if (field.catalog) return data[field.catalog]?.find(option => option.id === value)?.name || '—';
    return field.type === 'number' ? quantityText(value) : value || '—';
  }
  return <section className="domain-panel">
    <div className="domain-toolbar"><div><h2>{definition.title}</h2><p>{definition.description}</p></div><label>Tìm {definition.title.toLocaleLowerCase('vi')}<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
    {error && <p className="domain-error" role="alert">{error}</p>}{notice && <p className="inventory-positive" role="status">{notice}</p>}
    <div className="inventory-scroll"><table><thead><tr>{columns.map(field => <th key={field.key}>{field.label}</th>)}{catalog === 'warehouses' && <th>Mặc định</th>}<th>{tUi("common.status")}</th>{canWrite && <th>{tUi("common.actions")}</th>}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>{columns.map(field => <td key={field.key}>{shown(row, field)}</td>)}{catalog === 'warehouses' && <td>{row.isDefault ? 'Có' : '—'}</td>}<td>{row.active !== false ? 'Đang sử dụng' : tUi("hk.stopped")}</td>{canWrite && <td><button type="button" disabled={busy} aria-label={`Sửa ${row.name}`} onClick={() => { setDraft({ ...blank(), ...row }); setError(''); setNotice(''); }}>{tUi("common.edit")}</button><button type="button" disabled={busy} onClick={() => save({ id: row.id, active: row.active === false })}>{row.active === false ? tUi("common.activate") : 'Ngừng sử dụng'}</button></td>}</tr>)}{!rows.length && <tr><td colSpan={columns.length + (canWrite ? 2 : 1) + (catalog === 'warehouses' ? 1 : 0)}>Chưa có danh mục phù hợp.</td></tr>}</tbody></table></div>
    {canWrite && <form className="inventory-form" onSubmit={submit}><fieldset disabled={busy}><div className="domain-toolbar"><h3>{draft.id ? 'Chỉnh sửa' : 'Thêm mới'} {definition.title.toLocaleLowerCase('vi')}</h3><button type="button" onClick={() => { setDraft(blank()); setNotice(''); setError(''); }}>Tạo bản ghi mới</button></div><div className="domain-fields">{definition.fields.map(field => {
      const options = (data[field.catalog] || []).filter(option => option.id !== draft.id && (option.active !== false || option.id === draft[field.key]));
      return <label key={field.key} className={field.type === 'checkbox' ? 'inventory-checkbox' : undefined}>{field.label}{field.catalog ? <select value={draft[field.key] || ''} onChange={event => change(field.key, event.target.value)}><option value="">Không chọn</option>{options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select> : field.type === 'textarea' ? <textarea maxLength={500} rows={3} value={draft[field.key]} onChange={event => change(field.key, event.target.value)} /> : field.type === 'checkbox' ? <input type="checkbox" checked={draft[field.key]} onChange={event => change(field.key, event.target.checked)} /> : <input type={field.type || 'text'} required={field.required} min={field.type === 'number' ? '0' : undefined} step={field.type === 'number' ? field.integer ? '1' : '0.0001' : undefined} maxLength={field.type !== 'number' ? field.key === 'address' ? 500 : ['sku', 'unit'].includes(field.key) ? 80 : 160 : undefined} value={draft[field.key]} onChange={event => change(field.key, event.target.value)} />}</label>;
    })}<label>Trạng thái bản ghi<select value={draft.active ? 'active' : 'inactive'} onChange={event => change('active', event.target.value === 'active')}><option value="active">Đang sử dụng</option><option value="inactive">Ngừng sử dụng</option></select></label></div><div className="domain-toolbar"><button type="button" onClick={() => setDraft(blank())}>{tUi("common.cancelEdit")}</button><button type="submit" className="primary inventory-icon-button"><Save size={16} aria-hidden="true" /> {busy ? tUi("common.saving") : 'Lưu danh mục'}</button></div></fieldset></form>}
  </section>;
}

function ServiceStockEditor({ data, pms, refreshed }) {
  useI18n();
  const blank = () => ({ serviceId: '', warehouseId: '', active: true, lines: [{ key: crypto.randomUUID(), itemId: '', quantity: '' }] });
  const [draft, setDraft] = useState(blank), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const inFlight = useRef(false);
  const canWrite = pms.access('inventory.write').allowed;
  const services = pms.services || [], recipes = data.serviceStockLinks || [];
  const warehouses = (data.warehouses || []).filter(row => row.active !== false), items = (data.items || []).filter(row => row.active !== false);
  async function save(event) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    try { await pms.saveServiceStockLink({ serviceId: draft.serviceId, warehouseId: draft.warehouseId, active: draft.active, lines: draft.lines.map(line => ({ itemId: line.itemId, quantity: line.quantity })) }); setDraft(blank()); setNotice('Đã lưu định mức xuất kho của dịch vụ.'); refreshed(); }
    catch (err) { setError(err.message); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <section className="domain-panel"><h2>Định mức kho cho dịch vụ POS</h2><p>Mỗi đơn vị dịch vụ bán ra sẽ xuất các mặt hàng bên dưới từ kho đã chọn khi hóa đơn POS ghi sổ. Bản nháp không trừ kho. Hoàn tiền được ghi riêng với hàng trả lại.</p>
    {error && <p className="domain-error" role="alert">{error}</p>}{notice && <p role="status" className="inventory-positive">{notice}</p>}
    <div className="inventory-scroll"><table><thead><tr><th>{tUi("rooms.services")}</th><th>Kho</th><th>Định mức cho một đơn vị dịch vụ</th><th>{tUi("common.status")}</th>{canWrite && <th>{tUi("common.actions")}</th>}</tr></thead><tbody>{recipes.map(row => <tr key={row.id}><td>{services.find(service => service.id === row.serviceId)?.name || row.serviceId}</td><td>{data.warehouses.find(warehouse => warehouse.id === row.warehouseId)?.name || row.warehouseId}</td><td className="inventory-wrap">{row.lines.map(line => `${data.items.find(item => item.id === line.itemId)?.name || line.itemId}: ${quantityText(line.quantity)}`).join('; ')}</td><td>{row.active ? tUi("hk.applying") : tUi("hk.stopped")}</td>{canWrite && <td><button type="button" disabled={busy} onClick={() => setDraft({ serviceId: row.serviceId, warehouseId: row.warehouseId, active: row.active, lines: row.lines.map(line => ({ ...line, key: crypto.randomUUID() })) })}>Sửa định mức</button></td>}</tr>)}{!recipes.length && <tr><td colSpan={canWrite ? 5 : 4}>Chưa có dịch vụ được liên kết kho.</td></tr>}</tbody></table></div>
    {canWrite && <form className="inventory-form" onSubmit={save}><fieldset disabled={busy}><h3>Thiết lập định mức</h3><div className="domain-fields"><label>Dịch vụ POS<select required value={draft.serviceId} onChange={event => setDraft(previous => ({ ...previous, serviceId: event.target.value }))}><option value="">Chọn dịch vụ</option>{services.filter(row => row.active !== false || row.id === draft.serviceId).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label>Kho xuất dịch vụ<select required value={draft.warehouseId} onChange={event => setDraft(previous => ({ ...previous, warehouseId: event.target.value }))}><option value="">Chọn kho</option>{warehouses.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label>Áp dụng định mức<select value={draft.active ? 'active' : 'inactive'} onChange={event => setDraft(previous => ({ ...previous, active: event.target.value === 'active' }))}><option value="active">{tUi("hk.applying")}</option><option value="inactive">{tUi("hk.stopped")}</option></select></label></div><InventoryLines maxLines={100} kind="issue" lines={draft.lines} onChange={lines => setDraft(previous => ({ ...previous, lines }))} items={items} /><div className="domain-toolbar"><button type="button" onClick={() => setDraft(blank())}>{tUi("common.cancelEdit")}</button><button type="submit" className="primary inventory-icon-button" disabled={!services.length || !warehouses.length || !items.length}><Save size={16} aria-hidden="true" /> {busy ? tUi("common.saving") : 'Lưu định mức kho'}</button></div></fieldset></form>}
  </section>;
}

export default function InventorySettings({ catalog = 'warehouses' }) {
  const pms = usePms();
  return <SettingsWorkspace key={`${pms.tenantId}:${pms.user?.id}:${catalog}`} pms={pms} catalog={catalog} />;
}

function SettingsWorkspace({ pms, catalog }) {
  useI18n();
  const masters = useInventoryQuery('/inventory/masters');
  const [data, setData] = useState(null);
  // Keep sibling editor drafts mounted while refreshing their shared catalogs.
  if (masters.data && masters.data !== data) setData(masters.data);
  if (catalog === 'opening') return <InventoryDocuments kind="opening" embedded />;
  return <div className="pms-domain-page pms-inventory">
    {masters.loading && <p role="status">Đang tải danh mục kho…</p>}
    {masters.error && <div className="domain-error" role="alert"><p>{masters.error}</p><button type="button" onClick={masters.refresh}>{tUi("common.retry")}</button></div>}
    {!pms.access('inventory.write').allowed && <p role="status">Danh mục kho đang ở chế độ xem. Bạn chưa có quyền chỉnh sửa.</p>}
    {data && (catalog === 'service_stock' ? <ServiceStockEditor data={data} pms={pms} refreshed={masters.refresh} /> : <><MasterEditor catalog={catalog} data={data} pms={pms} refreshed={masters.refresh} />{catalog === 'items' && <MasterEditor catalog="itemCategories" data={data} pms={pms} refreshed={masters.refresh} />}</>)}
  </div>;
}
