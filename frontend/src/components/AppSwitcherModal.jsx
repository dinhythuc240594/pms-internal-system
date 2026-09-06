import React from 'react';
import { X, Building2, ExternalLink, Sparkles } from 'lucide-react';
import { appCategories } from '../mockData/appsData';

export default function AppSwitcherModal({ isOpen, onClose, onSelectApp }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '820px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="ezcloud-cloud-icon" style={{ width: '32px', height: '32px' }}>
              <Building2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ez-primary)' }}>
                HMS ID App Launcher
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--ez-text-muted)' }}>
                Chọn ứng dụng để chuyển đổi hệ thống tức thì
              </p>
            </div>
          </div>
          <button className="login-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {appCategories.map((cat) => (
            <div key={cat.id} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ez-text-main)' }}>
                  {cat.titleVi} ({cat.title})
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {cat.apps.map((app, index) => (
                  <div
                    key={`${app.id}-${index}`}
                    onClick={() => { onSelectApp(app.id); onClose(); }}
                    className="ez-card"
                    style={{
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      border: '1px solid var(--ez-border)'
                    }}
                  >
                    <div style={{ 
                      width: '42px', 
                      height: '42px', 
                      borderRadius: '10px', 
                      background: app.iconBg, 
                      color: app.iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '16px',
                      flexShrink: 0
                    }}>
                      {app.name.charAt(2) || 'e'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ez-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {app.name}
                        </span>
                        {app.tag && (
                          <span className="badge badge-primary" style={{ fontSize: '9px', padding: '1px 5px' }}>
                            {app.tag}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ez-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {app.descVi}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            </div>
          ))}
      </div>

      <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--ez-text-muted)' }}>
          <Sparkles size={14} color="var(--ez-accent-yellow)" /> Cổng đăng nhập id.hms.vn v2.4
        </div>
        <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
      </div>
    </div>
    </div >
  );
}
