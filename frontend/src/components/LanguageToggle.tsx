import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageToggle: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  const currentLang = i18n.language || 'en';

  const option = (lng: string, label: string) => {
    const active = currentLang.startsWith(lng);
    return (
      <button
        key={lng}
        type="button"
        onClick={() => changeLanguage(lng)}
        aria-pressed={active}
        className={
          active
            ? 'px-1.5 py-0.5 rounded-chip text-[11px] font-bold text-white bg-navy focus-visible:outline focus-visible:outline-2'
            : 'px-1.5 py-0.5 rounded-chip text-[11px] font-semibold text-ink-muted hover:text-navy hover:bg-tints-600 focus-visible:outline focus-visible:outline-2'
        }
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Language selection">
      <Globe size={13} className="text-navy" aria-hidden="true" />
      {option('en', 'English')}
      <span className="text-hairline-strong" aria-hidden="true">
        |
      </span>
      {option('hi', 'हिंदी')}
    </div>
  );
};
