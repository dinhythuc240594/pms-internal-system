import React, { useState } from 'react';
import { Search, Grid, Building2, Sparkles, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';
import { appCategories } from '../mockData/appsData';
import Header from '../components/Header';

export default function PortalPage({ user, onSelectApp, onLogout, lang, onChangeLang, onOpenAppSwitcher }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');

  // Filter apps based on search & category tab
  const filterApps = (apps) => {
    return apps.filter(app => {
      const matchSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          app.descVi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          app.desc.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTab = selectedTab === 'all' || app.type === selectedTab;
      return matchSearch && matchTab;
    });
  };

  return (
    <div className="portal-container">
      {/* Top Header Navigation */}
      <Header 
        user={user} 
        currentApp="portal" 
        onSwitchApp={onSelectApp}
        onLogout={onLogout}
        lang={lang}
        onChangeLang={onChangeLang}
        onOpenAppSwitcher={onOpenAppSwitcher}
      />

      {/* Main Portal Body */}
      <div className="portal-main-content">
        {/* Banner Welcome */}
        <div 
          className="ez-card" 
          style={{ 
            background: 'linear-gradient(135deg, #0b1e48 0%, #1b49a6 60%, #0284c7 100%)', 
            color: 'white', 
            padding: '28px 32px', 
            marginBottom: '32px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '650px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, marginBottom: '12px' }}>
              <Sparkles size={14} color="#f59e0b" /> CỔNG ĐĂNG NHẬP TẬP TRUNG ID.HMS.VN
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
              Chào mừng trở lại, {user ? user.email.split('@')[0] : 'nguyendung150000'}!
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
              Truy cập nhanh vào hệ thống quản lý khách sạn PMS, nhà hàng ezPos, hóa đơn ezInvoice, và đồng bộ kênh bán phòng lẻ OTA.
            </p>
          </div>

          <div style={{ position: 'absolute', right: '-20px', bottom: '-40px', opacity: 0.15, pointerEvents: 'none' }}>
            <Building2 size={260} color="white" />
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Tất cả Ứng dụng' },
              { id: 'pms', label: 'Khách sạn (PMS)' },
              { id: 'pos', label: 'Điểm bán (POS & Spa)' },
              { id: 'distribution', label: 'Phân phối & OTA' },
              { id: 'finance', label: 'Tài chính & Hóa đơn' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`btn ${selectedTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="portal-search-bar" style={{ width: '280px', background: '#ffffff' }}>
            <Search size={16} color="var(--ez-text-muted)" />
            <input 
              type="text" 
              placeholder="Tìm kiếm ứng dụng HMS..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Sections Grid Matching Image 2 */}
        {appCategories.map(section => {
          const appsToDisplay = filterApps(section.apps);
          if (appsToDisplay.length === 0) return null;

          return (
            <div key={section.id} style={{ marginBottom: '36px' }}>
              <div className="section-title-group">
                <h2 className="section-heading">{section.title}</h2>
              </div>

              <div className="app-grid">
                {appsToDisplay.map((app, idx) => (
                  <div
                    key={`${app.id}-${idx}`}
                    className="app-tile-card"
                    onClick={() => onSelectApp(app.id)}
                  >
                    {/* App Icon Box */}
                    <div 
                      className="app-icon-wrapper"
                      style={{ background: app.iconBg, color: app.iconColor }}
                    >
                      <Building2 size={28} />
                    </div>

                    {/* App Title */}
                    <h3 className="app-tile-name">{app.name}</h3>

                    {/* App Description */}
                    <p className="app-tile-desc">
                      {lang === 'vi' ? app.descVi : app.desc}
                    </p>

                    {/* Action hover indicator */}
                    <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: 700, color: 'var(--ez-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Mở ứng dụng <ArrowRight size={12} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
