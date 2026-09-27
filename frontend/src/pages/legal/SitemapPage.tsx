import { Link } from 'react-router-dom';
import { LayoutDashboard, ListChecks, CalendarRange, CalendarDays, Map, FlaskConical, ScrollText, FileBarChart, LifeBuoy, ShieldCheck, FileText, Phone, AlertTriangle, Landmark, Network } from 'lucide-react';
import LegalShell, { H2, P } from './LegalShell';

interface SiteEntry {
  path: string;
  title: string;
  titleHi: string;
  desc: string;
  source: string;
  icon: typeof LayoutDashboard;
}

const OPERATIONS: SiteEntry[] = [
  { path: '/', title: 'Operations dashboard', titleHi: 'संचालन डैशबोर्ड', desc: 'Five KPI cards, corridor health register, recent activity, system alerts and the three quick actions.', source: 'GET /tasks · /corridors/kpis · /optimize/plans · /audit', icon: LayoutDashboard },
  { path: '/tasks', title: 'Task prioritisation', titleHi: 'कार्य प्राथमिकता', desc: 'Ranked maintenance register with filters, SHAP explanation drawer, bulk approve and reject.', source: 'GET /tasks · /prioritize · /prioritize/shap', icon: ListChecks },
  { path: '/block-planning', title: 'Block planning', titleHi: 'ब्लॉक नियोजन', desc: 'Day, department and status view of a plan with a Gantt or register, plus approval controls.', source: 'GET /optimize/plans · /optimize/plans/{id} · POST /approve · /reject', icon: CalendarRange },
  { path: '/weekly', title: 'Weekly programme', titleHi: 'साप्ताहिक कार्यक्रम', desc: 'Generate and inspect a seven-day programme, then approve, reject or export it.', source: 'POST /optimize/weekly · GET /optimize/plans', icon: CalendarDays },
  { path: '/monthly', title: 'Monthly programme', titleHi: 'मासिक कार्यक्रम', desc: 'Thirty-day horizon with the same generation, approval and export workflow.', source: 'POST /optimize/monthly · GET /optimize/plans', icon: CalendarDays },
  { path: '/corridor-map', title: 'Corridor map', titleHi: 'गलियारा मानचित्र', desc: 'Station graph per corridor with health-coloured links and the corridor register below it.', source: 'GET /corridors · /corridors/{id}/topology · /corridors/kpis', icon: Map },
  { path: '/simulation', title: 'Impact simulation', titleHi: 'प्रभाव अनुकरण', desc: 'Runs the simulator and compares AI scheduling with the manual baseline, metric by metric.', source: 'POST /simulate · GET /simulate/results/{plan_id}', icon: FlaskConical },
  { path: '/audit', title: 'Audit trail', titleHi: 'लेखापरीक्षा', desc: 'Append-only action log with filters on action, entity and date, and spreadsheet export.', source: 'GET /audit', icon: ScrollText },
  { path: '/reports', title: 'Reports', titleHi: 'रिपोर्ट', desc: 'Five report types, CSV download, and the government open-data panel.', source: 'POST /reports/generate · GET /gov/datasets · /gov/railway-live', icon: FileBarChart },
  { path: '/help', title: 'Help & support', titleHi: 'सहायता', desc: 'FAQ, glossary, role matrix, accessibility notes and API health check.', source: 'GET /health', icon: LifeBuoy },
];

const STATUTORY: SiteEntry[] = [
  { path: '/privacy', title: 'Privacy policy', titleHi: 'गोपनीयता नीति', desc: 'What is processed, for how long, who can see it, and what is not collected.', source: 'Published without a session', icon: ShieldCheck },
  { path: '/terms', title: 'Terms of use', titleHi: 'उपयोग की शर्तें', desc: 'Authorised use, advisory status of model output, record integrity and governing law.', source: 'Published without a session', icon: FileText },
  { path: '/contact', title: 'Contact & helpdesk', titleHi: 'संपर्क', desc: 'Channels, what to quote when raising a request, and how requests are classified.', source: 'Published without a session', icon: Phone },
  { path: '/disclaimer', title: 'Disclaimer', titleHi: 'अस्वीकरण', desc: 'Limits of the model, treatment of missing fields, data sources and prototype status.', source: 'Published without a session', icon: AlertTriangle },
  { path: '/rti', title: 'Right to information', titleHi: 'सूचना का अधिकार', desc: 'Information available, how to apply, proactive disclosure and applicable exemptions.', source: 'Published without a session', icon: Landmark },
  { path: '/sitemap', title: 'Sitemap', titleHi: 'साइट मानचित्र', desc: 'This page — every route, its purpose and the endpoint it reads.', source: 'Published without a session', icon: Network },
];

const Entry = ({ item }: { item: SiteEntry }) => (
  <Link
    to={item.path}
    className="flex items-start gap-3 border border-hairline rounded-chip p-3 bg-white hover:border-navy hover:bg-blue-50/60 transition-colors"
  >
    <item.icon size={15} aria-hidden="true" className="text-navy mt-0.5 shrink-0" />
    <span className="min-w-0">
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[12.5px] font-bold text-ink">{item.title}</span>
        <span className="sys-meta" lang="hi">
          {item.titleHi}
        </span>
        <span className="mono text-[10.5px] text-navy">{item.path}</span>
      </span>
      <span className="block text-[11.5px] leading-snug text-ink-muted mt-0.5">{item.desc}</span>
      <span className="block sys-meta mt-1">{item.source}</span>
    </span>
  </Link>
);

export default function SitemapPage() {
  return (
    <LegalShell
      title="Sitemap"
      titleHi="साइट मानचित्र"
      updated="27 September 2026"
      refNo="A-ABPS/SITE/2026"
      summary="Every page in the console, what it is for, and the API endpoint it reads from. Pages under /tasks and above need a session; the statutory pages do not."
    >
      <H2>Operations</H2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {OPERATIONS.map((item) => (
          <Entry key={item.path} item={item} />
        ))}
      </div>

      <H2>Statutory</H2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {STATUTORY.map((item) => (
          <Entry key={item.path} item={item} />
        ))}
      </div>

      <H2>Legacy addresses</H2>
      <P>
        Earlier URLs remain valid and redirect to their current address: <span className="mono">/dashboard</span>{' '}
        to <span className="mono">/</span>, <span className="mono">/weekly-plans</span> to{' '}
        <span className="mono">/weekly</span>, <span className="mono">/monthly-plans</span> to{' '}
        <span className="mono">/monthly</span>, <span className="mono">/blocks</span> to{' '}
        <span className="mono">/block-planning</span>, and <span className="mono">/map</span> to{' '}
        <span className="mono">/corridor-map</span>. Any other address returns to the dashboard.
      </P>
    </LegalShell>
  );
}
