import React from 'react';
import { ClientIntakeFormData, DeclarationFormData, PartyFormData } from '../../types/index.js';
import { formatDateLong, signedDateMin, stampDutyVisibility, todayIso } from '../../utils/validation.js';
import { DateField, ErrorText, TextField } from './fields.js';
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
 * Raikan's details for the client to pass on — shown on the success page.
 * Open on larger screens; on phones it starts closed so the page fits the window.
 */
export const RaikanDetails: React.FC = () => (
  <details className="rk-info-box" open={typeof window === 'undefined' || !window.matchMedia('(max-width: 620px)').matches}>
    <summary className="rk-info-title">Our details for your agent, broker or bank</summary>
    <dl className="rk-info-list">
      <div><dt>Contact</dt><dd>Bhavesh Chaudhari</dd></div>
      <div><dt>Office</dt><dd><a href="tel:+61870769899">08 7076 9899</a></dd></div>
      <div><dt>Email</dt><dd><a href="mailto:conveyancer@rcorpo.com">conveyancer@rcorpo.com</a></dd></div>
      <div><dt>Address</dt><dd>Shop 3, 160 Hampstead Road, Broadview SA 5083</dd></div>
    </dl>
  </details>
);

const join = (...parts: Array<string | false | undefined | null>) => parts.filter(Boolean).join(' · ');

/** One group of answers with its "Change" link. */
const Block: React.FC<{
  title: string;
  onChange: () => void;
  changeLabel: string;
  incomplete?: boolean;
  children: React.ReactNode;
}> = ({ title, onChange, changeLabel, incomplete, children }) => (
  <div className={`rk-review-block${incomplete ? ' rk-review-incomplete' : ''}`}>
    <div className="rk-review-head">
      <h2>
        {title}
        {incomplete && <span className="rk-incomplete">Needs attention</span>}
      </h2>
      <button type="button" className="rk-review-change" onClick={onChange} aria-label={changeLabel}>Change</button>
    </div>
    {children}
  </div>
);

/** The review page: every answer with "Change", then the declaration and signature. */
export const ReviewStep: React.FC<ReviewStepProps> = ({ formData, problems, errors, onDeclarationChange, onEdit, submitError }) => {
  const { role, property, finance, stampDuty, declaration } = formData;
  const isPurchaser = role === 'Purchaser';
  const money = (v: string) => (v ? `$${Number(v).toLocaleString('en-AU')}` : '');
  const sd = stampDutyVisibility(stampDuty);
  const propertyAddress = [property.addressLine1, property.suburb, [property.state, property.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const fundsDocs = finance.sourceOfFundsDocuments || [];
  const stepHasProblem = (s: StepKey, partyIndex?: number) =>
    problems.some(p => p.step === s && (partyIndex === undefined || p.partyIndex === undefined || p.partyIndex === partyIndex));
  const paying = [
    finance.paysByElectronicTransfer && 'Bank transfer or loan',
    finance.paysByCash && `Cash (${money(finance.cashAmount) || 'amount not given'})`,
    finance.paysByVirtualAssets && `Cryptocurrency (${money(finance.virtualAssetsAmount) || 'amount not given'})`,
    finance.paysByOther && `Other: ${finance.otherPaymentDetails}`
  ].filter(Boolean).join(', ');
  const fullName = (p: PartyFormData) => [p.firstName, p.middleName, p.lastName].filter(x => x.trim()).join(' ');

  return (
    <>
      <p className="rk-section-note">Change anything before you send your form.</p>

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

      {formData.parties.map((p, i) => (
        <Block key={p.id} title={`${role} ${i + 1}`} onChange={() => onEdit('people', i)} changeLabel={`Change ${role} ${i + 1}`}
          incomplete={stepHasProblem('people', i)}>
          <p><strong>{fullName(p) || 'Name not entered'}</strong>
            {(p.email || p.mobile) && ` · ${join(p.email, p.mobile && `${p.phoneCountryCode || '+61'} ${p.mobile}`)}`}</p>
          <p>{join(p.dob && `Born ${formatDateLong(p.dob)}`, p.residencyStatus, p.occupation) || 'Details not entered'}</p>
          <p>{formatAddress(pickAddress(p)) || 'Address not entered'}</p>
          {p.idDocuments.length > 0 && <p>ID: {p.idDocuments.map(d => d.fileName).join(', ')}</p>}
        </Block>
      ))}

      <Block title="Property details" onChange={() => onEdit('property')} changeLabel="Change property details" incomplete={stepHasProblem('property')}>
        <p><strong>{propertyAddress || 'Address not entered'}</strong>{property.purchasePrice && ` · ${money(property.purchasePrice)}`}</p>
        <p>{join(
          `Settlement ${formatDateLong(property.settlementDate) || 'not known yet'}`,
          isPurchaser && property.intendedUse,
          isPurchaser && property.ownershipType
        )}</p>
        <p>{join(
          finance.mortgageRequired && `Mortgage: ${finance.mortgageRequired === 'Maybe' ? 'Not sure' : finance.mortgageRequired}`,
          isPurchaser && [finance.brokerOrBankerName, finance.lenderName].filter(Boolean).join(', '),
          !isPurchaser && finance.mortgageRequired === 'Yes' && finance.lenderName
        ) || 'Mortgage not answered'}</p>
        {isPurchaser && <p>Paying by: {paying || 'not answered'}</p>}
        {isPurchaser && (finance.paysByVirtualAssets || finance.paysByOther) && (
          <p>Proof of funds: {fundsDocs.length ? fundsDocs.map(d => d.fileName).join(', ') : 'not uploaded yet'}</p>
        )}
      </Block>

      {isPurchaser && (
        <Block title="Stamp duty" onChange={() => onEdit('stampDuty')} changeLabel="Change stamp duty answers" incomplete={stepHasProblem('stampDuty')}>
          <p>Possible relief: {stampDuty.reliefEligible || 'Not answered'}</p>
          {sd.firstHomeBuyer && stampDuty.firstHomeBuyer && (
            <p>{join(
              `First home buyer: ${stampDuty.firstHomeBuyer}`,
              sd.propertyType && stampDuty.propertyType,
              sd.criteria && stampDuty.meetsEligibilityCriteria && `Meets criteria: ${stampDuty.meetsEligibilityCriteria}`
            )}</p>
          )}
        </Block>
      )}

      <div className="rk-declaration">
        <h2>Declaration</h2>
        {isPurchaser && (
          <>
            <label htmlFor="declaration-coolingOffAcknowledged">
              <input
                id="declaration-coolingOffAcknowledged"
                type="checkbox"
                checked={declaration.coolingOffAcknowledged}
                aria-invalid={Boolean(errors['declaration-coolingOffAcknowledged']) || undefined}
                aria-describedby={errors['declaration-coolingOffAcknowledged'] ? 'declaration-coolingOffAcknowledged-error' : undefined}
                onChange={e => onDeclarationChange({ coolingOffAcknowledged: e.target.checked })}
              />
              <span>I/We confirm that we understand our obligations for cooling-off rights.</span>
            </label>
            <ErrorText id="declaration-coolingOffAcknowledged" error={errors['declaration-coolingOffAcknowledged']} />
          </>
        )}
        <label htmlFor="declaration-authorityToAct">
          <input
            id="declaration-authorityToAct"
            type="checkbox"
            checked={declaration.authorityToAct}
            aria-invalid={Boolean(errors['declaration-authorityToAct']) || undefined}
            aria-describedby={errors['declaration-authorityToAct'] ? 'declaration-authorityToAct-error' : undefined}
            onChange={e => onDeclarationChange({ authorityToAct: e.target.checked })}
          />
          <span>
            I/We authorise the conveyancer to act for this property:
            <span className="rk-declaration-detail">{propertyAddress || 'Property address not entered yet'}</span>
          </span>
        </label>
        <ErrorText id="declaration-authorityToAct" error={errors['declaration-authorityToAct']} />
      </div>

      <div className="rk-fields">
        <SignaturePad
          id="declaration-signatureDataUrl"
          value={declaration.signatureDataUrl}
          error={errors['declaration-signatureDataUrl']}
          onChange={dataUrl => onDeclarationChange({ signatureDataUrl: dataUrl })}
        />
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
          value={declaration.signedDate}
          error={errors['declaration-signedDate']}
          onChange={v => onDeclarationChange({ signedDate: v })}
        />
      </div>
      <p className="rk-hint rk-after-sign">After you send your form, LiveSign will email each person a link to verify their ID.</p>
    </>
  );
};
