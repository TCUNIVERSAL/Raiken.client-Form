import React, { useState } from 'react';
import { AU_STATES, COUNTRIES } from '../../utils/validation.js';
import { Address } from './formState.js';
import { OptionalReveal, SelectField, TextField } from './fields.js';

interface AddressFieldsProps {
  idPrefix: string;
  address: Address;
  errors: Record<string, string>;
  live: Record<string, string>;
  onChange: (patch: Partial<Address>) => void;
}

export const AddressFields: React.FC<AddressFieldsProps> = ({ idPrefix, address, errors, live, onChange }) => {
  const id = (key: string) => `${idPrefix}-${key}`;
  const ok = (key: string, value: string) => Boolean(value.trim()) && !live[id(key)];
  const isAustralia = address.country === 'Australia';
  // Most clients live in Australia, so the country question only appears when asked for
  const [showCountry, setShowCountry] = useState(!isAustralia);

  return (
    <div className="rk-address">
      {showCountry && (
        <SelectField
          id={id('country')}
          label="Country"
          required
          placeholder="Choose a country"
          autoComplete="country-name"
          options={COUNTRIES.map(c => ({ value: c, label: c }))}
          value={address.country}
          error={errors[id('country')]}
          className="rk-w-half"
          // The state list differs by country, so reset it when the country changes
          onChange={v => onChange({ country: v, state: '' })}
        />
      )}
      <TextField
        id={id('addressLine1')}
        label="Street address"
        required
        placeholder="e.g. 160 Hampstead Road"
        autoComplete="address-line1"
        value={address.addressLine1}
        error={errors[id('addressLine1')]}
        onChange={v => onChange({ addressLine1: v })}
      />
      <OptionalReveal label="Add unit or apartment" open={Boolean(address.addressLine2)}>
        <TextField
          id={id('addressLine2')}
          label="Unit or apartment"
          placeholder="e.g. Unit 3"
          autoComplete="address-line2"
          value={address.addressLine2}
          onChange={v => onChange({ addressLine2: v })}
        />
      </OptionalReveal>
      <TextField
        id={id('suburb')}
        label={isAustralia ? 'Suburb' : 'City or town'}
        required
        autoComplete="address-level2"
        value={address.suburb}
        error={errors[id('suburb')]}
        onChange={v => onChange({ suburb: v })}
      />
      <div className="rk-row rk-row-pair">
        {isAustralia ? (
          <SelectField
            id={id('state')}
            label="State"
            required
            placeholder="Choose"
            autoComplete="address-level1"
            options={AU_STATES.map(s => ({ value: s, label: s }))}
            value={address.state}
            error={errors[id('state')]}
            onChange={v => onChange({ state: v })}
          />
        ) : (
          <TextField
            id={id('state')}
            label="State or region"
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
          valid={ok('postcode', address.postcode)}
          onChange={v => onChange({ postcode: v.replace(/\D/g, '').slice(0, 4) })}
        />
      </div>
      {!showCountry && (
        <button type="button" className="rk-add-link" onClick={() => setShowCountry(true)}>
          Lives outside Australia?
        </button>
      )}
    </div>
  );
};
