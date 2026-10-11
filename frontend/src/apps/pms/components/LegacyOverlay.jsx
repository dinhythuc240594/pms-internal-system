import React, { useEffect, useRef } from 'react';

// Accessible behavior around the existing overlay; its original styles stay on the div.
export default function LegacyOverlay({ title, onClose, style, children }) {
  const ref = useRef(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    const root = ref.current;
    const controls = () => [...root.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')].filter(el => el.getClientRects().length);
    controls()[0]?.focus();
    function onKey(event) {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== root) return;
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key === 'Tab') {
        const items = controls();
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, []);
  return <div ref={ref} tabIndex={-1} className="pms-legacy-overlay" role="dialog" aria-modal="true" aria-label={title} style={style} onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>{children}</div>;
}
