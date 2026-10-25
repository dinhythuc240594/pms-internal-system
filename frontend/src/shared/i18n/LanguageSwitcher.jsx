import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { languages } from './core.js';
import { useI18n } from './useI18n.js';
import './LanguageSwitcher.css';

export default function LanguageSwitcher({ compact = false }) {
  const { locale, setLocale, t } = useI18n();
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const selected = languages.find(language => language.code === locale) || languages[0];

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = event => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    const closeEscape = event => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [open]);

  function chooseLanguage(code) {
    setLocale(code);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return <div ref={rootRef} className={`loha-language-switcher${compact ? ' is-compact' : ''}${open ? ' is-open' : ''}`} data-i18n-ignore>
    <button ref={triggerRef} type="button" className="loha-language-trigger" aria-label={`${t('language.label')}: ${selected.nativeName}`} title={t('language.label')} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)}>
      <span className="loha-language-icon"><Languages size={16} aria-hidden="true" /></span>
      <span className="loha-language-current" lang={selected.code}>{compact ? selected.shortName : selected.nativeName}</span>
      <ChevronDown className="loha-language-chevron" size={15} aria-hidden="true" />
    </button>
    {open && <div id={id} className="loha-language-menu" role="menu" aria-label={t('language.label')}>
      <span className="loha-language-menu-title">{t('language.label')}</span>
      {languages.map(language => <button key={language.code} type="button" className="loha-language-option" role="menuitemradio" aria-checked={language.code === locale} lang={language.code} onClick={() => chooseLanguage(language.code)}>
        <span className="loha-language-code">{language.shortName}</span>
        <span>{language.nativeName}</span>
        <Check size={16} aria-hidden="true" />
      </button>)}
    </div>}
  </div>;
}
