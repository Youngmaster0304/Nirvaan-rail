import LegalShell, { H2, P, Bullets } from './LegalShell';

export default function DisclaimerPage() {
  return (
    <LegalShell
      title="Disclaimer"
      titleHi="अस्वीकरण"
      updated="27 September 2026"
      refNo="A-ABPS/DISC/2026"
      summary="The limits of what this portal and its model output can be relied upon for."
    >
      <H2>Model output is advisory</H2>
      <P>
        Priority scores, generated block programmes, SHAP explanations and simulation comparisons
        are produced by a statistical model trained on the data loaded in this system. They are
        inputs to a decision that remains with the authorised railway officer. Nothing on this
        screen authorises, substitutes for or overrides the rule book, a signal indication, a
        movement order or a written instruction from competent authority.
      </P>

      <H2>No guarantee of outcome</H2>
      <Bullets
        items={[
          'Simulated delay, throughput and capacity figures are estimates under stated assumptions. Actual traffic behaves differently.',
          'Health indices are computed from KPI rows that may be days old; check the date shown with each figure.',
          'Where a field is absent from the API response the console prints “—”. A dash means “not available”, never “zero”.',
          'Corridor geometry is drawn from the station graph supplied by the API and may not match surveyed alignment.',
        ]}
      />

      <H2>Data sources</H2>
      <P>
        Operational figures come from the application database of this unit. Government open-data
        records are reproduced as published by their source and have not been independently
        verified here. Map data and tiles are © OpenStreetMap contributors. Where a live fetch
        fails, a bundled fallback is displayed and labelled as such on the panel itself.
      </P>

      <H2>Prototype status</H2>
      <P>
        This build is an operational prototype. Contact addresses marked as placeholders, demo
        credentials on the sign-in page and any seed data loaded for demonstration must be
        removed or replaced before the system is used for live decision support.
      </P>

      <H2>Liability</H2>
      <P>
        To the extent permitted by law, the operating unit is not responsible for decisions taken
        solely on the basis of figures displayed here without cross-checking against the source
        records, nor for consequences of unauthorised access under shared credentials.
      </P>

      <H2>Report a discrepancy</H2>
      <P>
        If a figure on this portal disagrees with the source register, treat the source register
        as correct and raise the discrepancy through the contact channels. Corrections are made in
        the database, and the change appears in the audit trail.
      </P>
    </LegalShell>
  );
}
