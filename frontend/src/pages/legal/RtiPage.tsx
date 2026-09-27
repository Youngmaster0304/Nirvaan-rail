import LegalShell, { H2, P, Bullets } from './LegalShell';

export default function RtiPage() {
  return (
    <LegalShell
      title="Right to Information"
      titleHi="सूचना का अधिकार"
      updated="27 September 2026"
      refNo="A-ABPS/RTI/2026"
      summary="How to request information held in this system under the Right to Information Act, 2005, and what the system already publishes on its own."
    >
      <H2>Information available on request</H2>
      <Bullets
        items={[
          'Maintenance task records, including department, defect, severity and status, for a period you specify.',
          'Block programmes and their approval status, including who approved or rejected them and when.',
          'The audit trail entries relating to a particular record, subject to the exemptions below.',
          'Corridor KPI values and the date each value was recorded.',
          'Reports previously generated through the portal, where they still exist in the report cache.',
        ]}
      />

      <H2>How to apply</H2>
      <P>
        Submit an application in writing to the Public Information Officer of the operating unit,
        in English, Hindi or the official language of the State, giving your name, address for
        correspondence, and a clear description of the information sought. Applications may also
        be filed in person during working hours. Fees are charged as prescribed for the RTI
        Rules; inspection of records may be arranged on appointment.
      </P>
      <div className="m-card p-3.5">
        <dl className="kv-grid">
          <dt>Public Information Officer</dt>
          <dd className="font-sans text-[11.5px]">[To be notified by the operating unit]</dd>
          <dt>First appeal</dt>
          <dd className="font-sans text-[11.5px]">
            Appellate Authority, within 30 days of the decision
          </dd>
          <dt>Statutory reply</dt>
          <dd>Within 30 days of receipt</dd>
          <dt>If refused</dt>
          <dd>Reasons recorded in writing under Section 7(8)</dd>
        </dl>
        <p className="sys-meta mt-2 leading-relaxed">
          Officer names and postal details are placeholders in this build and must be completed by
          the operating unit before publication.
        </p>
      </div>

      <H2>Information proactively disclosed</H2>
      <P>
        Under Section 4 of the Act, the following is made available here without a request: the
        organisation's contact channels, the role matrix controlling access, this policy set
        (privacy, terms, disclaimer, RTI), and the operational registers that any signed-in officer
        is entitled to see.
      </P>

      <H2>Exemptions that may apply</H2>
      <P>
        Disclosure may be refused to the extent it would reveal personal information unrelated to
        public activity, trade secrets of a third party, information received in confidence, or
        anything that would impede an investigation or the safety of the public. Reasons and the
        appeal route are always given in writing when a request is refused.
      </P>

      <H2>Scope note</H2>
      <P>
        The portal holds operational planning records. It does not hold recruitment files,
        inspection reports of other departments, or the personal service records of staff; those
        are held by the establishment section and must be requested from them directly.
      </P>
    </LegalShell>
  );
}
