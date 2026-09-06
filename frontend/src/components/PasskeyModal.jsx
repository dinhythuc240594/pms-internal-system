import React, { useState } from 'react';
import { KeyRound, Fingerprint, ShieldCheck, CheckCircle2, X } from 'lucide-react';

export default function PasskeyModal({ isOpen, onClose, onPasskeySuccess }) {
  const [step, setStep] = useState('prompt'); // 'prompt', 'scanning', 'success'

  if (!isOpen) return null;

  const handleSimulatePasskey = () => {
    setStep('scanning');
    setTimeout(() => {
      setStep('success');
      setTimeout(() => {
        onPasskeySuccess();
        setStep('prompt');
      }, 1200);
    }, 1500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={20} color="var(--ez-primary)" />
            <span style={{ fontWeight: 700, fontSize: '16px' }}>Xác thực Passkey HMS</span>
          </div>
          <button className="login-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ padding: '36px 24px' }}>
          {step === 'prompt' && (
            <div>
              <div style={{ 
                width: '72px', 
                height: '72px', 
                borderRadius: '50%', 
                background: 'var(--ez-primary-light)', 
                color: 'var(--ez-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Fingerprint size={40} />
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Đăng nhập bằng Passkey</h4>
              <p style={{ fontSize: '13px', color: 'var(--ez-text-muted)', marginBottom: '24px' }}>
                Sử dụng Vân tay, FaceID hoặc Khóa bảo mật trên thiết bị của bạn để đăng nhập nhanh không cần mật khẩu.
              </p>
              <button 
                className="btn btn-primary btn-block btn-lg" 
                onClick={handleSimulatePasskey}
              >
                Xác thực Sinh trắc học
              </button>
            </div>
          )}

          {step === 'scanning' && (
            <div>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: 'rgba(27, 73, 166, 0.1)', 
                color: 'var(--ez-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                animation: 'pulse 1.5s infinite'
              }}>
                <Fingerprint size={48} className="animate-spin" />
              </div>
              <h4 style={{ fontSize: '17px', fontWeight: 700 }}>Đang quét vân tay/FaceID...</h4>
              <p style={{ fontSize: '13px', color: 'var(--ez-text-muted)', marginTop: '6px' }}>Vui lòng chạm vào cảm biến thiết bị</p>
            </div>
          )}

          {step === 'success' && (
            <div>
              <div style={{ 
                width: '72px', 
                height: '72px', 
                borderRadius: '50%', 
                background: '#ecfdf5', 
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <CheckCircle2 size={44} />
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>Xác thực Passkey Thành công!</h4>
              <p style={{ fontSize: '13px', color: 'var(--ez-text-muted)', marginTop: '4px' }}>Đang tự động đăng nhập vào cổng HMS ID...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
