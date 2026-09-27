import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, AlertTriangle } from 'lucide-react';
import LegalShell, { H2, P, Bullets } from './LegalShell';

export default function ContactPage() {
  return (
    <LegalShell
      title="Contact & Helpdesk"
      titleHi="संपर्क एवं सहायता"
      updated="27 September 2026"
      refNo="A-ABPS/HELP/2026"
      summary="Where to call, what to quote, and what happens after you raise something."
    >
      <H2>Channels</H2>
      <div className="m-card p-3.5">
        <dl className="kv-grid">
          <dt>Railway enquiry</dt>
          <dd className="num">139</dd>
          <dt>Toll-free</dt>
          <dd className="num">1800-111-139</dd>
          <dt>Portal helpdesk</dt>
          <dd className="break-all">blockplanning-helpdesk@[domain]</dd>
          <dt>Control room</dt>
          <dd>Room 45, Rail Bhawan, New Delhi</dd>
          <dt>Working hours</dt>
          <dd>09:00–18:00 IST, Mon–Sat</dd>
        </dl>
        <p className="sys-meta mt-2 leading-relaxed">
          The mailbox above is a placeholder in this build and must be replaced with the operating
          unit's address before deployment. 139 is the standard Indian Railways enquiry number.
        </p>
      </div>

      <H2>What to include</H2>
      <Bullets
        items={[
          <>
            <strong>Employee id</strong> — the audit trail is keyed to it, so tickets without one
            cannot be matched to the action you took.
          </>,
          <>
            <strong>Record id</strong> — task id, plan id, report id or audit entry number from the
            page you were on.
          </>,
          <>
            <strong>What you expected and what happened</strong> — including the exact wording of
            any error banner.
          </>,
          <>
            <strong>Time</strong> — to the minute, with the time zone, since records are stored in
            UTC and displayed as returned by the API.
          </>,
        ]}
      />

      <H2>Classification of requests</H2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            icon: AlertTriangle,
            label: 'Operational outage',
            body: 'Portal unreachable, approvals failing, data obviously wrong. Raise immediately; treated as an incident.',
          },
          {
            icon: Phone,
            label: 'Access issue',
            body: 'Sign-in refused, role missing, approval returns 403. Route to the administrator of your unit.',
          },
          {
            icon: Mail,
            label: 'Enhancement',
            body: 'New report, extra filter, wording change. Logged and taken up in the next release window.',
          },
        ].map((row) => (
          <div key={row.label} className="border border-hairline rounded-chip p-3 bg-white">
            <row.icon size={14} aria-hidden="true" className="text-navy" />
            <h3 className="text-[12.5px] font-bold mt-1.5">{row.label}</h3>
            <p className="text-[11.5px] leading-snug text-ink-muted mt-1">{row.body}</p>
          </div>
        ))}
      </div>

      <H2>Information requests</H2>
      <P>
        Requests for records held by the system fall under the Right to Information Act, 2005 and
        are handled through the process described on the{' '}
        <Link to="/rti" className="underline text-navy">
          RTI page
        </Link>
        . Do not use the helpdesk mailbox for an RTI application; it will not be treated as a
        valid filing.
      </P>

      <H2>Working rhythm</H2>
      <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <Clock size={13} aria-hidden="true" /> Incident calls acknowledged same working day
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={13} aria-hidden="true" /> Control room attends on site for data issues
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Mail size={13} aria-hidden="true" /> Written replies in the same channel as the request
        </span>
      </p>
    </LegalShell>
  );
}
