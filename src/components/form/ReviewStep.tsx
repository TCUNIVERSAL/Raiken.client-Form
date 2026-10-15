import React, { useEffect, useState } from 'react';
import { ClientIntakeFormData, DeclarationFormData, PartyFormData } from '../../types/index.js';
import { formatDateLong, signedDateMin, stampDutyVisibility, todayIso } from '../../utils/validation.js';
import { DateField, TextField } from './fields.js';
import { formatAddress, pickAddress, StepKey } from './formState.js';
import { SignaturePad } from './SignaturePad.js';

export interface ReviewProblem {
  step: StepKey;
  partyIndex?: number;
  message: string;
}

interface ReviewStepProps {
  formData: ClientIntakeFormData;
  problems: ReviewProblem[];
  errors: Record<string, string>;
  onDeclarationChange: (patch: Partial<DeclarationFormData>) => void;
  onEdit: (step: StepKey, partyIndex?: number) => void;
  submitError: string | null;
}

/**
 * Raikan's details for the client to pass on to their agent, broker or bank —
 * always shown, at the end of the review page and again on the success page.
 */
export const RaikanDetails: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <div className={`rk-info-box${compact ? ' rk-info-compact' : ''}`}>
    <p className="rk-info-title">Provide the following details to your real estate agent, mortgage broker or bank</p>
    <dl className="rk-info-list">
      <div><dt>Company name</dt><dd>Raikan Corporation</dd></div>
      <div><dt>Contact name</dt><dd>Bhavesh Chaudhari</dd></div>
      <div><dt>Office</dt><dd><a href="tel:+61870769899">08 7076 9899</a></dd></div>
      <div><dt>Email</dt><dd><a href="mailto:conveyancer@rcorpo.com">conveyancer@rcorpo.com</a></dd></div>
      <div><dt>Address</dt><dd>Shop 3, 160 Hampstead Road, Broadview SA 5083</dd></div>
    </dl>
  </div>
);

const join = (...parts: Array<string | false | undefined | null>) => parts.filter(Boolean).join(' · ');

type Row = [label: string, value: string];

interface Section {
  key: string;
  title: string;
  /** One short line on the card. */
  summary: string;
  changeLabel: string;
  onChange: () => void;
  incomplete: boolean;
  /** Every answer, shown in the panel below the cards. */
  rows: Row[];
}

const USE_LABELS: Record<string, string> = { 'To live in': 'Living in', 'For investment': 'Investment' };
const MORTGAGE_LABELS: Record<string, string> = { Yes: 'Yes', No: 'No', Maybe: 'Not sure' };
const PROPERTY_TYPE_LABELS: Record<string, string> = {
  'Vacant Land': 'Vacant land',
  'Brand New Home': 'New home',
  'Established Home': 'Established home',
  'Established Home With Substantial Renovation': 'Substantially renovated home'
};

/** The review page: answer cards (open one to see every answer), then the signature and declaration. */
export const ReviewStep: React.FC<ReviewStepProps> = ({ formData, problems, errors, onDeclarationChange, onEdit, submitError }) => {
  const { role, property, finance, stampDuty, declaration } = formData;
  const isPurchaser = role === 'Purchaser';
  /** The card whose answers are shown below the cards (null = none). */
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Autofill the date with today's date when the form is being reviewed / filled
  useEffect(() => {
    if (!declaration.signedDate || declaration.signedDate !== todayIso()) {
      onDeclarationChange({ signedDate: todayIso() });
    }
  }, []);

  const money = (v: string) => (v ? `$${Number(v).toLocaleString('en-AU')}` : '');
  const sd = stampDutyVisibility(stampDuty);
  const propertyAddress = [property.addressLine1, property.suburb, [property.state, property.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const stepHasProblem = (s: StepKey, partyIndex?: number) =>
    problems.some(p => p.step === s && (partyIndex === undefined || p.partyIndex === undefined || p.partyIndex === partyIndex));
  const coolingError = errors['declaration-coolingOffAcknowledged'];
  const authorityError = errors['declaration-authorityToAct'];
  const declarationError = coolingError && authorityError ? 'Please tick both boxes.' : coolingError || authorityError;
  const fullName = (p: PartyFormData) => {
    if (p.isSingleName) return p.firstName.trim();
    return [p.firstName, p.middleName, p.lastName].filter(x => x.trim()).join(' ');
  };

  const sections: Section[] = [
    ...formData.parties.map((p, i): Section => ({
      key: p.id,
      title: `${role} ${i + 1}`,
      summary: fullName(p) || 'Name not entered',
      changeLabel: `Change ${role} ${i + 1}`,
      onChange: () => onEdit('people', i),
      incomplete: stepHasProblem('people', i),
      rows: [
        ['Full name', fullName(p)],
        ['Email', p.email],
        ['Phone', p.mobile ? `${p.phoneCountryCode || '+61'} ${p.mobile}` : ''],
        ['Date of birth', formatDateLong(p.dob)],
        ['Residency status', p.residencyStatus],
        ['Occupation', p.occupation],
        ['Current address', formatAddress(pickAddress(p))]
      ]
    })),
    {
      key: 'property',
      title: 'Property',
      summary: join(property.suburb, money(property.purchasePrice)) || 'Not entered',
      changeLabel: 'Change property details',
      onChange: () => onEdit('property'),
      incomplete: stepHasProblem('property'),
      rows: [
        ['Property address', propertyAddress],
        [isPurchaser ? 'Purchase price' : 'Sale price', money(property.purchasePrice)],
        ['Settlement date', formatDateLong(property.settlementDate) || 'Not known yet'],
        ...(isPurchaser ? [['This property is for', USE_LABELS[property.intendedUse] || property.intendedUse] as Row] : []),
        ...(isPurchaser && property.ownershipType ? [['Type of ownership', property.ownershipType] as Row] : []),
        ['Mortgage', MORTGAGE_LABELS[finance.mortgageRequired] || ''],
        ...(isPurchaser
          ? ([
            ['Broker or banker', finance.brokerOrBankerName],
            ['Broker phone', finance.brokerPhone],
            ['Broker email', finance.brokerEmail],
            ['Broker company', finance.lenderName],
            ['Heard about us', formData.howDidYouHear]
          ] as Row[]).filter(([, value]) => value)
          : finance.mortgageRequired === 'Yes' ? [['Bank name', finance.lenderName] as Row] : [])
      ]
    },
    ...(isPurchaser ? [{
      key: 'stampDuty',
      title: 'Stamp duty',
      summary: `Possible relief: ${stampDuty.reliefEligible || 'not answered'}`,
      changeLabel: 'Change stamp duty answers',
      onChange: () => onEdit('stampDuty'),
      incomplete: stepHasProblem('stampDuty'),
      rows: [
        ['Possible relief', stampDuty.reliefEligible],
        ...(sd.firstHomeBuyer ? [['First home buyer', stampDuty.firstHomeBuyer] as Row] : []),
        ...(sd.propertyType ? [['Property type', PROPERTY_TYPE_LABELS[stampDuty.propertyType] || stampDuty.propertyType] as Row] : []),
        ...(sd.signedAfter ? [['Signed on or after 6 July 2024', stampDuty.contractSignedOnOrAfter6Jul2024] as Row] : []),
        ...(sd.signedBetween ? [['Signed 15 June 2023 – 5 July 2024', stampDuty.contractSignedBetween15Jun2023And5Jul2024] as Row] : []),
        ...(sd.threshold ? [['Under the price threshold', stampDuty.underPriceThreshold] as Row] : []),
        ...(sd.criteria ? [['Meets the eligibility criteria', stampDuty.meetsEligibilityCriteria] as Row] : [])
      ]
    } as Section] : [])
  ];
  const open = sections.find(s => s.key === openKey);

  return (
    <>
      {problems.length > 0 && (
        <div className="rk-error-summary" role="alert">
          <strong>Some details are missing</strong>
          <ul>
            {problems.map((p, i) => (
              <li key={i}>
                <a href="#" onClick={e => { e.preventDefault(); onEdit(p.step, p.partyIndex); }}>{p.message}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {submitError && (
        <div className="rk-error-summary" role="alert">
          <strong>The form could not be sent</strong>
          <p>{submitError} Your answers are saved, so you can try again.</p>
        </div>
      )}

      {/* One card per section; a card opens every answer of that section in a panel below the cards */}
      <div className="rk-review-grid">
        {sections.map(s => (
          <div key={s.key} className={`rk-review-card${openKey === s.key ? ' rk-open' : ''}${s.incomplete ? ' rk-review-incomplete' : ''}`}>
            <button
              type="button"
              className="rk-review-toggle"
              aria-expanded={openKey === s.key}
              aria-controls="rk-review-panel"
              onClick={() => setOpenKey(k => (k === s.key ? null : s.key))}
            >
              <span className="rk-review-title">{s.title}</span>
              <span className="rk-review-summary">{s.summary}</span>
              {s.incomplete && <span className="rk-incomplete">Needs attention</span>}
            </button>
            <button type="button" className="rk-review-change" onClick={s.onChange} aria-label={s.changeLabel}>Change</button>
          </div>
        ))}
      </div>

      {open && (
        <section id="rk-review-panel" className="rk-review-panel" aria-labelledby="rk-review-panel-title">
          <div className="rk-review-panel-head">
            <h2 id="rk-review-panel-title">{open.title}</h2>
            <button type="button" className="rk-link-button" onClick={open.onChange} aria-label={open.changeLabel}>Change</button>
            <button type="button" className="rk-review-close" onClick={() => setOpenKey(null)} aria-label={`Close ${open.title} answers`}>×</button>
          </div>
          <dl className="rk-review-dl">
            {open.rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || <span className="rk-not-entered">Not entered</span>}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Sign first (signature, with full name and date beside it), then the declaration */}
      <div className="rk-sign-grid">
        <SignaturePad
          id="declaration-signatureDataUrl"
          value={declaration.signatureDataUrl}
          error={errors['declaration-signatureDataUrl']}
          onChange={dataUrl => onDeclarationChange({ signatureDataUrl: dataUrl })}
        />
        <div className="rk-sign-side">
          <TextField
            id="declaration-signedName"
            label="Your full name"
            required
            autoComplete="name"
            value={declaration.signedName}
            error={errors['declaration-signedName']}
            onChange={v => onDeclarationChange({ signedName: v })}
          />
          <DateField
            id="declaration-signedDate"
            label="Date"
            required
            min={signedDateMin()}
            max={todayIso()}
            value={declaration.signedDate || todayIso()}
            error={errors['declaration-signedDate']}
            onChange={v => onDeclarationChange({ signedDate: v })}
          />
        </div>
      </div>

      {/* Then the declaration, with Raikan's details for the client's agent, broker or bank beside it */}
      <div className="rk-declare-grid">
        <div className="rk-declaration">
          {/* One message beside the heading (instead of one per box) keeps the page within the window */}
          <div className="rk-declaration-head">
            <h2>Declaration</h2>
            {declarationError && <p className="rk-error" id="declaration-error">{declarationError}</p>}
          </div>
          {isPurchaser && (
            <>
              <label htmlFor="declaration-coolingOffAcknowledged" className={coolingError ? 'rk-has-error' : undefined}>
                <input
                  id="declaration-coolingOffAcknowledged"
                  type="checkbox"
                  checked={declaration.coolingOffAcknowledged}
                  aria-invalid={Boolean(errors['declaration-coolingOffAcknowledged']) || undefined}
                  aria-describedby={coolingError ? 'declaration-error' : undefined}
                  onChange={e => onDeclarationChange({ coolingOffAcknowledged: e.target.checked })}
                />
                <span>I/We confirm that we understand our obligations for cooling-off rights.</span>
              </label>
            </>
          )}
          <label htmlFor="declaration-authorityToAct" className={authorityError ? 'rk-has-error' : undefined}>
            <input
              id="declaration-authorityToAct"
              type="checkbox"
              checked={declaration.authorityToAct}
              aria-invalid={Boolean(errors['declaration-authorityToAct']) || undefined}
              aria-describedby={authorityError ? 'declaration-error' : undefined}
              onChange={e => onDeclarationChange({ authorityToAct: e.target.checked })}
            />
            <span>
              I/We authorise the conveyancer to act for this property:
              <span className="rk-declaration-detail">{propertyAddress || 'Property address not entered yet'}</span>
            </span>
          </label>
        </div>
        <RaikanDetails compact />
      </div>
    </>
  );
};
