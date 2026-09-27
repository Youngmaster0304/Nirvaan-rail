import { useState } from 'react';
import { LifeBuoy, Keyboard, BookOpen, Stethoscope, Languages, ShieldAlert } from 'lucide-react';
import { WarningBanner } from '../components/WarningBanner';
import { api, apiErrorMessage, type HealthResponse } from '../services/api';

interface Faq {
  q: string;
  qHi: string;
  a: string;
}

const FAQS: Faq[] = [
  {
    q: 'What does this portal do?',
    qHi: 'यह पोर्टल क्या करता है?',
    a: 'It ranks maintenance tasks, assembles them into possession blocks, simulates the traffic impact of those blocks, and records every decision in an append-only audit trail. The AI proposes; an authorised officer approves.',
  },
  {
    q: 'How is a priority score produced?',
    qHi: 'प्राथमिकता अंक कैसे बनता है?',
    a: 'The scoring model reads defect severity, days overdue, traffic density and resource availability. Open any row on Task Prioritisation and press the explanation button to see the per-feature SHAP contribution for that task.',
  },
  {
    q: 'What is a block, and what is task merging?',
    qHi: 'ब्लॉक क्या है, और कार्य विलय क्या है?',
    a: 'A block is a time window in which a section of track is taken out of service. Merging puts Engineering, S&T and Traction work into one window so the line is reopened once instead of three times.',
  },
  {
    q: 'Where do I approve or reject a programme?',
    qHi: 'कार्यक्रम कहाँ अनुमोदित/अस्वीकार करें?',
    a: 'On Block Planning (or Weekly/Monthly Programme), select a plan, review its blocks, then use Approve or Reject. A rejection requires a reason, which is written to the audit trail with your employee id.',
  },
  {
    q: 'Why does a figure show “—” instead of a number?',
    qHi: 'कुछ स्थानों पर “—” क्यों दिखता है?',
    a: 'The API did not return that field for the current payload. The console never invents a value: an unavailable figure is shown as “—” with a footnote naming the missing field.',
  },
  {
    q: 'What happens when the API is unreachable?',
    qHi: 'यदि API अनुपलब्ध हो तो क्या होता है?',
    a: 'Every page reports the failure in a banner and keeps its last good state. Start the backend on port 8000 (the dev server proxies /api there) and press Retry or reload the page.',
  },
  {
    q: 'Is the AI decision final?',
    qHi: 'क्या AI निर्णय अंतिम है?',
    a: 'No. Every recommendation is advisory. Only the officer holding approval rights can commit a programme, and that action is stamped with their name in the audit trail.',
  },
  {
    q: 'How do I switch language?',
    qHi: 'भाषा कैसे बदलें?',
    a: 'Use the EN/HI control in the accessibility strip at the foot of every page, or the language switch in the header. Hindi labels are rendered from the navigation definitions directly.',
  },
];

const GLOSSARY: Array<[string, string, string]> = [
  ['Block', 'ब्लॉक', 'A possession window in which a section is handed to a department for work.'],
  ['Corridor', 'गलियारा', 'An end-to-end route tracked by punctuality, reliability and productivity KPIs.'],
  ['Possession hours', 'कब्जा घंटे', 'Total time the line is booked out of service across all blocks.'],
  ['SHAP', 'एसएचएपी', 'Per-feature contribution showing why a task received its score.'],
  ['Override', 'ओवरराइड', 'A human decision that supersedes the model, always logged with a reason.'],
  ['Audit trail', 'लेखापरीक्षा', 'Append-only record of every action, kept for supervisory and CAG review.'],
  ['S&T / Traction', 'एस एंड टी / ट्रैक्शन', 'Signalling & telecommunications department / electrical traction department.'],
];

const ROLES: Array<[string, string]> = [
  ['PLANNER', 'Generate and edit programmes, run simulations.'],
  ['DISPATCHER', 'Approve or reject programmes and task actions.'],
  ['SUPERVISOR', 'Approve, reject and view the full audit trail.'],
  ['ADMIN', 'Full access including user and configuration views.'],
  ['VIEWER', 'Read-only access to dashboards, registers and reports.'],
];

export default function HelpPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState('');
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    setHealthError('');
    try {
      const res = await api.health.get();
      setHealth(res);
    } catch (err) {
      setHealth(null);
      setHealthError(apiErrorMessage(err));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto max-w-console px-3 sm:px-5 py-4">
      <div className="page-head">
        <div className="min-w-0">
          <h1>
            Help & Support{' '}
            <span className="text-ink-muted font-normal text-[15px]" lang="hi">
              / सहायता एवं समर्थन
            </span>
          </h1>
          <p className="text-[12.5px] text-ink-muted mt-0.5">
            Operating notes, glossary, role matrix and first-line troubleshooting for the console.
          </p>
          <p className="sys-meta mt-1">Portal build · reads live API data only</p>
        </div>
        <button type="button" className="m-btn" onClick={checkHealth} disabled={checking}>
          <Stethoscope size={13} aria-hidden="true" />
          {checking ? 'Checking…' : 'Check API health'}
        </button>
      </div>

      {healthError && (
        <div className="mb-3">
          <WarningBanner type="error" message={healthError} />
        </div>
      )}
      {health && (
        <div className="mb-3">
          <WarningBanner
            type="success"
            message={`API status: ${health.status}${health.model ? ` · model ${health.model}` : ''}${
              typeof health.tasks === 'number' ? ` · ${health.tasks} tasks loaded` : ''
            }${health.version ? ` · version ${health.version}` : ''}`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <div className="flex flex-col gap-4">
          <section className="m-card p-0 overflow-hidden" aria-label="Frequently asked questions">
            <div className="px-4 py-2.5 border-b border-hairline-strong flex items-center gap-2">
              <BookOpen size={14} aria-hidden="true" />
              <h2 className="text-[13.5px]">Frequently asked questions</h2>
              <span className="sys-meta ml-auto">{FAQS.length} entries</span>
            </div>
            {FAQS.map((f) => (
              <details key={f.q} className="group border-b border-hairline last:border-b-0">
                <summary className="cursor-pointer list-none px-4 py-2.5 flex items-start gap-2 hover:bg-blue-50/70">
                  <span className="text-[12.5px] font-bold text-ink flex-1">{f.q}</span>
                  <span className="sys-meta shrink-0" lang="hi">
                    {f.qHi}
                  </span>
                  <span className="mono text-[12px] text-ink-muted shrink-0 group-open:hidden">+</span>
                  <span className="mono text-[12px] text-ink-muted shrink-0 hidden group-open:inline">–</span>
                </summary>
                <p className="px-4 pb-3 text-[12.5px] leading-relaxed text-ink-muted bg-blue-50/40">
                  {f.a}
                </p>
              </details>
            ))}
          </section>

          <section className="m-card p-0 overflow-hidden" aria-label="Glossary">
            <div className="px-4 py-2.5 border-b border-hairline-strong flex items-center gap-2">
              <Languages size={14} aria-hidden="true" />
              <h2 className="text-[13.5px]">Working glossary</h2>
              <span className="sys-meta ml-auto">English · हिन्दी · meaning</span>
            </div>
            <table className="m-table">
              <thead>
                <tr>
                  <th scope="col">Term</th>
                  <th scope="col">हिन्दी</th>
                  <th scope="col">Meaning in this portal</th>
                </tr>
              </thead>
              <tbody>
                {GLOSSARY.map(([term, hi, meaning]) => (
                  <tr key={term}>
                    <td className="font-bold">{term}</td>
                    <td lang="hi">{hi}</td>
                    <td>{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="m-card p-3.5" aria-label="Support contacts">
            <h2 className="section-label mb-2 flex items-center gap-1.5">
              <LifeBuoy size={12} aria-hidden="true" />
              Support
            </h2>
            <dl className="kv-grid">
              <dt>Railway enquiry</dt>
              <dd className="num">139</dd>
              <dt>Toll-free</dt>
              <dd className="num">1800-111-139</dd>
              <dt>Portal helpdesk</dt>
              <dd className="break-all">blockplanning-helpdesk@[domain]</dd>
              <dt>Control room</dt>
              <dd>Room 45, Rail Bhawan, New Delhi</dd>
              <dt>Hours</dt>
              <dd>09:00–18:00 IST, Mon–Sat</dd>
            </dl>
            <p className="sys-meta mt-2 leading-relaxed">
              The mail address above is a placeholder in this build; swap it for the operating
              unit's address before deployment. 139 is the standard Indian Railways enquiry number.
            </p>
          </section>

          <section className="m-card p-3.5" aria-label="Role permissions">
            <h2 className="section-label mb-2 flex items-center gap-1.5">
              <ShieldAlert size={12} aria-hidden="true" />
              Role permissions
            </h2>
            <dl className="kv-grid">
              {ROLES.map(([role, what]) => (
                <div key={role} className="contents">
                  <dt>{role}</dt>
                  <dd className="font-sans text-[11.5px] leading-snug">{what}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="m-card p-3.5" aria-label="Keyboard shortcuts">
            <h2 className="section-label mb-2 flex items-center gap-1.5">
              <Keyboard size={12} aria-hidden="true" />
              Keyboard & access
            </h2>
            <ul className="text-[11.5px] leading-relaxed list-disc pl-4 text-ink-muted space-y-1">
              <li>Tab moves through every control; the drawer traps focus and closes on Escape.</li>
              <li>Enter or Space activates a selectable table row.</li>
              <li>A− / A / A+ in the footer strip changes the base font size for the session.</li>
              <li>High-contrast mode swaps the palette without changing layout.</li>
              <li>Tables expose a text summary in the footer, so screen readers get row counts.</li>
            </ul>
          </section>

          <section className="m-card p-3.5" aria-label="Troubleshooting">
            <h2 className="section-label mb-2">First-line troubleshooting</h2>
            <ol className="text-[11.5px] leading-relaxed list-decimal pl-4 text-ink-muted space-y-1">
              <li>Empty tables plus a red banner means the API is down — start it on port 8000.</li>
              <li>Signed out without warning means the token expired; sign in again.</li>
              <li>“403” on approval means your role is not in the approver set.</li>
              <li>Missing KPI columns mean the corridor has no KPI row for the window requested.</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
