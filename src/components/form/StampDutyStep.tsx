import React from 'react';
import { StampDutyFormData, YesNo } from '../../types/index.js';
import { stampDutyVisibility } from '../../utils/validation.js';
import { ChoiceCards, Notice, OptionalReveal } from './fields.js';

interface StampDutyStepProps {
  stampDuty: StampDutyFormData;
  errors: Record<string, string>;
  onChange: (patch: Partial<StampDutyFormData>) => void;
}

const YES_NO = [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }];

const ELIGIBILITY_CRITERIA = (
  <ul className="rk-criteria">
    <li>At least one buyer is an Australian citizen or permanent resident (New Zealand citizens living here on a Special Category Visa may also apply).</li>
    <li>You are 18 or older and buying as a person — not as a company or trust.</li>
    <li>Neither you nor your spouse / partner has lived for 6 months or more in a home you owned in Australia.</li>
    <li>You have not received first home buyer stamp duty relief before, in any state or territory.</li>
    <li>At least one buyer will live in the home for 6 months in a row, starting within 12 months of settlement.</li>
  </ul>
);

export const StampDutyStep: React.FC<StampDutyStepProps> = ({ stampDuty, errors, onChange }) => {
  const show = stampDutyVisibility(stampDuty);
  const e = (key: string) => errors[`stampDuty-${key}`];

  return (
    <section className="rk-panel" aria-label="Stamp duty relief">

      <ChoiceCards
        id="stampDuty-reliefEligible"
        label="Do you think you’re eligible for stamp duty relief?"
        required
        columns={3}
        size="compact"
        options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }, { value: 'Not Sure', label: 'Not sure' }]}
        value={stampDuty.reliefEligible}
        error={e('reliefEligible')}
        onChange={v => onChange({ reliefEligible: v as StampDutyFormData['reliefEligible'] })}
      />

      {show.firstHomeBuyer && (
        <ChoiceCards id="stampDuty-firstHomeBuyer" label="Are you a first home buyer in Australia?" required
          size="compact" options={YES_NO} value={stampDuty.firstHomeBuyer} error={e('firstHomeBuyer')}
          onChange={v => onChange({ firstHomeBuyer: v as YesNo })} />
      )}

      {show.propertyType && (
        <ChoiceCards
          id="stampDuty-propertyType"
          label="The property is"
          required
          options={[
            { value: 'Vacant Land', label: 'Vacant land' },
            { value: 'Brand New Home', label: 'Brand new home' },
            { value: 'Established Home', label: 'Established home' },
            { value: 'Established Home With Substantial Renovation', label: 'Substantially renovated home' }
          ]}
          value={stampDuty.propertyType}
          error={e('propertyType')}
          onChange={v => onChange({ propertyType: v })}
        />
      )}

      {show.signedAfter && (
        <ChoiceCards id="stampDuty-contractSignedOnOrAfter6Jul2024" label="Was the contract of sale signed on or after 6 July 2024?" required
          size="compact" options={YES_NO} value={stampDuty.contractSignedOnOrAfter6Jul2024} error={e('contractSignedOnOrAfter6Jul2024')}
          onChange={v => onChange({ contractSignedOnOrAfter6Jul2024: v as YesNo })} />
      )}

      {show.signedBetween && (
        <ChoiceCards id="stampDuty-contractSignedBetween15Jun2023And5Jul2024"
          label="Was the contract of sale signed between 15 June 2023 and 5 July 2024?" required
          size="compact" options={YES_NO} value={stampDuty.contractSignedBetween15Jun2023And5Jul2024} error={e('contractSignedBetween15Jun2023And5Jul2024')}
          onChange={v => onChange({ contractSignedBetween15Jun2023And5Jul2024: v as YesNo })} />
      )}

      {show.threshold && (
        <ChoiceCards id="stampDuty-underPriceThreshold"
          label="Is the property a new home under $700,000, or vacant land under $450,000?" required
          size="compact" options={YES_NO} value={stampDuty.underPriceThreshold} error={e('underPriceThreshold')}
          onChange={v => onChange({ underPriceThreshold: v as YesNo })} />
      )}

      {show.criteria && (
        <ChoiceCards id="stampDuty-meetsEligibilityCriteria" label="Do you meet all of the following eligibility criteria?" required
          hint={ELIGIBILITY_CRITERIA}
          size="compact" options={YES_NO} value={stampDuty.meetsEligibilityCriteria} error={e('meetsEligibilityCriteria')}
          onChange={v => onChange({ meetsEligibilityCriteria: v as YesNo })} />
      )}

      {stampDuty.meetsEligibilityCriteria === 'Yes' && (
        <Notice tone="success" role="status">
          <p>You may qualify for relief. Revenue SA makes the final decision; we’ll guide you through it.</p>
        </Notice>
      )}

      {show.notes && (
        <OptionalReveal label="Add a note about stamp duty (optional)" open={Boolean(stampDuty.notes)}>
          <div className="rk-field">
            <label htmlFor="stampDuty-notes" className="rk-label">
              Note <span className="rk-opt">(optional)</span>
            </label>
            <textarea
              id="stampDuty-notes"
              className="rk-input rk-textarea"
              rows={3}
              maxLength={1000}
              placeholder="e.g. My partner owned a unit in Victoria but never lived in it."
              value={stampDuty.notes}
              onChange={ev => onChange({ notes: ev.target.value })}
            />
          </div>
        </OptionalReveal>
      )}
    </section>
  );
};
