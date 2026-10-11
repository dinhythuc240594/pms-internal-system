import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePms } from '../../data/usePms';
import { systemUser } from '../../data/api';
import { ArrowRight, CircleAlert, Eye, EyeOff, LoaderCircle } from 'lucide-react';

/**
 * COMPONENT: Login (Trang Đăng Nhập Hệ Thống)
 * Giao diện đồng bộ LOHA; giữ luồng đăng nhập và chuyển trang theo vai trò.
 */
export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, loading, loadError } = usePms();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Hàm xử lý sự kiện submit Form Đăng nhập
  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const account = await login(email, password, remember);
      setPassword('');
      const requested = params.get('next');
      const role = account.memberships?.find(m => m.active !== false)?.role;
      const home = systemUser(account) ? '/manager/dashboard' : role === 'HOUSEKEEPING' ? '/id/housekeeping/status' : role === 'ACCOUNTANT' ? '/id/cashflow' : '/id/dashboard';
      const safe = requested && /^\/(id|manager)(\/|$)/.test(requested) && !requested.startsWith('/id/login');
      navigate(safe ? requested : home, { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="loha-auth-heading">
        <span className="loha-auth-kicker">KHÔNG GIAN LÀM VIỆC CỦA BẠN</span>
        <h1>Đăng nhập LOHA</h1>
        <p>Chào mừng bạn trở lại. Đăng nhập bằng tài khoản được cấp để tiếp tục vận hành khách sạn.</p>
      </div>

      <form className="loha-auth-form" onSubmit={handleLogin} aria-busy={busy || loading}>
        {(error || loadError) && <div id="loha-login-error" className="loha-auth-error" role="alert"><CircleAlert size={18} aria-hidden="true" /><span>{error || loadError}</span></div>}
        <div className="loha-auth-field">
          <label htmlFor="loha-login-email">Email đăng nhập</label>
          <input id="loha-login-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={email} onChange={e => setEmail(e.target.value)} placeholder="ban@khachsan.vn" aria-describedby={error || loadError ? 'loha-login-error' : undefined} />
        </div>
        <div className="loha-auth-field">
          <label htmlFor="loha-login-password">Mật khẩu</label>
          <div className="loha-auth-password">
            <input id="loha-login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Nhập mật khẩu của bạn" aria-describedby={error || loadError ? 'loha-login-error' : undefined} />
            <button className="loha-auth-password-toggle" type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword} aria-controls="loha-login-password" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
            </button>
          </div>
        </div>
        <label className="loha-auth-remember">
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
          <span>Ghi nhớ đăng nhập</span>
        </label>
        <button className="loha-button loha-button-primary loha-auth-submit" type="submit" disabled={busy || loading}>
          {busy ? 'Đang đăng nhập…' : loading ? 'Đang kiểm tra phiên…' : 'Đăng nhập'}
          {busy || loading ? <LoaderCircle className="loha-auth-spinner" size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
        </button>
        <p className="loha-auth-forgot"><strong>Quên mật khẩu?</strong>Liên hệ quản trị viên khách sạn để được hỗ trợ.</p>
      </form>
    </>
  );
}
