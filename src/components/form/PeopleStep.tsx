import React from 'react';
import { ClientIntakeFormData, PartyFormData, UploadedDocument } from '../../types/index.js';
import { DOB_MIN, dobMax } from '../../utils/validation.js';
import { Address, pickAddress } from './formState.js';
import { CheckboxCard, DateField, SelectField, Suggestions, TextField } from './fields.js';
import { PhoneField } from './PhoneField.js';
import { FileUpload } from './FileUpload.js';
import { AddressFields } from './AddressFields.js';

interface PeopleStepProps {
  formData: ClientIntakeFormData;
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

const OCCUPATION_SUGGESTIONS = ['Retired', 'Student', 'Self-employed', 'Business owner', 'Home duties', 'Not currently working'];

/** Realistic maximum: 1–6 people on a single contract */
const MAX_SELECTABLE = 6;
const PARTY_COUNT_OPTIONS = Array.from({ length: MAX_SELECTABLE }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1)
}));

export function partyDisplayName(p: PartyFormData): string {
  return [p.firstName, p.lastName].filter(s => s.trim()).join(' ');
}

/** Renders address fields for a party, with "Same As Above" / "Add New Address" for party 2+ */
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

  // For party 2+ show a dropdown: "Same As Above" or "Add New Address"
  if (previousParty) {
    const addressChoice = party.sameAddressAsPrevious ? 'same' : 'new';

    return (
      <div className="rk-address-section">
        <h3 className="rk-section-label">Add Address</h3>
        <SelectField
          id={`${party.id}-addr-choice`}
          label="- select a option -"
          placeholder="- select a option -"
          options={[
            { value: 'same', label: 'Same As Above' },
            { value: 'new', label: 'Add New Address' }
          ]}
          value={addressChoice}
          onChange={v => onSameAsAbove(v === 'same')}
        />
        {addressChoice === 'same' ? (
          <div className="rk-address-copied">
            <p className="rk-hint">Address copied from {partyDisplayName(previousParty) || `${role} ${index}`}.</p>
          </div>
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
  }

  // First party: full address form
  return (
    <div className="rk-address-section">
      <h3 className="rk-section-label">Current Address</h3>
      <AddressFields
        idPrefix={`${party.id}-addr`}
        address={pickAddress(party)}
        errors={errors}
        live={live}
        onChange={onAddressChange}
      />
    </div>
  );
};

/** Renders a single person's complete form (details + address). */
const PersonForm: React.FC<{
  party: PartyFormData;
  index: number;
  total: number;
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
  party, index, total, role, errors, live,
  previousParty, onUpdate, onAddDocument, onRemoveDocument, onUploadingChange,
  onAddressChange, onSameAsAbove
}) => {
  const id = (field: string) => `${party.id}-${field}`;
  const ok = (field: keyof PartyFormData) => Boolean(String(party[field]).trim()) && !live[id(field)];

  return (
    <div className="rk-person-card" aria-labelledby={`${party.id}-title`}>
      {/* Separator line between people */}
      {index > 0 && <hr className="rk-person-divider" />}

      {/* Heading */}
      <h2 id={`${party.id}-title`} className="rk-person-heading">
        {role} {index + 1}
      </h2>

      {/* ─── Name row: 3 columns ─── */}
      <div className="rk-name-row">
        <TextField id={id('firstName')} label="First Name" required placeholder="First Name" autoComplete="given-name"
          value={party.firstName} error={errors[id('firstName')]} valid={ok('firstName')} onChange={v => onUpdate('firstName', v)} />
        <TextField id={id('middleName')} label="Middle Name" placeholder="Middle Name" autoComplete="additional-name"
          value={party.middleName} valid={ok('middleName')} onChange={v => onUpdate('middleName', v)} />
        <TextField id={id('lastName')} label="Last Name" required placeholder="Last Name" autoComplete="family-name"
          value={party.lastName} error={errors[id('lastName')]} valid={ok('lastName')} onChange={v => onUpdate('lastName', v)} />
      </div>

      {/* ─── Phone + Email row ─── */}
      <div className="rk-contact-row">
        <PhoneField id={id('mobile')} label="Your Phone number" required
          countryCode={party.phoneCountryCode || '+61'}
          phoneNumber={party.mobile}
          onCountryCodeChange={v => onUpdate('phoneCountryCode', v)}
          onPhoneChange={v => onUpdate('mobile', v)}
          error={errors[id('mobile')]} valid={ok('mobile')} />
        <TextField id={id('email')} type="email" inputMode="email" label="Your E-mail Address" required
          placeholder="Your E-mail Address" autoComplete="email"
          value={party.email} error={errors[id('email')]} valid={ok('email')} onChange={v => onUpdate('email', v)} />
      </div>

      {/* ─── DOB ─── */}
      <div className="rk-dob-row">
        <DateField
          id={id('dob')}
          label="Date of Birth"
          required
          min={DOB_MIN}
          max={dobMax()}
          autoComplete="bday"
          value={party.dob}
          error={errors[id('dob')]}
          valid={ok('dob')}
          onChange={v => onUpdate('dob', v)}
        />
      </div>

      {/* ─── Address ─── */}
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

      {/* ─── Residency + ID ─── */}
      <div className="rk-extras-row">
        <SelectField
          id={id('residencyStatus')}
          label="Choose Residency Status"
          required
          placeholder="Choose Residency Status"
          options={RESIDENCY_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          value={party.residencyStatus}
          error={errors[id('residencyStatus')]}
          valid={Boolean(party.residencyStatus) && !live[id('residencyStatus')]}
          onChange={v => onUpdate('residencyStatus', v)}
        />
        <FileUpload
          id={id('idDocuments')}
          label="Upload your ID documents..."
          hint="(Driving License, Passport, Photo Card)"
          kind="identity"
          partyId={party.id}
          value={party.idDocuments}
          onAdd={onAddDocument}
          onRemove={onRemoveDocument}
          onUploadingChange={onUploadingChange}
        />
      </div>

      {/* ─── Occupation ─── */}
      <TextField id={id('occupation')} label="Occupation" required placeholder="e.g. Nurse" autoComplete="organization-title"
        value={party.occupation} error={errors[id('occupation')]} valid={ok('occupation')} onChange={v => onUpdate('occupation', v)} />
      <Suggestions items={OCCUPATION_SUGGESTIONS} current={party.occupation} onPick={v => onUpdate('occupation', v)} />
    </div>
  );
};

export const PeopleStep: React.FC<PeopleStepProps> = ({
  formData, partyIndex, errors, live, onSelectParty, onUpdateParty, onSetPartyCount,
  onAddParty, onRemoveParty, onAddDocument, onRemoveDocument, onUploadingChange,
  onAddressChange, onSameAsAbove
}) => {
  const role = formData.role;
  const total = formData.parties.length;

  return (
    <section className="rk-panel rk-people-panel">
      {/* ─── Number selector ─── */}
      <div className="rk-count-selector">
        <label className="rk-count-label">
          Number of {role}s <span className="rk-req" aria-hidden="true">*</span>:
        </label>
        <div className="rk-stepper-control-row">
          <div className="rk-stepper-control" role="group" aria-label={`Number of ${role}s`}>
            <button
              type="button"
              className="rk-stepper-btn rk-stepper-btn-minus"
              onClick={() => onSetPartyCount(Math.max(1, total - 1))}
              disabled={total <= 1}
              aria-label={`Decrease number of ${role.toLowerCase()}s`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            <span className="rk-stepper-count-num" aria-live="polite" aria-atomic="true">
              {total}
            </span>

            <button
              type="button"
              className="rk-stepper-btn rk-stepper-btn-plus"
              onClick={() => onSetPartyCount(Math.min(MAX_SELECTABLE, total + 1))}
              disabled={total >= MAX_SELECTABLE}
              aria-label={`Increase number of ${role.toLowerCase()}s`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <span className="rk-stepper-text">
            {total} {total === 1 ? role.toLowerCase() : `${role.toLowerCase()}s`} on the contract
          </span>
        </div>
      </div>

      {/* ─── All people on this page ─── */}
      {formData.parties.map((party, i) => (
        <PersonForm
          key={party.id}
          party={party}
          index={i}
          total={total}
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
      ))}
    </section>
  );
};
