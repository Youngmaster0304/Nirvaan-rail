import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface LegalShellProps {
  title: string;
  titleHi: string;
  updated: string;
  summary: string;
  refNo?: string;
  children: ReactNode;
}

/**
 * Shared frame for the statutory pages so privacy / terms / RTI read like the
 * rest of the console rather than marketing copy.
 */
export default function LegalShell({ title, titleHi, updated, summary, refNo, children }: LegalShellProps) {
  return (
    <div className="mx-auto max-w-[980px] px-3 sm:px-5 py-5">
      <Link to="/" className="m-btn sm mb-3 inline-flex">
        <ArrowLeft size={12} aria-hidden="true" />
        Back to console
      </Link>

      <article className="m-card p-4 sm:p-6">
        <p className="section-label">Statutory information / वैधानिक सूचना</p>
        <h1 className="text-[26px] font-bold leading-tight mt-1">
          {title}{' '}
          <span className="text-ink-muted font-normal text-[16px]" lang="hi">
            / {titleHi}
          </span>
        </h1>
        <p className="official-rule mt-2" />
        <p className="text-[13px] leading-relaxed text-ink-muted mt-2">{summary}</p>
        <p className="sys-meta mt-1.5">
          Last reviewed: {updated}
          {refNo ? ` · Ref: ${refNo}` : ''}
        </p>

        <div className="mt-4 text-[13px] leading-relaxed space-y-3.5">{children}</div>
      </article>
    </div>
  );
}

export const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="text-[15px] font-bold text-ink border-b border-hairline pb-1 mt-5 first:mt-0">
    {children}
  </h2>
);

export const P = ({ children }: { children: ReactNode }) => (
  <p className="text-[13px] leading-relaxed text-ink-muted">{children}</p>
);

export const Bullets = ({ items }: { items: ReactNode[] }) => (
  <ul className="list-disc pl-5 text-[13px] leading-relaxed text-ink-muted space-y-1.5">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);
