import LegalShell, { H2, P, Bullets } from './LegalShell';

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Use"
      titleHi="उपयोग की शर्तें"
      updated="27 September 2026"
      refNo="A-ABPS/ToU/2026"
      summary="Conditions that apply while you use the Block Planning console. By signing in you accept them."
    >
      <H2>Authorised use</H2>
      <Bullets
        items={[
          'Access is limited to personnel of the operating unit with a valid employee id and role.',
          'You are responsible for everything done under your credentials. Do not share a session or leave the console open on an unattended workstation.',
          'Use the portal only for block planning, prioritisation, simulation, reporting and audit functions it provides.',
        ]}
      />

      <H2>Advisory nature of model output</H2>
      <P>
        Priority scores, generated programmes, SHAP explanations and simulation figures are
        advisory inputs to a human decision. They are produced from the data loaded in this system
        and from a model validated on that data. They are not a safety certificate, a train
        movement authority or a substitute for the rule book. Committing a programme is an act of
        the authorised officer and is recorded as such.
      </P>

      <H2>Integrity of the record</H2>
      <P>
        Audit entries are append-only and must not be bypassed by acting outside the application
        against the same database. Attempts to alter stored results, or to approve a programme you
        do not hold rights for, will be refused and logged.
      </P>

      <H2>Availability</H2>
      <P>
        The service may be taken out of planned maintenance or suspended if the underlying data
        feed is found to be unreliable. Continued availability is not guaranteed. Figures reflect
        the database at the moment of request; earlier exports are snapshots and do not refresh.
      </P>

      <H2>External content</H2>
      <P>
        The government open-data panel links to data published by api.data.gov.in. Those datasets
        are governed by the terms of their publisher. Map tiles are © OpenStreetMap contributors.
      </P>

      <H2>Governing law</H2>
      <P>
        These terms are governed by the laws of India. Disputes are subject to the exclusive
        jurisdiction of the courts of the place where the operating unit is headquartered.
      </P>
    </LegalShell>
  );
}
