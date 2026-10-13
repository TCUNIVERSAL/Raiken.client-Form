import React from 'react';
import { ClientIntakeFormData, PartyFormData, UploadedDocument } from '../../types/index.js';
import { DOB_MIN, dobMax } from '../../utils/validation.js';
import { Address, formatAddress, pickAddress } from './formState.js';
import { CheckboxCard, DateField, SelectField, TextField } from './fields.js';
import { PhoneField } from './PhoneField.js';
import { FileUpload } from './FileUpload.js';
import { AddressFields } from './AddressFields.js';
import { PersonScreen } from './screens.js';

interface PeopleStepProps {
  formData: ClientIntakeFormData;
  partyIndex: number;
  screen: PersonScreen;
  errors: Record<string, string>;
  onUpdateParty: (index: number, field: keyof PartyFormData, value: string) => void;
  onAddDocument: (partyId: string, doc: UploadedDocument) => void;
  onRemoveDocument: (partyId: string, docId: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  onAddressChange: (index: number, patch: Partial<Address>) => void;
  onSameAsAbove: (index: number, checked: boolean) => void;
}

export const RESIDENCY_OPTIONS = [
  { value: 'Australian Citizen', label: 'Australian citizen' },
  { value: 'Permanent Resident', label: 'Permanent resident' },
  { value: 'Temporary Resident', label: 'Temporary resident' }
];

/** People on one contract: 1 to 6. */
export const MAX_SELECTABLE = 6;

export function partyDisplayName(p: PartyFormData): string {
  return [p.firstName, p.lastName].filter(s => s.trim()).join(' ');
}

export const PeopleStep: React.FC<PeopleStepProps> = ({
  formData, partyIndex, screen, errors, onUpdateParty, onAddDocument, onRemoveDocument, onUploadingChange,
  onAddressChange, onSameAsAbove
}) => {
  const role = formData.role;
  const total = formData.parties.length;
  const index = Math.min(Math.max(partyIndex, 0), total - 1);
  const party = formData.parties[index];
  const previous = formData.parties[index - 1];
  const id = (field: string) => `${party.id}-${field}`;
  const update = (field: keyof PartyFormData) => (value: string) => onUpdateParty(index, field, value);
  const previousName = previous ? (partyDisplayName(previous) || `${role} ${index}`) : '';

  if (screen === 'details') {
    return (
      <div className="rk-fields">
        <TextField id={id('firstName')} label="First name" required autoComplete={index === 0 ? 'given-name' : 'off'}
          value={party.firstName} error={errors[id('firstName')]} onChange={update('firstName')} />
        <TextField id={id('middleName')} label="Middle name" autoComplete={index === 0 ? 'additional-name' : 'off'}
          value={party.middleName} onChange={update('middleName')} />
        <TextField id={id('lastName')} label="Last name" required autoComplete={index === 0 ? 'family-name' : 'off'}
          value={party.lastName} error={errors[id('lastName')]} onChange={update('lastName')} />
        <DateField
          id={id('dob')}
          label="Date of birth"
          required
          hint="Used to verify your identity."
          min={DOB_MIN}
          max={dobMax()}
          autoComplete={index === 0 ? 'bday' : 'off'}
          value={party.dob}
          error={errors[id('dob')]}
          onChange={update('dob')}
        />
        <PhoneField
          id={id('mobile')}
          label="Phone number"
          required
          hint="Needed for the identity check."
          countryCode={party.phoneCountryCode || '+61'}
          phoneNumber={party.mobile}
          onCountryCodeChange={update('phoneCountryCode')}
          onPhoneChange={update('mobile')}
          error={errors[id('mobile')]}
        />
        <TextField id={id('email')} type="email" inputMode="email" label="Email address" required
          hint="LiveSign sends the identity check link here."
          autoComplete={index === 0 ? 'email' : 'off'}
          value={party.email} error={errors[id('email')]} onChange={update('email')} />
      </div>
    );
  }

  return (
    <>
      {previous && (
        <div className="rk-choice-row rk-same-address">
          <CheckboxCard id={id('addr-same')} checked={party.sameAddressAsPrevious} onChange={checked => onSameAsAbove(index, checked)}>
            Same address as {previousName}
          </CheckboxCard>
        </div>
      )}
      <div className="rk-fields">
        {previous && party.sameAddressAsPrevious ? (
          <p className="rk-readonly-address" aria-live="polite">
            {formatAddress(pickAddress(party)) || `Enter ${previousName}’s address first and it will be copied here.`}
          </p>
        ) : (
          <AddressFields
            idPrefix={id('addr')}
            address={pickAddress(party)}
            errors={errors}
            onChange={patch => onAddressChange(index, patch)}
          />
        )}
        <SelectField
          id={id('residencyStatus')}
          label="Residency status"
          required
          options={RESIDENCY_OPTIONS}
          value={party.residencyStatus}
          error={errors[id('residencyStatus')]}
          onChange={update('residencyStatus')}
        />
        <TextField id={id('occupation')} label="Occupation" required autoComplete="off"
          value={party.occupation} error={errors[id('occupation')]} onChange={update('occupation')} />
        <FileUpload
          id={id('idDocuments')}
          label="Identity documents"
          hint="Driving licence, passport, or photo card."
          kind="identity"
          partyId={party.id}
          value={party.idDocuments}
          onAdd={doc => onAddDocument(party.id, doc)}
          onRemove={docId => onRemoveDocument(party.id, docId)}
          onUploadingChange={onUploadingChange}
        />
      </div>
    </>
  );
};
