import { Link } from 'react-router-dom';
import LegalShell, { H2, P, Bullets } from './LegalShell';

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      titleHi="गोपनीयता नीति"
      updated="27 September 2026"
      refNo="A-ABPS/PRIV/2026"
      summary="What this portal reads, what it stores, and who can see it. Written for officers and staff whose work data appears in the system, not for visitors."
    >
      <H2>Data this portal processes</H2>
      <Bullets
        items={[
          <>
            <strong>Account data:</strong> employee id, display name and role, provided by the
            authentication service at sign-in and used to decide which actions you may perform.
          </>,
          <>
            <strong>Operational data:</strong> maintenance tasks, corridors, KPI rows, block
            programmes and simulation results held in the application database. These records are
            business data of the operating unit, not personal profiles.
          </>,
          <>
            <strong>Action data:</strong> every prioritisation run, approval, rejection, override
            and report generation is written to the audit trail with your employee id, the action,
            the target record and any reason you typed.
          </>,
          <>
            <strong>Session data:</strong> a session token is kept in the browser's local storage
            so the console stays signed in between page loads. It is cleared on sign-out and
            automatically on a rejected token.
          </>,
        ]}
      />

      <H2>What this portal does not collect</H2>
      <P>
        No location tracking, no advertising identifiers, no behavioural analytics, no third-party
        tracking scripts and no payment data. The map on the corridor page requests raster tiles
        from OpenStreetMap; that request carries your IP address to the tile server like any other
        web request.
      </P>

      <H2>How long records are kept</H2>
      <P>
        Operational records follow the retention schedule of the operating unit. Audit entries are
        append-only: they are not edited or deleted from this interface, because the trail exists
        for supervisory and audit review. Session tokens are held only in the browser and expire
        with the session.
      </P>

      <H2>Who can see what</H2>
      <P>
        Access is role based. Viewers see dashboards and registers; approvers additionally see
        approval controls and the audit trail. The server enforces this, not the interface — a
        restricted action returns 403 regardless of what is rendered on screen.
      </P>

      <H2>Sharing</H2>
      <P>
        Data is not sold, brokered or shared with third parties. Disclosure happens only under a
        lawful request, or inside the operating unit where the record belongs. The government
        open-data panel reads published data.gov.in datasets; nothing you do is sent back to that
        service.
      </P>

      <H2>Changes and contact</H2>
      <P>
        Any change to this policy is published on this page with a new review date. Questions
        about the data held about you should go to the control room contact listed on the{' '}
        <Link to="/contact" className="underline text-navy">
          contact page
        </Link>
        , quoting your employee id.
      </P>
    </LegalShell>
  );
}
