import { Link } from 'react-router-dom';
import '../styles/loha.css';

export default function LohaBrand() {
  return (
    <Link className="loha-brand" to="/" aria-label="LOHA — Trang chủ">
      <span className="loha-brand-mark" aria-hidden="true">L<span /></span>
      <span>LOHA<small>PMS SYSTEM</small></span>
    </Link>
  );
}
