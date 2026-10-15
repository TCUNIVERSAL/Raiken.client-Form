import React from 'react';
import { ClientIntakeFormData, PartyFormData, UploadedDocument } from '../../types/index.js';
import { Address, formatAddress, pickAddress } from './formState.js';
import { DateOfBirthField, SelectField, TextField } from './fields.js';
import { PhoneField } from './PhoneField.js';
import { AddressFields } from './AddressFields.js';
import { PersonScreen } from './screens.js';

interface PeopleStepProps {
  formData: ClientIntakeFormData;
  partyIndex: number;
  screen: PersonScreen;
  errors: Record<string, string>;
  onUpdateParty: (index: number, field: keyof PartyFormData, value: any) => void;
  onAddDocument?: (partyId: string, doc: UploadedDocument) => void;
  onRemoveDocument?: (partyId: string, docId: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  onAddressChange: (index: number, patch: Partial<Address>) => void;
  onSameAsAbove: (index: number, checked: boolean) => void;
}
import { MAX_SELECTABLE } from './formState.js';

const RESIDENCY_OPTIONS = [
  { value: 'Australian Citizen', label: 'Australian citizen' },
  { value: 'Permanent Resident', label: 'Permanent resident' },
  { value: 'Temporary Resident', label: 'Temporary resident' }
];

export { MAX_SELECTABLE };

export function partyDisplayName(p: PartyFormData): string {
  if (p.isSingleName) return p.firstName.trim();
  return [p.firstName, p.lastName].filter(s => s.trim()).join(' ');
}

export const PeopleStep: React.FC<PeopleStepProps> = ({
  formData, partyIndex, screen, errors, onUpdateParty,
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
        <TextField
          id={id('firstName')}
          label="First name"
          required
          autoComplete={index === 0 ? 'given-name' : 'off'}
          value={party.firstName}
          error={errors[id('firstName')]}
          onChange={update('firstName')}
        />
        <TextField
          id={id('middleName')}
          label="Middle name"
          autoComplete={index === 0 ? 'additional-name' : 'off'}
          value={party.middleName}
          onChange={update('middleName')}
        />
        <TextField
          id={id('lastName')}
          label="Last name"
          placeholder="Last name"
          wide
          autoComplete={index === 0 ? 'family-name' : 'off'}
          value={party.lastName}
          error={errors[id('lastName')]}
          onChange={update('lastName')}
        />

        <DateOfBirthField
          id={id('dob')}
          label="Date of birth"
          required
          hint="Used to verify your identity with LiveSign."
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
        <TextField id={id('email')} type="email" inputMode="email" label="Email address" required wide
          hint="LiveSign sends the identity check link here."
          autoComplete={index === 0 ? 'email' : 'off'}
          value={party.email} error={errors[id('email')]} onChange={update('email')} />
      </div>
    );
  }

  // People after the first can copy the address above (shown on the address label's line)
  const sameAddress = previous && (
    <label className="rk-inline-check" htmlFor={id('addr-same')}>
      <input
        id={id('addr-same')}
        type="checkbox"
        checked={party.sameAddressAsPrevious}
        onChange={e => onSameAsAbove(index, e.target.checked)}
      />
      Same address as {previousName}
    </label>
  );

  return (
    <>
      <div className="rk-fields">
        {previous && party.sameAddressAsPrevious ? (
          <div className="rk-field rk-wide">
            <div className="rk-field-top">
              <p className="rk-field-label">Current address</p>
              <span className="rk-field-aside">{sameAddress}</span>
            </div>
            <p className="rk-readonly-address" aria-live="polite">
              {formatAddress(pickAddress(party)) || `Enter ${previousName}’s address first and it will be copied here.`}
            </p>
          </div>
        ) : (
          <AddressFields
            idPrefix={id('addr')}
            address={pickAddress(party)}
            errors={errors}
            addressAside={sameAddress}
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
      </div>
    </>
  );
};
