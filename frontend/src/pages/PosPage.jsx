import React, { useState } from 'react';
import { UtensilsCrossed, Plus, ShoppingCart, Check, CreditCard, Building2 } from 'lucide-react';

export default function PosPage() {
  const [selectedRoom, setSelectedRoom] = useState('102');
  const [cart, setCart] = useState([
    { id: '1', name: 'Buffet Sáng Quốc Tế', price: 250000, qty: 2 },
    { id: '2', name: 'Nước dừa tươi Bến Tre', price: 45000, qty: 2 }
  ]);

  const menuItems = [
    { id: '1', name: 'Buffet Sáng Quốc Tế', price: 250000, cat: 'F&B' },
    { id: '2', name: 'Nước dừa tươi Bến Tre', price: 45000, cat: 'Drink' },
    { id: '3', name: 'Cà phê Muối Hải Phòng', price: 55000, cat: 'Drink' },
    { id: '4', name: 'Massage Body Thảo dược (60p)', price: 480000, cat: 'Spa' },
    { id: '5', name: 'Giặt ủi quần áo 1 bộ', price: 60000, cat: 'Laundry' },
    { id: '6', name: 'Thuê xe máy Honda 1 ngày', price: 150000, cat: 'Service' }
  ];

  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleChargeToRoom = () => {
    alert(`Đã ghi nợ thành công khoản tiền ${totalAmount.toLocaleString('vi-VN')} VNĐ vào Folio phòng ${selectedRoom}!`);
    setCart([]);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', height: '100%' }}>
      {/* Menu & POS Catalog */}
      <div className="ez-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>ezPos™ Point of Sale</h2>
            <p style={{ fontSize: '12px', color: 'var(--ez-text-muted)' }}>Quản lý dịch vụ Nhà hàng, Bar & Spa gắn folio phòng</p>
          </div>
          <span className="badge badge-success">ezPos Server Connected</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
          {menuItems.map(item => (
            <div 
              key={item.id} 
              className="ez-card" 
              style={{ padding: '16px', cursor: 'pointer', border: '1px solid var(--ez-border)' }}
              onClick={() => addToCart(item)}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ez-primary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                {item.cat}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ez-text-main)', marginBottom: '8px' }}>
                {item.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ez-accent-amber)' }}>
                  {item.price.toLocaleString('vi-VN')} đ
                </span>
                <button className="btn btn-sm btn-primary" style={{ padding: '4px 8px' }}>
                  <Plus size={14} /> Thêm
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart & Billing to Room */}
      <div className="ez-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={18} color="var(--ez-primary)" /> Đơn Dịch Vụ
          </h3>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Chọn Phòng ghi nợ (Gắn Folio)</label>
            <select 
              className="form-input"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
            >
              <option value="102">Phòng 102 - Nguyễn Văn An</option>
              <option value="104">Phòng 104 - Trần Thị Mai</option>
              <option value="203">Phòng 203 - Phạm Minh Tuấn</option>
              <option value="205">Phòng 205 - David Miller</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ez-text-muted)', fontSize: '13px' }}>
                Chưa có món nào trong đơn
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--ez-bg-light)', borderRadius: '8px', fontSize: '13px' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--ez-text-muted)' }}>x{item.qty}</div>
                  </div>
                  <div style={{ fontWeight: 800 }}>{(item.price * item.qty).toLocaleString('vi-VN')} đ</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--ez-border)', paddingTop: '16px', marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>
            <span>Tổng tiền:</span>
            <span style={{ color: 'var(--ez-primary)' }}>{totalAmount.toLocaleString('vi-VN')} VNĐ</span>
          </div>

          <button 
            className="btn btn-primary btn-block btn-lg" 
            onClick={handleChargeToRoom}
            disabled={cart.length === 0}
          >
            <CreditCard size={18} /> Ghi nợ phòng {selectedRoom}
          </button>
        </div>
      </div>
    </div>
  );
}
