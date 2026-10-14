import React, { useState } from 'react';
import { AU_STATES, COUNTRIES } from '../../utils/validation.js';
import { Address } from './formState.js';
import { SelectField, TextField } from './fields.js';

interface AddressFieldsProps {
  idPrefix: string;
  address: Address;
  errors: Record<string, string>;
  onChange: (patch: Partial<Address>) => void;
  /** Shown on the address label's line, before "Live outside Australia?" */
  addressAside?: React.ReactNode;
}

/** Address boxes for a person, rendered inside a two-column `.rk-fields` grid. */
export const AddressFields: React.FC<AddressFieldsProps> = ({ idPrefix, address, errors, onChange, addressAside }) => {
  const id = (key: string) => `${idPrefix}-${key}`;
  const isAustralia = address.country === 'Australia';
  // Most clients live in Australia, so the country question only appears when asked for
  const [showCountry, setShowCountry] = useState(!isAustralia);

  return (
    <>
      {showCountry && (
        <SelectField
          id={id('country')}
          label="Country"
          required
          autoComplete="country-name"
          options={COUNTRIES.map(c => ({ value: c, label: c }))}
          value={address.country}
          error={errors[id('country')]}
          wide
          // The state list differs by country, so reset it when the country changes
          onChange={v => onChange({ country: v, state: '' })}
        />
      )}
      <TextField
        id={id('addressLine1')}
        label="Current address"
        required
        autoComplete="address-line1"
        value={address.addressLine1}
        error={errors[id('addressLine1')]}
        aside={(addressAside || !showCountry) && (
          <>
            {addressAside}
            {!showCountry && (
              <button type="button" className="rk-link-button" onClick={() => setShowCountry(true)}>
                Live outside Australia?
              </button>
            )}
          </>
        )}
        onChange={v => onChange({ addressLine1: v })}
      />
      <TextField
        id={id('addressLine2')}
        label="Unit / apartment"
        autoComplete="address-line2"
        value={address.addressLine2}
        onChange={v => onChange({ addressLine2: v })}
      />
      <TextField
        id={id('suburb')}
        label="Suburb / town / locality"
        required
        autoComplete="address-level2"
        value={address.suburb}
        error={errors[id('suburb')]}
        onChange={v => onChange({ suburb: v })}
      />
      {isAustralia ? (
        <SelectField
          id={id('state')}
          label="State / territory"
          required
          autoComplete="address-level1"
          options={AU_STATES.map(s => ({ value: s, label: s }))}
          value={address.state}
          error={errors[id('state')]}
          onChange={v => onChange({ state: v })}
        />
      ) : (
        <TextField
          id={id('state')}
          label="State / region"
          required
          autoComplete="address-level1"
          value={address.state}
          error={errors[id('state')]}
          onChange={v => onChange({ state: v })}
        />
      )}
      <TextField
        id={id('postcode')}
        label="Postcode"
        required
        autoComplete="postal-code"
        inputMode="numeric"
        maxLength={4}
        value={address.postcode}
        error={errors[id('postcode')]}
        onChange={v => onChange({ postcode: v.replace(/\D/g, '').slice(0, 4) })}
      />
    </>
  );
};
