import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePms } from '../../data/usePms';
import { Search, Plus } from 'lucide-react';

export default function Rooms() {
  const { rooms, roomTypes, access } = usePms();
  const navigate = useNavigate();
  const mockRooms = rooms.map(r => ({ ...r, name: 'Phòng ' + r.id, type: roomTypes.find(t => t.id === r.typeId)?.name, floor: 'Tầng ' + r.id.slice(0, 1), status: ({clean:'Sạch sẽ',dirty:'Phòng bẩn',inspection:'Đang kiểm tra',maintenance:'Bảo trì / hỏng'})[r.condition] }));

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>Quản lý Phòng vật lý</h1>
        <button disabled={!access('settings.write').allowed} onClick={() => navigate('/id/settings')} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '16px' }}>
          <Plus size={20} /> Thêm phòng
        </button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '16px', color: '#475569', fontWeight: 'bold' }}>Số phòng</th>
              <th style={{ padding: '16px', color: '#475569', fontWeight: 'bold' }}>Tên phòng</th>
              <th style={{ padding: '16px', color: '#475569', fontWeight: 'bold' }}>Loại phòng</th>
              <th style={{ padding: '16px', color: '#475569', fontWeight: 'bold' }}>Khu vực</th>
              <th style={{ padding: '16px', color: '#475569', fontWeight: 'bold' }}>Trạng thái dọn dẹp</th>
            </tr>
          </thead>
          <tbody>
            {mockRooms.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '16px', fontWeight: 'bold', fontSize: '16px' }}>{item.id}</td>
                <td style={{ padding: '16px', fontSize: '16px' }}>{item.name}</td>
                <td style={{ padding: '16px', fontSize: '16px', color: '#64748b' }}>{item.type}</td>
                <td style={{ padding: '16px', fontSize: '16px' }}>{item.floor}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ backgroundColor: item.status === 'Sạch sẽ' ? '#d1fae5' : '#fee2e2', color: item.status === 'Sạch sẽ' ? '#059669' : '#dc2626', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
