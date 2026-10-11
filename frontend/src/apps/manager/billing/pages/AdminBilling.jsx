import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Check, Search, Edit3, X, CheckCircle2, History, RefreshCw } from 'lucide-react';
import { usePms } from '../../../pms/data/usePms';
import { FEATURES } from '../../../pms/data/access';
import { money as formatCurrency } from '../../../pms/data/model';
import { getThemeTokens } from '../../theme';
import LegacyOverlay from '../../../pms/components/LegacyOverlay';
import { matchesSubscriptionState, subscriptionState, subscriptionStatusLabels } from '../subscriptionStatus';
import { dateFilterRange, positiveMoneyInput } from './saasBillingForm';
import './AdminBilling.css';

const statusLabels = { active: 'Đang hiệu lực', expired: 'Hết hạn', cancelled: 'Đã hủy' };
const EMPTY_ITEMS = [];
const actionLabels = { created: 'Cấp gói', changed_plan: 'Đổi gói', renewed: 'Gia hạn', updated: 'Cập nhật thuê bao', changed_status: 'Đổi trạng thái' };
const displayDate = value => value ? new Date(value).toLocaleString('vi-VN') : 'Không thời hạn';
const localDateTime = value => {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function AdminBilling() {
  const { authGeneration } = usePms();
  return <BillingWorkspace key={authGeneration} />;
}

function BillingWorkspace() {
  const { searchQuery: globalSearch, isDarkMode, theme } = useOutletContext() || {};
  const t = theme || getThemeTokens(isDarkMode);
  const { user, tenants, listPlans, savePlan, getTenantSubscription, saveTenantSubscription } = usePms();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('tenant');
  const openedSubscriptionId = useRef(null);
  const [data, setData] = useState({ tenants: null, revision: -1, plans: [], subscriptions: [], error: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const [billingCycle, setBillingCycle] = useState('month'), [search, setSearch] = useState(''), [statusFilter, setStatusFilter] = useState('ALL');
  const [editingPlan, setEditingPlan] = useState(null), [editingTenant, setEditingTenant] = useState(null), [draft, setDraft] = useState(null);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const current = data.tenants === tenants && data.revision === revision && data.listPlans === listPlans && data.getTenantSubscription === getTenantSubscription;
  const loading = !current;
  const loadError = current ? data.error : '';
  const plans = current && !loadError ? data.plans : EMPTY_ITEMS;
  const subscriptions = current && !loadError ? data.subscriptions : EMPTY_ITEMS;

  useEffect(() => {
    let cancelled = false;
    Promise.all([listPlans(), Promise.all(tenants.map(async tenant => ({ tenant, ...await getTenantSubscription(tenant.id) })))])
      .then(([result, rows]) => { if (!cancelled) { setError(''); setData({ tenants, revision, listPlans, getTenantSubscription, plans: result.plans || [], subscriptions: rows, error: '' }); } })
      .catch(err => { if (!cancelled) { setError(''); setData({ tenants, revision, listPlans, getTenantSubscription, plans: [], subscriptions: [], error: err.message }); } });
    return () => { cancelled = true; };
  }, [listPlans, getTenantSubscription, tenants, revision]);

  const selectedRow = subscriptions.find(row => row.tenant.id === selectedId);
  const openSubscription = useCallback(row => {
    setError(''); setMessage(''); setEditingTenant(row.tenant);
    const plan = plans.find(item => item.id === row.subscription?.planId) || plans.find(item => item.code === 'FREE');
    setDraft({ planId: plan?.id || '', status: row.subscription?.status || 'active', startDate: localDateTime(row.subscription?.startDate), endDate: localDateTime(row.subscription?.endDate), originalStartDate: row.subscription?.startDate || null, originalEndDate: row.subscription?.endDate || null, amount: '', currency: plan?.currency || 'VND', cycle: 'monthly' });
  }, [plans]);
  useEffect(() => {
    if (!selectedId) { openedSubscriptionId.current = null; return; }
    if (loading || loadError || !selectedRow || openedSubscriptionId.current === selectedId) return;
    openedSubscriptionId.current = selectedId;
    if (editingTenant?.id !== selectedId) openSubscription(selectedRow);
  }, [selectedId, loading, loadError, selectedRow, editingTenant, openSubscription]);
  const closeSubscription = () => { if (!busy) { setEditingTenant(null); setDraft(null); setSearchParams({}); } };

  const handleSavePlan = async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await savePlan({ ...editingPlan, maxRooms: editingPlan.maxRooms === '' || editingPlan.maxRooms === null ? null : Number(editingPlan.maxRooms), maxUsers: editingPlan.maxUsers === '' || editingPlan.maxUsers === null ? null : Number(editingPlan.maxUsers) });
      const [result, rows] = await Promise.all([listPlans(), Promise.all(tenants.map(async tenant => ({ tenant, ...await getTenantSubscription(tenant.id) })))]);
      setData({ tenants, revision, listPlans, getTenantSubscription, plans: result.plans || [], subscriptions: rows, error: '' }); setEditingPlan(null); setMessage('Đã lưu gói cước trên máy chủ.');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const handleSaveSubscription = async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const input = { planId: draft.planId, status: draft.status, endDate: draft.endDate === localDateTime(draft.originalEndDate) ? draft.originalEndDate : draft.endDate ? new Date(draft.endDate).toISOString() : null, currency: draft.currency, cycle: draft.cycle };
      if (plans.find(plan => plan.id === draft.planId)?.code === 'FREE') input.endDate = null;
      if (draft.startDate) input.startDate = draft.startDate === localDateTime(draft.originalStartDate) ? draft.originalStartDate : new Date(draft.startDate).toISOString();
      if (draft.amount !== '') input.amount = draft.amount;
      await saveTenantSubscription(editingTenant.id, input);
      const result = await getTenantSubscription(editingTenant.id);
      setData(value => ({ ...value, subscriptions: value.subscriptions.map(row => row.tenant.id === editingTenant.id ? { ...row, ...result } : row) }));
      setDraft(value => ({ ...value, startDate: localDateTime(result.subscription?.startDate), endDate: localDateTime(result.subscription?.endDate), originalStartDate: result.subscription?.startDate || null, originalEndDate: result.subscription?.endDate || null, amount: '' }));
      setMessage('Đã lưu thuê bao và lịch sử trên máy chủ.');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const effectiveSearch = (search || globalSearch || '').toLowerCase();
  const filteredSubscriptions = subscriptions.filter(row => (row.tenant.name + ' ' + (row.subscription?.planName || '')).toLowerCase().includes(effectiveSearch) && matchesSubscriptionState(row.subscription, statusFilter));
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrimary, fontSize: '14px' };
  const buttonStyle = { padding: '9px 14px', borderRadius: '10px', border: `1px solid ${t.border}`, backgroundColor: t.bgInput, color: t.textPrimary, cursor: 'pointer', fontWeight: '600', minHeight: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 };
  const primaryButton = { ...buttonStyle, backgroundColor: t.primary, color: '#fff', border: 0 };
  const cell = { padding: '14px 16px', borderBottom: `1px solid ${t.borderSubtle}`, color: t.textPrimary };
  const modalStyle = { position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgModalBackdrop, backdropFilter: 'blur(5px)', padding: '20px' };
  const modalCard = { backgroundColor: t.bgSurface, borderRadius: '16px', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: t.cardShadow, border: `1px solid ${t.border}` };
  const notice = <>{(error || loadError) && <p role="alert" style={{ color: t.danger }}>{error || loadError}</p>}{message && <p role="status" style={{ color: t.success }}>{message}</p>}</>;
  return <div className="manager-page manager-billing" style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: t.fontFamily }}>
    <header className="manager-page-heading">
      <div>
        <span className="manager-eyebrow">Dịch vụ & thanh toán</span>
        <h1>Gói cước & thanh toán</h1>
        <p>Quản lý hóa đơn dịch vụ, thu tiền và thuê bao của từng khách sạn.</p>
      </div>
      <span className="manager-billing-page-badge">2 gói dịch vụ</span>
    </header>
    {!editingPlan && !editingTenant && notice}
    {!editingPlan && !editingTenant && (error || loadError) && <button onClick={() => setRevision(value => value + 1)} disabled={loading} style={buttonStyle}>Tải lại dữ liệu</button>}
    {loading && <p role="status">Đang tải gói cước và thuê bao…</p>}
    <SaasInvoices tenants={tenants} theme={t} />
      {/* -------------------------------------------------------------
          SECTION 1: 2-TIER SUBSCRIPTION PLANS (FREE VS PRO + CMS)
          ------------------------------------------------------------- */}
      <div>
        <div className="manager-billing-section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: t.textPrimary, margin: 0, letterSpacing: '-0.02em' }}>
              Gói cước dịch vụ
            </h2>
            <p style={{ fontSize: '13px', color: t.textSecondary, margin: '4px 0 0 0' }}>
              Quản lý hai gói <strong>Miễn Phí</strong> và <strong>Chuyên Nghiệp</strong>, quyền sử dụng và giới hạn của từng gói.
            </p>
          </div>

          {/* Month / Year Toggle Pill */}
          <div className="manager-billing-cycle" aria-label="Chu kỳ hiển thị giá"
            style={{
              backgroundColor: t.bgInput,
              border: `1px solid ${t.border}`,
              borderRadius: '20px',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <button
              aria-pressed={billingCycle === 'month'}
              onClick={() => setBillingCycle('month')}
              style={{
                padding: '8px 16px',
                borderRadius: '16px',
                border: 'none',
                backgroundColor: billingCycle === 'month' ? t.primary : 'transparent',
                color: billingCycle === 'month' ? '#FFFFFF' : t.textSecondary,
                fontSize: '12.5px',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
            >
              Theo tháng
            </button>
            <button
              aria-pressed={billingCycle === 'year'}
              onClick={() => setBillingCycle('year')}
              style={{
                padding: '8px 16px',
                borderRadius: '16px',
                border: 'none',
                backgroundColor: billingCycle === 'year' ? t.primary : 'transparent',
                color: billingCycle === 'year' ? '#FFFFFF' : t.textSecondary,
                fontSize: '12.5px',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Theo năm</span>
              <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '8px', backgroundColor: billingCycle === 'year' ? 'rgba(255,255,255,0.25)' : '#DC2626', color: '#FFFFFF', fontWeight: '900' }}>
                Giá năm
              </span>
            </button>
          </div>
        </div>

        {/* 2 Plans Grid */}
        <div className="manager-billing-plans" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '20px' }}>
          {plans.map((plan) => {
            const isPro = plan.code === 'PRO';
            const currentPrice = billingCycle === 'month' ? plan.price : plan.priceYear;
            const cycleSuffix = billingCycle === 'month' ? '/ tháng' : '/ năm';

            return (
              <div
                key={plan.id}
                className={`manager-panel manager-billing-plan${isPro ? ' manager-billing-plan-pro' : ''}`}
                style={{
                  backgroundColor: t.bgSurface,
                  borderRadius: '16px',
                  border: isPro ? `2px solid ${t.primary}` : `1px solid ${t.border}`,
                  padding: '24px',
                  boxShadow: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  transition: 'all 0.25s ease'
                }}
              >
                {/* Header Badge */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span 
                      style={{
                        padding: '4px 12px',
                        borderRadius: '10px',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        backgroundColor: isPro ? t.aquaBg : t.bgInput,
                        color: isPro ? t.aquaText : t.textSecondary,
                        border: isPro ? `1px solid ${t.aquaBorder}` : `1px solid ${t.border}`
                      }}
                    >
                      {isPro ? 'Chuyên Nghiệp' : 'Miễn Phí'}
                    </span>

                    <div style={{ fontSize: '12px', color: t.textSecondary, fontWeight: '700' }}>
                      {subscriptions.filter(row => row.subscription?.planId === plan.id).length} cơ sở được cấp gói
                    </div>
                  </div>

                  <h3 style={{ fontSize: '20px', fontWeight: '900', color: t.textPrimary, margin: '0 0 6px 0' }}>
                    {plan.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: t.textSecondary, margin: '0 0 20px 0', lineHeight: '1.45' }}>
                    Quyền và giới hạn được áp dụng tại từng khách sạn.
                  </p>

                  {/* Price display */}
                  <div style={{ padding: '16px 0', borderTop: `1px solid ${t.borderSubtle}`, borderBottom: `1px solid ${t.borderSubtle}`, marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span className="manager-billing-price" style={{ fontSize: '28px', fontWeight: '800', color: isPro ? t.primary : t.textPrimary, letterSpacing: '-0.03em' }}>
                        {formatCurrency(currentPrice, plan.currency)}
                      </span>
                      <span style={{ fontSize: '13px', color: t.textSecondary, fontWeight: '600' }}>
                        {Number(currentPrice) > 0 ? cycleSuffix : '(Miễn phí)'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>
                      {plan.maxRooms === null ? 'Không giới hạn phòng' : `Tối đa ${plan.maxRooms} phòng`} • {plan.maxUsers === null ? 'Không giới hạn tài khoản' : `Tối đa ${plan.maxUsers} tài khoản`}
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="manager-billing-features" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: t.textPrimary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                      Tính năng bao gồm:
                    </div>

                    {Object.entries(plan.features || {}).filter(([, enabled]) => enabled).map(([code], idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div 
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: isPro ? '#EFF6FF' : '#F1F5F9',
                            color: isPro ? t.primary : '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}
                        >
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <span style={{ fontSize: '13px', color: t.textPrimary, fontWeight: '500', lineHeight: '1.4' }}>
                          {FEATURES.find(feature => feature.code === code)?.name || code}
                        </span>
                      </div>
                    ))}


                  </div>
                </div>

                {/* Footer Action Button */}
                <div style={{ paddingTop: '16px', borderTop: `1px solid ${t.borderSubtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: isPro ? t.primary : t.textMuted, fontWeight: '700' }}>
                    {plan.active ? 'Đang cung cấp' : 'Ngừng cung cấp'}
                  </span>

                  <button
                    className={`manager-button${isPro ? ' manager-button-primary' : ''}`}
                    disabled={busy || user?.globalRole !== 'SUPER_ADMIN'} onClick={() => { setError(''); setEditingPlan({ ...plan }); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '12px',
                      border: isPro ? 'none' : `1px solid ${t.border}`,
                      backgroundColor: isPro ? t.primary : t.bgInput,
                      color: isPro ? '#FFFFFF' : t.textPrimary,
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Edit3 size={13} />
                    <span>Sửa gói cước</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>


    <div className="manager-billing-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '16px' }}>
      {[['Khách sạn có thuê bao', subscriptions.filter(row => row.subscription).length], ['Đang hiệu lực', subscriptions.filter(row => matchesSubscriptionState(row.subscription, 'active')).length], ['Chưa hiệu lực / hết hạn / hủy', subscriptions.filter(row => row.subscription && !matchesSubscriptionState(row.subscription, 'active')).length]].map(([label, value]) => <div key={label} style={{ backgroundColor: t.bgSurface, padding: '22px 26px', borderRadius: '22px', border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}><span style={{ fontSize: '12.5px', color: t.textSecondary, fontWeight: '700' }}>{label}</span><div style={{ fontSize: '26px', fontWeight: '900', color: t.primary, marginTop: '6px' }}>{loading || loadError ? '—' : value}</div></div>)}
    </div>
    <section className="manager-panel manager-billing-subscriptions" style={{ backgroundColor: t.bgSurface, borderRadius: '16px', border: `1px solid ${t.border}`, boxShadow: 'none', overflow: 'hidden' }}>
      <div className="manager-billing-table-heading" style={{ padding: '18px 20px', borderBottom: `1px solid ${t.borderSubtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '800', color: t.textPrimary, margin: 0 }}>Thuê bao & gia hạn ({filteredSubscriptions.length})</h2>
        <div className="manager-billing-filters" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: t.textSecondary }}><Search size={16}/><input aria-label="Tìm khách sạn hoặc gói cước" placeholder="Tìm khách sạn, gói cước…" value={search} onChange={event => setSearch(event.target.value)} style={{ ...inputStyle, width: 240 }}/></label>
          <select aria-label="Trạng thái thuê bao" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} style={{ ...inputStyle, width: 'auto' }}><option value="ALL">Tất cả trạng thái</option>{Object.entries(subscriptionStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </div>
      </div>
      <p style={{ padding: '0 24px', color: t.textSecondary, fontSize: 12 }}>Số tiền trong lịch sử thuê bao là ghi chú khi cấp/gia hạn gói. Các khoản thu thực tế được ghi nhận tại Hóa đơn dịch vụ SaaS.</p>
      <div className="manager-table-wrap" role="region" aria-label="Danh sách thuê bao khách sạn" tabIndex={0} style={{ overflowX: 'auto' }}><table className="manager-table" style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}><thead><tr style={{ backgroundColor: t.bgInput }}>{['Khách sạn', 'Gói cước', 'Trạng thái', 'Hạn sử dụng', 'Thao tác'].map(label => <th key={label} scope="col" style={cell}>{label}</th>)}</tr></thead><tbody>
        {filteredSubscriptions.map(row => {
          const state = subscriptionState(row.subscription);
          return <tr key={row.tenant.id}><td style={cell}>{row.tenant.name}</td><td style={cell}>{row.subscription?.planName || 'Chưa cấp gói'}</td><td style={cell}><span className={`manager-subscription-status ${state}`}>{subscriptionStatusLabels[state] || 'Trạng thái chưa xác định'}</span></td><td style={cell}>{row.subscription ? displayDate(row.subscription.endDate) : '—'}</td><td style={cell}><button disabled={busy || loading} onClick={() => openSubscription(row)} style={buttonStyle}><RefreshCw size={13}/> Đổi gói / Gia hạn</button></td></tr>;
        })}
        {loading && <tr><td colSpan={5} style={cell}>Đang tải thuê bao…</td></tr>}
        {loadError && <tr><td colSpan={5} style={cell}>Không tải được thuê bao. Hãy tải lại dữ liệu.</td></tr>}
        {!loading && !loadError && !filteredSubscriptions.length && <tr><td colSpan={5} style={cell}>Không có khách sạn phù hợp.</td></tr>}
      </tbody></table></div>
    </section>
    {editingPlan && <LegacyOverlay title="Sửa gói cước" onClose={() => { if (!busy) setEditingPlan(null); }} style={modalStyle}><div className="manager-billing-dialog" style={modalCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 id="plan-edit-title" style={{ color: t.textPrimary, fontSize: 18 }}>Cập nhật gói: {editingPlan.name}</h2><button type="button" aria-label="Đóng sửa gói" disabled={busy} onClick={() => setEditingPlan(null)} style={buttonStyle}><X size={18}/></button></div>{notice}
      <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[['price', 'Giá tháng', 'number'], ['priceYear', 'Giá năm', 'number'], ['currency', 'Tiền tệ', 'text'], ['maxRooms', 'Giới hạn phòng (để trống = không giới hạn)', 'number'], ['maxUsers', 'Giới hạn tài khoản (để trống = không giới hạn)', 'number']].map(([key, label, type]) => <label key={key} style={{ color: t.textPrimary, fontSize: 13 }}>{label}<input aria-label={label} type={type} min={key.startsWith('max') ? 1 : 0} step={key.startsWith('max') ? 1 : '0.0001'} required={key === 'price' || key === 'priceYear' || key === 'currency'} value={editingPlan[key] ?? ''} onChange={event => setEditingPlan(plan => ({ ...plan, [key]: event.target.value }))} style={inputStyle}/></label>)}
        <label style={{ color: t.textPrimary }}><input type="checkbox" checked={editingPlan.active} onChange={event => setEditingPlan(plan => ({ ...plan, active: event.target.checked }))}/> Đang cung cấp</label>
        <fieldset style={{ border: `1px solid ${t.border}`, borderRadius: 12, color: t.textPrimary }}><legend>Tính năng của gói</legend><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>{FEATURES.map(feature => <label key={feature.code}><input type="checkbox" checked={editingPlan.features?.[feature.code] === true} onChange={event => setEditingPlan(plan => ({ ...plan, features: { ...plan.features, [feature.code]: event.target.checked } }))}/> {feature.name}</label>)}</div></fieldset>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" disabled={busy} onClick={() => setEditingPlan(null)} style={buttonStyle}>Hủy</button><button type="submit" disabled={busy} style={primaryButton}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div>
      </form>
    </div></LegacyOverlay>}
    {editingTenant && draft && <LegacyOverlay title="Quản lý thuê bao" onClose={closeSubscription} style={modalStyle}><div className="manager-billing-dialog" style={modalCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 id="subscription-edit-title" style={{ color: t.textPrimary, fontSize: 18 }}>Thuê bao: {editingTenant.name}</h2><button type="button" aria-label="Đóng thuê bao" disabled={busy} onClick={closeSubscription} style={buttonStyle}><X size={18}/></button></div>{notice}
      <form onSubmit={handleSaveSubscription} style={{ display: 'grid', gap: 16 }}>
        <label style={{ color: t.textPrimary }}>Gói cước<select aria-label="Gói cước thuê bao" required value={draft.planId} onChange={event => setDraft(value => ({ ...value, planId: event.target.value, currency: plans.find(plan => plan.id === event.target.value)?.currency || value.currency, endDate: plans.find(plan => plan.id === event.target.value)?.code === 'FREE' ? '' : value.endDate }))} style={inputStyle}><option value="">Chọn gói</option>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}{!plan.active ? ' (ngừng cung cấp)' : ''}</option>)}</select></label>
        <label style={{ color: t.textPrimary }}>Trạng thái<select aria-label="Trạng thái thuê bao cần lưu" value={draft.status} onChange={event => setDraft(value => ({ ...value, status: event.target.value }))} style={inputStyle}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <p style={{ color: t.textSecondary, fontSize: 12, margin: 0 }}>Ngày giờ theo múi giờ thiết bị: {timezone}. Gói Chuyên Nghiệp đang hiệu lực cần có hạn sử dụng trong tương lai.</p>
        {[['startDate', 'Bắt đầu kỳ'], ['endDate', 'Hạn sử dụng mới']].map(([key, label]) => <label key={key} style={{ color: t.textPrimary }}>{label}<input aria-label={label} type="datetime-local" value={draft[key]} required={key === 'endDate' && draft.status === 'active' && plans.find(plan => plan.id === draft.planId)?.code === 'PRO'} onInput={event => setDraft(value => ({ ...value, [key]: event.target.value }))} onChange={event => setDraft(value => ({ ...value, [key]: event.target.value }))} style={inputStyle}/></label>)}
        <label style={{ color: t.textPrimary }}>Chu kỳ<select aria-label="Chu kỳ thuê bao" value={draft.cycle} onChange={event => setDraft(value => ({ ...value, cycle: event.target.value }))} style={inputStyle}><option value="monthly">Theo tháng</option><option value="yearly">Theo năm</option></select></label>
        <label style={{ color: t.textPrimary }}>Số tiền ghi chú trong lịch sử thuê bao (không ghi nhận khoản thu)<input aria-label="Số tiền gia hạn" type="number" min="0" step="0.0001" value={draft.amount} onChange={event => setDraft(value => ({ ...value, amount: event.target.value }))} style={inputStyle}/></label>
        <label style={{ color: t.textPrimary }}>Tiền tệ<input aria-label="Tiền tệ gia hạn" required value={draft.currency} onChange={event => setDraft(value => ({ ...value, currency: event.target.value.toUpperCase() }))} style={inputStyle}/></label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" disabled={busy} onClick={closeSubscription} style={buttonStyle}>Đóng</button><button type="submit" disabled={busy || !draft.planId} style={primaryButton}><CheckCircle2 size={14}/> {busy ? 'Đang lưu…' : 'Lưu thuê bao / Gia hạn'}</button></div>
      </form>
      <h3 style={{ color: t.textPrimary, marginTop: 24, fontSize: 15 }}><History size={16}/> Lịch sử thay đổi</h3><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}><thead><tr>{['Thời điểm', 'Thao tác / Gói', 'Hạn mới', 'Số tiền', 'Người thao tác'].map(label => <th key={label} scope="col" style={cell}>{label}</th>)}</tr></thead><tbody>{(subscriptions.find(row => row.tenant.id === editingTenant.id)?.history || []).map(row => <tr key={row.id}><td style={cell}>{displayDate(row.createdAt || row.effectiveDate)}</td><td style={cell}>{actionLabels[row.action] || 'Cập nhật thuê bao'}<br/>{row.planName}<br/>{statusLabels[row.status] || ''}</td><td style={cell}>{displayDate(row.endDate)}</td><td style={cell}>{row.amount === null ? '—' : formatCurrency(row.amount, row.currency)}</td><td style={cell}>{row.actorName || row.actorId || '—'}</td></tr>)}</tbody></table>{!(subscriptions.find(row => row.tenant.id === editingTenant.id)?.history || []).length && <p style={{ color: t.textSecondary }}>Chưa có lịch sử thay đổi.</p>}</div>
    </div></LegacyOverlay>}
  </div>;
}

const invoiceStatusLabels = { unpaid: 'Chưa thanh toán', partial: 'Thanh toán một phần', paid: 'Đã thanh toán', void: 'Đã hủy' };
const invoiceDay = value => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN') : '—';
const displayPaymentDate = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'UTC' }) + ' UTC' : '—';

function SaasInvoices({ tenants, theme: t }) {
  const { listSaasInvoices, createSaasInvoice, recordSaasPayment, voidSaasInvoice } = usePms();
  const [filterDraft, setFilterDraft] = useState({ tenantId: '', status: '', start: '', through: '' });
  const [filters, setFilters] = useState({ page: 1, pageSize: 20 });
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState({ filters: null, revision: -1, result: null, error: '' });
  const [dialog, setDialog] = useState(null), [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const intent = useRef(null), submitting = useRef(false);
  useEffect(() => {
    let cancelled = false;
    listSaasInvoices(filters)
      .then(result => { if (!cancelled) setData({ filters, revision, result, error: '' }); })
      .catch(err => { if (!cancelled) setData({ filters, revision, result: null, error: err.message }); });
    return () => { cancelled = true; };
  }, [listSaasInvoices, filters, revision]);
  const current = data.filters === filters && data.revision === revision;
  const loading = !current;
  const result = current ? data.result : null;
  const invoices = result?.invoices || [];
  const pagination = result?.pagination || { page: filters.page, pageSize: filters.pageSize, totalItems: 0 };
  const pages = Math.max(1, Math.ceil(pagination.totalItems / pagination.pageSize));
  const close = () => { if (!submitting.current) { setDialog(null); setError(''); } };
  const open = (mode, invoice) => {
    setError(''); setMessage(''); intent.current = crypto.randomUUID();
    setDialog({ mode, invoice });
    setDraft(mode === 'create' ? { tenantId: filterDraft.tenantId, description: '', amount: '', currency: 'VND', dueDate: '' } : mode === 'payment' ? { amount: invoice.balance, method: 'bank', reference: '', note: '' } : { reason: '' });
  };
  const changeDraft = (key, value) => { setDraft(previous => ({ ...previous, [key]: value })); intent.current = crypto.randomUUID(); };
  const applyFilters = event => {
    event.preventDefault(); setError('');
    try { setFilters({ tenantId: filterDraft.tenantId, status: filterDraft.status, ...dateFilterRange(filterDraft.start, filterDraft.through), page: 1, pageSize: 20 }); }
    catch (err) { setError(err.message); }
  };
  const save = async event => {
    event.preventDefault(); if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(''); setMessage('');
    try {
      let response;
      if (dialog.mode === 'create') {
        response = await createSaasInvoice({ tenantId: draft.tenantId, description: draft.description.trim(), amount: positiveMoneyInput(draft.amount), currency: draft.currency, ...(draft.dueDate ? { dueDate: draft.dueDate } : {}) }, intent.current);
        setMessage('Đã tạo hóa đơn dịch vụ.');
      } else if (dialog.mode === 'payment') {
        response = await recordSaasPayment(dialog.invoice.id, { amount: positiveMoneyInput(draft.amount), method: draft.method, reference: draft.reference.trim(), note: draft.note.trim() }, intent.current);
        setMessage('Đã ghi nhận khoản thanh toán.');
      } else {
        response = await voidSaasInvoice(dialog.invoice.id, draft.reason.trim());
        setMessage('Đã hủy hóa đơn chưa thanh toán.');
      }
      const saved = response?.invoice || (response?.id ? response : null);
      setDialog(saved ? { mode: 'detail', invoice: saved } : null);
      setRevision(value => value + 1);
    } catch (err) { setError(err.message); }
    finally { submitting.current = false; setBusy(false); }
  };
  const invoice = dialog?.invoice;
  const status = row => <span className={`manager-invoice-status manager-invoice-status-${row.status}`}>{invoiceStatusLabels[row.status] || row.status}</span>;
  const notice = <>{error && <p className="manager-invoice-error" role="alert">{error}</p>}{message && <p className="manager-invoice-success" role="status">{message}</p>}</>;
  const filterChange = (key, value) => setFilterDraft(previous => ({ ...previous, [key]: value }));
  return <section className="manager-panel manager-invoices" aria-labelledby="manager-invoices-title" aria-busy={loading}>
    <div className="manager-billing-table-heading manager-invoice-heading">
      <div><h2 id="manager-invoices-title">Hóa đơn dịch vụ SaaS</h2><p>Hóa đơn và khoản thu cho dịch vụ phần mềm của từng khách sạn.</p></div>
      <button type="button" className="manager-button manager-button-primary" disabled={busy || !tenants.length} onClick={() => open('create')}>Tạo hóa đơn</button>
    </div>
    <form className="manager-invoice-filters" onSubmit={applyFilters}>
      <label>Khách sạn<select value={filterDraft.tenantId} onChange={event => filterChange('tenantId', event.target.value)}><option value="">Tất cả khách sạn</option>{tenants.map(tenant => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
      <label>Trạng thái<select value={filterDraft.status} onChange={event => filterChange('status', event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(invoiceStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Tạo từ ngày (UTC)<input type="date" value={filterDraft.start} onInput={event => filterChange('start', event.target.value)} onChange={event => filterChange('start', event.target.value)} /></label>
      <label>Đến hết ngày (UTC)<input type="date" min={filterDraft.start || undefined} value={filterDraft.through} onInput={event => filterChange('through', event.target.value)} onChange={event => filterChange('through', event.target.value)} /></label>
      <button type="submit" className="manager-button" disabled={busy}>Lọc hóa đơn</button>
      <button type="button" className="manager-button" disabled={loading || busy} onClick={() => setRevision(value => value + 1)} aria-label="Tải lại hóa đơn"><RefreshCw size={16} aria-hidden="true" /></button>
    </form>
    {!dialog && notice}
    {loading ? <p className="manager-invoice-state" role="status">Đang tải hóa đơn…</p> : data.error ? <div className="manager-invoice-state"><p role="alert">Không tải được hóa đơn: {data.error}</p><button type="button" className="manager-button" onClick={() => setRevision(value => value + 1)}>Thử lại</button></div> : <>
      <div className="manager-table-wrap" role="region" aria-label="Danh sách hóa đơn dịch vụ" tabIndex={0}>
        <table className="manager-table manager-invoice-table"><thead><tr>{['Hóa đơn / Khách sạn', 'Nội dung', 'Tổng tiền', 'Đã thu', 'Còn lại', 'Hạn thanh toán', 'Trạng thái', 'Thao tác'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>
          {invoices.map(row => <tr key={row.id}><td><strong>{row.number}</strong><span className="manager-invoice-secondary">{row.tenantName || row.tenantId}</span></td><td className="manager-invoice-description">{row.description}</td><td>{formatCurrency(row.amount, row.currency)}</td><td>{formatCurrency(row.paid, row.currency)}</td><td>{formatCurrency(row.balance, row.currency)}</td><td>{invoiceDay(row.dueDate)}</td><td>{status(row)}</td><td><button type="button" className="manager-button" onClick={() => open('detail', row)}>Chi tiết / Thu tiền</button></td></tr>)}
          {!invoices.length && <tr><td colSpan={8}>Chưa có hóa đơn phù hợp với bộ lọc.</td></tr>}
        </tbody></table>
      </div>
      <div className="manager-invoice-pagination"><span>{pagination.totalItems.toLocaleString('vi-VN')} hóa đơn · Trang {pagination.page}/{pages}</span><div><button type="button" className="manager-button" disabled={filters.page <= 1} onClick={() => setFilters(previous => ({ ...previous, page: previous.page - 1 }))}>Trước</button><button type="button" className="manager-button" disabled={filters.page >= pages} onClick={() => setFilters(previous => ({ ...previous, page: previous.page + 1 }))}>Sau</button></div></div>
    </>}
    {dialog && <LegacyOverlay title={dialog.mode === 'create' ? 'Tạo hóa đơn dịch vụ' : `Hóa đơn ${invoice.number}`} onClose={close} style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgModalBackdrop, padding: 20 }}>
      <div className="manager-billing-dialog manager-invoice-dialog">
        <div className="manager-invoice-dialog-heading"><h2>{dialog.mode === 'create' ? 'Tạo hóa đơn dịch vụ' : `Hóa đơn ${invoice.number}`}</h2><button type="button" className="manager-button" aria-label="Đóng hóa đơn" disabled={busy} onClick={close}><X size={18} aria-hidden="true" /></button></div>
        {notice}
        {invoice && <><p>{invoice.tenantName || invoice.tenantId}</p><p className="manager-invoice-description">{invoice.description}</p><dl className="manager-invoice-summary"><div><dt>Tổng tiền</dt><dd>{formatCurrency(invoice.amount, invoice.currency)}</dd></div><div><dt>Đã thu</dt><dd>{formatCurrency(invoice.paid, invoice.currency)}</dd></div><div><dt>Còn lại</dt><dd>{formatCurrency(invoice.balance, invoice.currency)}</dd></div><div><dt>Hạn thanh toán</dt><dd>{invoiceDay(invoice.dueDate)}</dd></div></dl>{status(invoice)}</>}
        {dialog.mode === 'detail' && <>
          <div className="manager-invoice-actions">{['unpaid', 'partial'].includes(invoice.status) && <button type="button" className="manager-button manager-button-primary" onClick={() => open('payment', invoice)}>Ghi nhận thanh toán</button>}{invoice.status === 'unpaid' && <button type="button" className="manager-button" onClick={() => open('void', invoice)}>Hủy hóa đơn</button>}</div>
          <h3>Lịch sử thanh toán</h3>
          {(invoice.payments || []).length ? <ul className="manager-invoice-payments">{invoice.payments.map(payment => <li key={payment.id}><div><strong>{formatCurrency(payment.amount, invoice.currency)}</strong><time dateTime={payment.createdAt}>{displayPaymentDate(payment.createdAt)}</time></div><p>{payment.method === 'bank' ? 'Chuyển khoản' : 'Tiền mặt'}{payment.reference ? ` · ${payment.reference}` : ''}</p>{payment.note && <p>{payment.note}</p>}</li>)}</ul> : <p className="manager-invoice-secondary">Chưa có khoản thanh toán.</p>}
          {invoice.status === 'void' && invoice.voidReason && <p>Lý do hủy: {invoice.voidReason}</p>}
        </>}
        {dialog.mode !== 'detail' && <form className="manager-invoice-form" onSubmit={save}>
          <fieldset disabled={busy}>
            {dialog.mode === 'create' && <><label>Khách sạn<select required value={draft.tenantId} onChange={event => changeDraft('tenantId', event.target.value)}><option value="">Chọn khách sạn</option>{tenants.map(tenant => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label><label>Nội dung dịch vụ<textarea required maxLength={500} rows={3} value={draft.description} onChange={event => changeDraft('description', event.target.value)} /></label></>}
            {dialog.mode !== 'void' && <label>Số tiền ({dialog.mode === 'payment' ? invoice.currency : draft.currency})<input required inputMode="decimal" type="text" maxLength={20} pattern="[0-9]{1,15}([.][0-9]{1,4})?" value={draft.amount} onChange={event => changeDraft('amount', event.target.value)} /><small>Dùng dấu chấm cho phần thập phân, tối đa 4 chữ số.</small></label>}
            {dialog.mode === 'create' && <div className="manager-invoice-form-row"><label>Tiền tệ<select value={draft.currency} onChange={event => changeDraft('currency', event.target.value)}><option value="VND">VND</option><option value="USD">USD</option></select></label><label>Hạn thanh toán<input type="date" value={draft.dueDate} onInput={event => changeDraft('dueDate', event.target.value)} onChange={event => changeDraft('dueDate', event.target.value)} /></label></div>}
            {dialog.mode === 'payment' && <><label>Hình thức thu<select value={draft.method} onChange={event => changeDraft('method', event.target.value)}><option value="bank">Chuyển khoản</option><option value="cash">Tiền mặt</option></select></label><label>Mã tham chiếu<input maxLength={160} value={draft.reference} onChange={event => changeDraft('reference', event.target.value)} /></label><label>Ghi chú<textarea maxLength={1000} rows={2} value={draft.note} onChange={event => changeDraft('note', event.target.value)} /></label><p>Máy chủ kiểm tra số tiền còn lại trước khi ghi nhận. Khi có lỗi kết nối, bấm ghi nhận lại để thử cùng khoản thu.</p></>}
            {dialog.mode === 'void' && <><p>Chỉ hủy được hóa đơn chưa nhận khoản thanh toán nào. Hóa đơn được giữ trong lịch sử.</p><label>Lý do hủy<textarea required maxLength={1000} rows={3} value={draft.reason} onChange={event => changeDraft('reason', event.target.value)} /></label></>}
          </fieldset>
          <div className="manager-invoice-actions"><button type="button" className="manager-button" disabled={busy} onClick={invoice ? () => open('detail', invoice) : close}>{invoice ? 'Quay lại' : 'Hủy'}</button><button type="submit" className="manager-button manager-button-primary" disabled={busy}>{busy ? 'Đang lưu…' : dialog.mode === 'create' ? 'Tạo hóa đơn' : dialog.mode === 'payment' ? 'Ghi nhận thanh toán' : 'Xác nhận hủy hóa đơn'}</button></div>
        </form>}
      </div>
    </LegacyOverlay>}
  </section>;
}
