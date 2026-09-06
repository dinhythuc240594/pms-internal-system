import React, { useState } from 'react';
import { Terminal, Shield, Cpu, Database, Activity, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function DevSystemPage({ user }) {
  const [logs, setLogs] = useState([
    { time: '10:50:12', level: 'INFO', msg: 'System initialized with RBAC provider [roles: 3, users: 3]' },
    { time: '10:51:04', level: 'AUTH', msg: `User ${user ? user.email : 'dev'} authenticated via Passkey (Role: admin_system)` },
    { time: '10:52:30', level: 'SUCCESS', msg: 'Permission checklist sync: [dashboard, matrix, pos, cms, invoice, users, settings, system_logs]' },
    { time: '10:53:15', level: 'DEBUG', msg: 'Vite HMR module hot-reload complete. 0 errors detected.' }
  ]);

  const addLog = () => {
    const timeStr = new Date().toLocaleTimeString();
    setLogs(prev => [
      { time: timeStr, level: 'DEBUG', msg: `Manual system heartbeat check triggered by ${user?.email || 'Dev'}` },
      ...prev
    ]);
  };

  return (
    <div style={{ maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="ez-card" style={{ padding: '24px', borderLeft: '4px solid #f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Terminal size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Dev System Tools & System Logs</h2>
              <p style={{ fontSize: '13px', color: 'var(--ez-text-muted)' }}>
                Công cụ Developer & Nhật ký Root dành riêng cho Role Admin System (Dev)
              </p>
            </div>
          </div>
        </div>

        <button className="btn btn-outline" onClick={addLog} style={{ fontSize: '12px' }}>
          <RefreshCw size={14} /> Trigger System Log
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div className="ez-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--ez-primary)' }}>
            <Cpu size={18} />
            <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Runtime Environment</h4>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ez-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>Framework: <strong>React 18.2.0 + Vite 5.1</strong></div>
            <div>RBAC Core: <strong>Active (3 Roles Enforced)</strong></div>
            <div>Auth Engine: <strong>HMS ID Passkey v2.4</strong></div>
          </div>
        </div>

        <div className="ez-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#10b981' }}>
            <Database size={18} />
            <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Root Database Status</h4>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ez-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>Database Sync: <strong style={{ color: '#10b981' }}>HEALTHY (0ms)</strong></div>
            <div>Memory Cache: <strong>12.4 MB / 512 MB</strong></div>
            <div>Active Sessions: <strong>3 Active Mock Sessions</strong></div>
          </div>
        </div>

        <div className="ez-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#f59e0b' }}>
            <Shield size={18} />
            <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Dev Root Privilege</h4>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ez-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>Active User: <strong>{user?.email}</strong></div>
            <div>Permission Scope: <span className="badge badge-amber" style={{ fontSize: '9px' }}>ALL (SYSTEM_ROOT)</span></div>
            <div>Bypass Guards: <strong>ENABLED</strong></div>
          </div>
        </div>
      </div>

      {/* Live System Log Console */}
      <div className="ez-card" style={{ padding: '20px', background: '#0f172a', color: '#e2e8f0', fontFamily: 'monospace' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>
            <Activity size={18} />
            <span>LIVE SYSTEM AUDIT & SECURITY LOGS</span>
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Realtime Monitoring</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', maxHeight: '280px', overflowY: 'auto' }}>
          {logs.map((log, index) => (
            <div key={index} style={{ display: 'flex', gap: '12px' }}>
              <span style={{ color: '#64748b' }}>[{log.time}]</span>
              <span style={{ 
                fontWeight: 700,
                color: log.level === 'AUTH' ? '#38bdf8' : log.level === 'SUCCESS' ? '#4ade80' : log.level === 'INFO' ? '#fbbf24' : '#cbd5e1'
              }}>
                [{log.level}]
              </span>
              <span style={{ color: '#f1f5f9' }}>{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
