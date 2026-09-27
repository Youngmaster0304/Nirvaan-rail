import React, { useEffect, useState } from 'react';
import { Type, Contrast } from 'lucide-react';
import { LanguageToggle } from './LanguageToggle';

/**
 * Accessibility strip rendered in the footer: font scaling, high contrast and
 * language. Preferences persist in localStorage and are re-applied on load.
 */
export const AccessibilityToolbar: React.FC = () => {
  const [fontSize, setFontSize] = useState(16);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const savedSize = localStorage.getItem('accessibility_fontSize');
    const savedContrast = localStorage.getItem('accessibility_highContrast');
    if (savedSize) setFontSize(parseInt(savedSize, 10));
    if (savedContrast === 'true') setHighContrast(true);
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem('accessibility_fontSize', fontSize.toString());
    document.body.classList.toggle('high-contrast', highContrast);
    localStorage.setItem('accessibility_highContrast', highContrast.toString());
  }, [fontSize, highContrast]);

  const changeFontSize = (delta: number) => {
    setFontSize((prev) => Math.min(24, Math.max(12, prev + delta)));
  };

  const btn =
    'px-1.5 py-0.5 border border-hairline-strong bg-white text-[11px] font-bold text-ink rounded-chip hover:bg-tints-600 focus-visible:outline focus-visible:outline-2';

  return (
    <div className="w-full border-t border-hairline bg-tints-500 px-3 sm:px-5 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] text-ink no-print">
      <span className="section-label flex items-center gap-1.5">
        <Type size={12} aria-hidden="true" />
        Accessibility
      </span>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1" role="group" aria-label="Font size">
          <button type="button" className={btn} onClick={() => changeFontSize(-1)} aria-label="Decrease font size">
            A−
          </button>
          <button type="button" className={btn} onClick={() => setFontSize(16)} aria-label="Reset font size">
            A
          </button>
          <button type="button" className={btn} onClick={() => changeFontSize(1)} aria-label="Increase font size">
            A+
          </button>
        </div>

        <button
          type="button"
          className="m-btn sm"
          onClick={() => setHighContrast((v) => !v)}
          aria-pressed={highContrast}
        >
          <Contrast size={12} aria-hidden="true" />
          {highContrast ? 'Standard contrast' : 'High contrast'}
        </button>

        <div className="border-l border-hairline-strong pl-3">
          <LanguageToggle />
        </div>
      </div>
    </div>
  );
};
