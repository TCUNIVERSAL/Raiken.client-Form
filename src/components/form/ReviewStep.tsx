import React from 'react';
import { ClientIntakeFormData, DeclarationFormData } from '../../types/index.js';
import { formatDateLong, signedDateMin, stampDutyVisibility, todayIso } from '../../utils/validation.js';
import { CheckboxCard, DateField, TextField } from './fields.js';
import { formatFileSize } from './FileUpload.js';
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
  live: Record<string, string>;
  onDeclarationChange: (patch: Partial<DeclarationFormData>) => void;
  onEdit: (step: StepKey, partyIndex?: number) => void;
  submitError: string | null;
}

/** Raikan's details for the client to pass on — shown on the success page. */
export const RaikanDetails: React.FC = () => (
  <div className="rk-info-box">
    <p className="rk-info-title">Our details for your agent, broker or bank</p>
    <dl className="rk-info-list">
      <div><dt>Contact</dt><dd>Bhavesh Chaudhari</dd></div>
      <div><dt>Office</dt><dd><a href="tel:+61870769899">08 7076 9899</a></dd></div>
      <div><dt>Email</dt><dd><a href="mailto:conveyancer@rcorpo.com">conveyancer@rcorpo.com</a></dd></div>
      <div><dt>Address</dt><dd>Shop 3, 160 Hampstead Road, Broadview SA 5083</dd></div>
    </dl>
  </div>
);

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className={`rk-summary-row${value ? '' : ' rk-summary-empty'}`}>
    <dt>{label}</dt>
    <dd>{value || 'Not provided'}</dd>
  </div>
);

const Section: React.FC<{
  title: string;
  onEdit: () => void;
  editLabel: string;
  incomplete?: boolean;
  children: React.ReactNode;
}> = ({ title, onEdit, editLabel, incomplete, children }) => (
  <section className={`rk-panel rk-review-section${incomplete ? ' rk-review-incomplete' : ''}`}>
    <div className="rk-summary-head">
      <h2 className="rk-panel-title">
        {title}
        {incomplete && <span className="rk-badge rk-badge-error">Needs attention</span>}
      </h2>
      <button type="button" className="rk-btn rk-btn-secondary rk-btn-small" onClick={onEdit} aria-label={editLabel}>Edit</button>
    </div>
    <dl className="rk-summary">{children}</dl>
  </section>
);

export const ReviewStep: React.FC<ReviewStepProps> = ({ formData, problems, errors, live, onDeclarationChange, onEdit, submitError }) => {
  const { role, property, finance, stampDuty, declaration } = formData;
  const isPurchaser = role === 'Purchaser';
  const money = (v: string) => (v ? `$${Number(v).toLocaleString('en-AU')}` : undefined);
  const sd = stampDutyVisibility(stampDuty);
  const propertyAddress = [property.addressLine1, property.suburb, [property.state, property.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const fundsDocs = finance.sourceOfFundsDocuments || [];
  const stepHasProblem = (s: StepKey, partyIndex?: number) =>
    problems.some(p => p.step === s && (partyIndex === undefined || p.partyIndex === undefined || p.partyIndex === partyIndex));

  return (
    <>
      {problems.length > 0 && (
        <div className="rk-error-summary" role="alert">
          <p className="rk-error-summary-title">A few answers are missing:</p>
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
          <p className="rk-error-summary-title">The form could not be sent</p>
          <p>{submitError} Your answers are saved, so you can try again.</p>
        </div>
      )}

      {formData.parties.map((p, i) => (
        <Section
          key={p.id}
          title={`${role} ${i + 1}`}
          onEdit={() => onEdit('people', i)}
          editLabel={`Edit ${role} ${i + 1}`}
          incomplete={stepHasProblem('people', i)}
        >
          <Row label="Name" value={[p.firstName, p.middleName, p.lastName].filter(s => s.trim()).join(' ')} />
          <Row label="Date of birth" value={formatDateLong(p.dob)} />
          <Row label="Mobile" value={p.mobile ? `${p.phoneCountryCode || '+61'} ${p.mobile}` : undefined} />
          <Row label="Email" value={p.email} />
          <Row label="Address" value={formatAddress(pickAddress(p))} />
          <Row label="Residency" value={p.residencyStatus} />
          <Row label="Occupation" value={p.occupation} />
          {p.idDocuments.length > 0 && <Row label="Photo ID" value={p.idDocuments.map(d => `${d.fileName} (${formatFileSize(d.sizeBytes)})`).join(', ')} />}
        </Section>
      ))}

      <Section title="Property" onEdit={() => onEdit('property')} editLabel="Edit property details" incomplete={stepHasProblem('property')}>
        <Row label="Address" value={propertyAddress} />
        <Row label={isPurchaser ? 'Purchase price' : 'Sale price'} value={money(property.purchasePrice)} />
        <Row label="Settlement" value={formatDateLong(property.settlementDate) || 'Not known yet'} />
        {isPurchaser && <Row label="Property is for" value={property.intendedUse} />}
        {isPurchaser && <Row label="Ownership" value={property.ownershipType} />}
        <Row label={isPurchaser ? 'Taking a mortgage' : 'Mortgage on property'} value={finance.mortgageRequired} />
        {isPurchaser && (
          <Row label="Banker or broker" value={[finance.brokerOrBankerName, finance.lenderName, finance.brokerPhone, finance.brokerEmail].filter(Boolean).join(' · ')} />
        )}
        {isPurchaser && <Row label="Paying by" value={[
          finance.paysByElectronicTransfer && 'Bank transfer',
          finance.paysByCash && `Cash (${money(finance.cashAmount) || 'amount not given'})`,
          finance.paysByVirtualAssets && `Cryptocurrency (${money(finance.virtualAssetsAmount) || 'amount not given'})`,
          finance.paysByOther && `Other: ${finance.otherPaymentDetails}`
        ].filter(Boolean).join(', ')} />}
        {isPurchaser && (finance.paysByVirtualAssets || finance.paysByOther) && (
          <Row label="Evidence of funds" value={fundsDocs.length ? fundsDocs.map(d => d.fileName).join(', ') : 'Not uploaded yet'} />
        )}
        {!isPurchaser && finance.mortgageRequired === 'Yes' && <Row label="Bank" value={finance.lenderName} />}
        {isPurchaser && formData.howDidYouHear && <Row label="Heard about us" value={formData.howDidYouHear} />}
      </Section>


      {isPurchaser && (
        <Section title="Stamp duty relief" onEdit={() => onEdit('stampDuty')} editLabel="Edit stamp duty answers" incomplete={stepHasProblem('stampDuty')}>
          <Row label="Eligible for relief" value={stampDuty.reliefEligible} />
          {sd.firstHomeBuyer && <Row label="First home buyer" value={stampDuty.firstHomeBuyer} />}
          {sd.propertyType && <Row label="Property is" value={stampDuty.propertyType} />}
          {sd.signedAfter && <Row label="Signed on/after 6 Jul 2024" value={stampDuty.contractSignedOnOrAfter6Jul2024} />}
          {sd.signedBetween && <Row label="Signed 15 Jun 2023 – 5 Jul 2024" value={stampDuty.contractSignedBetween15Jun2023And5Jul2024} />}
          {sd.threshold && <Row label="Under price limit" value={stampDuty.underPriceThreshold} />}
          {sd.criteria && <Row label="Meets criteria" value={stampDuty.meetsEligibilityCriteria} />}
          {sd.notes && stampDuty.notes && <Row label="Notes" value={stampDuty.notes} />}
        </Section>
      )}

      <section className="rk-panel rk-declaration" aria-labelledby="declaration-title">
        <h2 id="declaration-title" className="rk-panel-title">Sign</h2>

        {isPurchaser && (
          <CheckboxCard
            id="declaration-coolingOffAcknowledged"
            required
            checked={declaration.coolingOffAcknowledged}
            error={errors['declaration-coolingOffAcknowledged']}
            onChange={checked => onDeclarationChange({ coolingOffAcknowledged: checked })}
          >
            I/We confirm that we understand our obligations for cooling-off rights.
          </CheckboxCard>
        )}
        <CheckboxCard
          id="declaration-authorityToAct"
          required
          checked={declaration.authorityToAct}
          error={errors['declaration-authorityToAct']}
          description={propertyAddress || 'Property address not entered yet'}
          onChange={checked => onDeclarationChange({ authorityToAct: checked })}
        >
          I/We authorise the conveyancer to act for this property:
        </CheckboxCard>

        <SignaturePad
          id="declaration-signatureDataUrl"
          value={declaration.signatureDataUrl}
          error={errors['declaration-signatureDataUrl']}
          onChange={dataUrl => onDeclarationChange({ signatureDataUrl: dataUrl })}
        />
        <div className="rk-row">
          <TextField
            id="declaration-signedName"
            label="Full name"
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
            value={declaration.signedDate}
            error={errors['declaration-signedDate']}
            onChange={v => onDeclarationChange({ signedDate: v })}
          />
        </div>
        <p className="rk-hint rk-field-last">After you submit, LiveSign will email each person a link to verify their ID.</p>
      </section>
    </>
  );
};
