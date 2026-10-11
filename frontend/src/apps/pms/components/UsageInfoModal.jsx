import { X, Building2, ShieldCheck, CheckCircle2, LockKeyhole } from 'lucide-react';
import { usePms } from '../data/usePms';

export default function UsageInfoModal({ isOpen, onClose }) {
  const { tenant, quota, features, subscription } = usePms();
  if (!isOpen) return null;
  const suspended = tenant?.status?.toLowerCase() === 'suspended';
  const status = suspended ? 'Khách sạn tạm khóa' : !subscription ? 'Chưa gán gói' : subscription.effectiveActive ? 'Đang hoạt động' : 'Chỉ xem dữ liệu';
  return (
    <div className="pms-usage-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="pms-usage-card" aria-labelledby="pms-usage-title">
        <div className="pms-usage-heading"><div><p>LOHA PMS SYSTEM</p><h2 id="pms-usage-title">Thông tin sử dụng</h2><span>{tenant?.name}</span></div><button type="button" aria-label="Đóng thông tin sử dụng" onClick={onClose}><X size={20} /></button></div>
        <div className="pms-usage-body">
          <div className="pms-usage-plan"><ShieldCheck size={24} aria-hidden="true" /><div><small>GÓI DỊCH VỤ HIỆN TẠI</small><strong>{subscription?.planName || 'Chưa gán gói'}</strong><span>{status}</span></div></div>
          <dl className="pms-usage-quota">
            <div><dt>Phòng đang sử dụng</dt><dd>{quota.rooms.used} <span>/ {quota.rooms.limit === null ? 'Không giới hạn' : quota.rooms.limit}</span></dd></div>
            <div><dt>Tài khoản đang sử dụng</dt><dd>{quota.users.used} <span>/ {quota.users.limit === null ? 'Không giới hạn' : quota.users.limit}</span></dd></div>
            <div><dt>Ngày hết hạn</dt><dd>{subscription?.endDate ? new Date(subscription.endDate).toLocaleDateString('vi-VN') : subscription ? 'Không thời hạn' : 'Chưa gán gói'}</dd></div>
          </dl>
          <h3><Building2 size={17} aria-hidden="true" />Tính năng của khách sạn</h3>
          <ul className="pms-usage-features">{features.map(feature => <li key={feature.code || feature.id}><span aria-hidden="true">{feature.allowed ? <CheckCircle2 size={16} /> : <LockKeyhole size={16} />}</span><span>{feature.name}<small>{feature.allowed ? 'Đã bật' : 'Chưa bật'}</small></span></li>)}</ul>
          {!features.length && <p className="pms-usage-empty">Chưa có thông tin tính năng.</p>}
        </div>
        <div className="pms-usage-footer"><button type="button" onClick={onClose}>Đóng cửa sổ</button></div>
      </section>
    </div>
  );
}
