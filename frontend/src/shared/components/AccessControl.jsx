import React from 'react';
import { Link, Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { usePms } from '../../apps/pms/data/usePms';
import LegacyOverlay from '../../apps/pms/components/LegacyOverlay';
import LohaErrorPage from './LohaErrorPage';
import { errorStatus } from './errorStatus';
function ContactUpgrade({ onClick }) {
  return <Link className="loha-error-text-link" to="/contact" onClick={onClick}>Liên hệ về gói dịch vụ</Link>;
}
export function AccessMessage({ result }) {
  return <LohaErrorPage status={errorStatus(result, 403) || 403} message={result.message}>{['feature', 'expired'].includes(result.reason) && <ContactUpgrade />}</LohaErrorPage>;
}
export function RouteGuard() {
  const { routeAccess, loading, workspaceLoading, loadError, loadErrorStatus, retry } = usePms();
  const context = useOutletContext();
  const location = useLocation();
  if (loading || workspaceLoading) return <p role="status">Đang tải dữ liệu khách sạn…</p>;
  if (loadError) return <LohaErrorPage status={errorStatus({ status: loadErrorStatus, message: loadError }) || 500} message={loadError} onRetry={() => retry()} />;
  const result = routeAccess(location.pathname);
  if (result.reason === 'session') return <Navigate to={`/id/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return result.allowed ? <Outlet context={context} /> : <AccessMessage result={result} />;
}
export function LayoutGuard({ children, manager = false }) {
  const { user, routeAccess, loading, loadError, loadErrorStatus, retry } = usePms();
  const location = useLocation();
  if (loading) return <p role="status">Đang kiểm tra phiên đăng nhập…</p>;
  if (!user && loadError) return <LohaErrorPage fullPage status={errorStatus({ status: loadErrorStatus, message: loadError }) || 500} message={loadError} onRetry={() => retry()} />;
  if (!user) return <Navigate to={`/id/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (manager) {
    const result = routeAccess('/manager');
    if (!result.allowed) return <LohaErrorPage fullPage status={errorStatus(result, 403)} message={result.message} />;
  }
  return children;
}
export function AccessDialog() {
  const { accessDialog, closeAccess } = usePms();
  if (!accessDialog) return null;
  const status = errorStatus(accessDialog, accessDialog.reason === 'error' ? 500 : null);
  return <LegacyOverlay title={status ? `Thông báo ${status}` : 'Thông báo'} onClose={closeAccess} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#0f172a99', display: 'grid', placeItems: 'center', padding: 12 }}><div className="loha-error-dialog">{status ? <LohaErrorPage status={status} message={accessDialog.message} onClose={closeAccess}>{['feature', 'expired'].includes(accessDialog.reason) && <ContactUpgrade onClick={closeAccess} />}</LohaErrorPage> : <section className="loha-error-page"><div className="loha-error-content" role="alert"><h2>Thông báo</h2><p className="loha-error-description">{accessDialog.message}</p><div className="loha-error-actions">{['feature', 'expired', 'quota'].includes(accessDialog.reason) && <ContactUpgrade onClick={closeAccess} />}<button className="loha-error-button loha-error-primary" type="button" onClick={closeAccess}>Đóng thông báo</button></div></div></section>}</div></LegacyOverlay>;
}
export function AccessLink({ to, children, onClick, style, ...props }) {
  const { routeAccess, showAccess } = usePms();
  const result = routeAccess(to.split('?')[0]);
  return <Link {...props} to={to} data-locked={!result.allowed} title={!result.allowed ? result.message : props.title} style={{ ...style, opacity: result.allowed ? 1 : 0.55 }} onClick={e => { if (!result.allowed) { e.preventDefault(); showAccess(result); } else onClick?.(e); }}>{children}{!result.allowed && <span aria-label="Bị khóa" style={{ marginLeft: 'auto', fontSize: 12 }}>🔒</span>}</Link>;
}
