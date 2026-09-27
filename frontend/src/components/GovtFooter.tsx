import React from 'react';
import { Link } from 'react-router-dom';
import { AccessibilityToolbar } from './AccessibilityToolbar';

const LINKS: Array<{ to: string; label: string }> = [
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Use' },
  { to: '/contact', label: 'Contact' },
  { to: '/disclaimer', label: 'Disclaimer' },
  { to: '/rti', label: 'Right to Information' },
  { to: '/sitemap', label: 'Sitemap' },
  { to: '/help', label: 'Help' },
];

export const GovtFooter: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full mt-auto no-print">
      <AccessibilityToolbar />

      <div className="border-t border-hairline-strong bg-tints-800">
        <div className="mx-auto max-w-console px-3 sm:px-5 py-4">
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-[11.5px] font-semibold text-navy hover:underline underline-offset-2 focus-visible:outline focus-visible:outline-2"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <hr className="official-rule mb-3" />

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="max-w-2xl">
              <p className="text-[11.5px] font-semibold text-ink">
                © {year} Centre for Railway Information Systems (CRIS), Ministry of Railways,
                Government of India
              </p>
              <p className="sys-meta mt-1 leading-relaxed">
                Content owned and maintained by CRIS. This is a Government of India computer system.
                Unauthorized access, use or disclosure is punishable under the Information Technology
                Act, 2000 (Section 66 and Section 43).
              </p>
            </div>
            <div className="sys-meta md:text-right shrink-0">
              <div>Best viewed at 1024×768 or higher</div>
              <div>Screen-reader accessible · Keyboard navigable</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
