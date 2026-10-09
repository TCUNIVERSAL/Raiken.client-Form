import React, { useState } from 'react';
import { ClientIntakeFormData, PartyFormData, UploadedDocument } from '../../types/index.js';
import { DOB_MIN, dobMax, validatePartyAddress, validatePartyDetails } from '../../utils/validation.js';
import { Address, formatAddress, partyHasAnswers, pickAddress } from './formState.js';
import { CheckboxCard, ChoiceCards, DateField, OptionalReveal, TextField, TickIcon } from './fields.js';
import { PhoneField } from './PhoneField.js';
import { FileUpload } from './FileUpload.js';
import { AddressFields } from './AddressFields.js';

interface PeopleStepProps {
  formData: ClientIntakeFormData;
  /** The open person, or -1 when every panel is closed. */
  partyIndex: number;
  errors: Record<string, string>;
  live: Record<string, string>;
  onSelectParty: (index: number) => void;
  onUpdateParty: (index: number, field: keyof PartyFormData, value: string) => void;
  onSetPartyCount: (count: number) => void;
  onAddParty: () => void;
  onRemoveParty: (index: number) => void;
  onAddDocument: (partyId: string, doc: UploadedDocument) => void;
  onRemoveDocument: (partyId: string, docId: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  onAddressChange: (index: number, patch: Partial<Address>) => void;
  onSameAsAbove: (index: number, checked: boolean) => void;
}

export const RESIDENCY_OPTIONS = [
  { value: 'Australian Citizen', label: 'Australian citizen', description: 'I am an Australian citizen.' },
  { value: 'Permanent Resident', label: 'Permanent resident', description: 'I hold an Australian permanent visa.' },
  { value: 'Temporary Resident', label: 'Temporary resident', description: 'I am in Australia on a temporary visa.' }
];

/** People on one contract: 1 to 6. */
export const MAX_SELECTABLE = 6;

export function partyDisplayName(p: PartyFormData): string {
  return [p.firstName, p.lastName].filter(s => s.trim()).join(' ');
}

type PartyState = 'complete' | 'in-progress' | 'not-started';

function partyState(p: PartyFormData): { state: PartyState; missing: number } {
  const missing = Object.keys(validatePartyDetails(p)).length + Object.keys(validatePartyAddress(p)).length;
  if (missing === 0) return { state: 'complete', missing };
  return { state: partyHasAnswers(p) ? 'in-progress' : 'not-started', missing };
}

const ChevronIcon = () => (
  <svg className="rk-chevron" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
    <path d="M5.5 7.5L10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Address questions: the first person types theirs; others can reuse the address of the person above. */
const AddressSection: React.FC<{
  party: PartyFormData;
  index: number;
  role: string;
  previousParty: PartyFormData | undefined;
  errors: Record<string, string>;
  live: Record<string, string>;
  onAddressChange: (patch: Partial<Address>) => void;
  onSameAsAbove: (checked: boolean) => void;
}> = ({ party, index, previousParty, role, errors, live, onAddressChange, onSameAsAbove }) => {
  const previousName = previousParty ? (partyDisplayName(previousParty) || `${role} ${index}`) : '';
  const copied = formatAddress(pickAddress(party));

  return (
    <div className="rk-group">
      <p className="rk-group-title">Home address</p>
      {previousParty && (
        <CheckboxCard
          id={`${party.id}-addr-same`}
          checked={party.sameAddressAsPrevious}
          onChange={onSameAsAbove}
        >
          Same address as {previousName}
        </CheckboxCard>
      )}
      {previousParty && party.sameAddressAsPrevious ? (
        <p className="rk-readonly-address" aria-live="polite">
          {copied || `Enter ${previousName}’s address first and it will be copied here.`}
        </p>
      ) : (
        <AddressFields
          idPrefix={`${party.id}-addr`}
          address={pickAddress(party)}
          errors={errors}
          live={live}
          onChange={onAddressChange}
        />
      )}
    </div>
  );
};

/** One person's questions (details, contact, address, identity). */
const PersonForm: React.FC<{
  party: PartyFormData;
  index: number;
  role: string;
  errors: Record<string, string>;
  live: Record<string, string>;
  previousParty: PartyFormData | undefined;
  onUpdate: (field: keyof PartyFormData, value: string) => void;
  onAddDocument: (doc: UploadedDocument) => void;
  onRemoveDocument: (docId: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  onAddressChange: (patch: Partial<Address>) => void;
  onSameAsAbove: (checked: boolean) => void;
}> = ({
  party, index, role, errors, live, previousParty, onUpdate, onAddDocument, onRemoveDocument, onUploadingChange,
  onAddressChange, onSameAsAbove
}) => {
  const id = (field: string) => `${party.id}-${field}`;
  const ok = (field: keyof PartyFormData) => Boolean(String(party[field]).trim()) && !live[id(field)];

  return (
    <>
      <div className="rk-group">
        <div className="rk-row">
          <TextField id={id('firstName')} label="First name" required autoComplete={index === 0 ? 'given-name' : 'off'}
            value={party.firstName} error={errors[id('firstName')]} onChange={v => onUpdate('firstName', v)} />
          <TextField id={id('lastName')} label="Last name" required autoComplete={index === 0 ? 'family-name' : 'off'}
            value={party.lastName} error={errors[id('lastName')]} onChange={v => onUpdate('lastName', v)} />
        </div>
        <OptionalReveal label="Add middle name" open={Boolean(party.middleName)}>
          <TextField id={id('middleName')} label="Middle name" autoComplete={index === 0 ? 'additional-name' : 'off'}
            value={party.middleName} className="rk-w-half" onChange={v => onUpdate('middleName', v)} />
        </OptionalReveal>
        <DateField
          id={id('dob')}
          label="Date of birth"
          required
          min={DOB_MIN}
          max={dobMax()}
          autoComplete={index === 0 ? 'bday' : 'off'}
          value={party.dob}
          error={errors[id('dob')]}
          valid={ok('dob')}
          className="rk-w-half"
          onChange={v => onUpdate('dob', v)}
        />
        <div className="rk-row">
          <PhoneField id={id('mobile')} label="Mobile" required
            countryCode={party.phoneCountryCode || '+61'}
            phoneNumber={party.mobile}
            onCountryCodeChange={v => onUpdate('phoneCountryCode', v)}
            onPhoneChange={v => onUpdate('mobile', v)}
            error={errors[id('mobile')]} valid={ok('mobile')} />
          <TextField id={id('email')} type="email" inputMode="email" label="Email" required
            autoComplete={index === 0 ? 'email' : 'off'}
            value={party.email} error={errors[id('email')]} valid={ok('email')} onChange={v => onUpdate('email', v)} />
        </div>
      </div>

      <AddressSection
        party={party}
        index={index}
        role={role}
        previousParty={previousParty}
        errors={errors}
        live={live}
        onAddressChange={onAddressChange}
        onSameAsAbove={onSameAsAbove}
      />

      <div className="rk-group">
        <ChoiceCards
          id={id('residencyStatus')}
          label="Residency"
          required
          columns={3}
          options={RESIDENCY_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          value={party.residencyStatus}
          error={errors[id('residencyStatus')]}
          onChange={v => onUpdate('residencyStatus', v)}
        />
        <TextField id={id('occupation')} label="Occupation" required placeholder="e.g. Nurse, Retired, Student" autoComplete="off"
          value={party.occupation} error={errors[id('occupation')]} className="rk-w-half" onChange={v => onUpdate('occupation', v)} />
        <OptionalReveal label="Add photo ID (optional)" open={party.idDocuments.length > 0}>
          <FileUpload
            id={id('idDocuments')}
            label="Photo ID"
            hint="Driver licence, passport or photo card."
            kind="identity"
            partyId={party.id}
            value={party.idDocuments}
            onAdd={onAddDocument}
            onRemove={onRemoveDocument}
            onUploadingChange={onUploadingChange}
          />
        </OptionalReveal>
      </div>
    </>
  );
};

export const PeopleStep: React.FC<PeopleStepProps> = ({
  formData, partyIndex, errors, live, onSelectParty, onUpdateParty, onSetPartyCount,
  onAddParty, onRemoveParty, onAddDocument, onRemoveDocument, onUploadingChange,
  onAddressChange, onSameAsAbove
}) => {
  const role = formData.role;
  const roleLower = role.toLowerCase();
  const total = formData.parties.length;
  /** Index of the person waiting for "Yes, remove" confirmation. */
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  const requestRemove = (index: number) => {
    if (partyHasAnswers(formData.parties[index])) setConfirmRemove(index);
    else index === total - 1 ? onSetPartyCount(total - 1) : onRemoveParty(index);
  };

  const confirmRemoval = () => {
    if (confirmRemove === null) return;
    onRemoveParty(confirmRemove);
    setConfirmRemove(null);
  };

  const ownErrorCount = (p: PartyFormData) => Object.keys(errors).filter(k => k.startsWith(`${p.id}-`)).length;

  return (
    <div className="rk-people">
      <div className="rk-party-list">
        {formData.parties.map((party, i) => {
          const open = i === partyIndex;
          const name = partyDisplayName(party);
          const { state, missing } = partyState(party);
          const shownErrors = ownErrorCount(party);
          const bodyId = `${party.id}-panel`;
          const confirming = confirmRemove === i;

          let badge: React.ReactNode;
          if (shownErrors > 0) badge = <span className="rk-badge rk-badge-error">{shownErrors} to fix</span>;
          else if (state === 'complete') badge = <span className="rk-badge rk-badge-success"><TickIcon /> Complete</span>;
          else if (state === 'in-progress') badge = <span className="rk-badge">{missing} left</span>;
          else badge = <span className="rk-badge rk-badge-muted">Not started</span>;

          return (
            <section key={party.id} className={`rk-party${open ? ' rk-party-open' : ''}${shownErrors ? ' rk-party-has-errors' : ''}`}>
              <div className="rk-party-head">
                <h2 className="rk-party-heading">
                  <button
                    type="button"
                    className="rk-party-toggle"
                    aria-expanded={open}
                    aria-controls={bodyId}
                    onClick={() => onSelectParty(open ? -1 : i)}
                  >
                    <span className="rk-party-number" aria-hidden="true">{i + 1}</span>
                    <span className="rk-party-titles">
                      <span className="rk-party-title">{name || `${role} ${i + 1}`}</span>
                    </span>
                    {badge}
                    <ChevronIcon />
                  </button>
                </h2>
                {i > 0 && !confirming && (
                  <button type="button" className="rk-link-button rk-party-remove" onClick={() => requestRemove(i)}
                    aria-label={`Remove ${role} ${i + 1}${name ? ` (${name})` : ''}`}>
                    Remove
                  </button>
                )}
              </div>

              {confirming && (
                <div className="rk-confirm" role="alertdialog" aria-labelledby={`${party.id}-confirm`}>
                  <p id={`${party.id}-confirm`}>
                    Remove {name || `${role} ${i + 1}`} and their details?
                  </p>
                  <div className="rk-confirm-actions">
                    <button type="button" className="rk-btn rk-btn-danger rk-btn-small" onClick={confirmRemoval}>Yes, remove</button>
                    <button type="button" className="rk-btn rk-btn-secondary rk-btn-small" onClick={() => setConfirmRemove(null)}>Keep</button>
                  </div>
                </div>
              )}

              <div id={bodyId} className="rk-party-body" hidden={!open}>
                {open && (
                  <PersonForm
                    party={party}
                    index={i}
                    role={role}
                    errors={errors}
                    live={live}
                    previousParty={formData.parties[i - 1]}
                    onUpdate={(field, value) => onUpdateParty(i, field, value)}
                    onAddDocument={doc => onAddDocument(party.id, doc)}
                    onRemoveDocument={docId => onRemoveDocument(party.id, docId)}
                    onUploadingChange={onUploadingChange}
                    onAddressChange={patch => onAddressChange(i, patch)}
                    onSameAsAbove={checked => onSameAsAbove(i, checked)}
                  />
                )}
                {open && i < total - 1 && (
                  <div className="rk-party-next">
                    <button type="button" className="rk-btn rk-btn-secondary" onClick={() => onSelectParty(i + 1)}>
                      Continue to {role} {i + 2}
                    </button>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {total < MAX_SELECTABLE && (
        <button type="button" className="rk-add-person" onClick={onAddParty}>
          <span aria-hidden="true">+</span> Add another person
        </button>
      )}
    </div>
  );
};
