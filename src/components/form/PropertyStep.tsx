import React from 'react';
import { ClientIntakeFormData, FinanceFormData, PropertyFormData } from '../../types/index.js';
import { settlementMax, settlementMin } from '../../utils/validation.js';
import { CurrencyField, DateField, SelectField, TextField } from './fields.js';
import { PropertyScreen } from './screens.js';

interface PropertyStepProps {
  formData: ClientIntakeFormData;
  /** Page 1: the property. Page 2 (buyers only): the mortgage and broker details. */
  screen: PropertyScreen;
  errors: Record<string, string>;
  onPropertyChange: (patch: Partial<PropertyFormData>) => void;
  onFinanceChange: (patch: Partial<FinanceFormData>) => void;
  onHowDidYouHearChange: (value: string) => void;
}

/**
 * The property step. Buyers answer it over two pages (the property, then the mortgage and their broker);
 * sellers have no broker questions, so their mortgage question sits on the property page.
 */
export const PropertyStep: React.FC<PropertyStepProps> = ({
  formData, screen, errors, onPropertyChange, onFinanceChange, onHowDidYouHearChange
}) => {
  const { property, finance } = formData;
  const isPurchaser = formData.role === 'Purchaser';
  const hasBrokerDetails = Boolean(finance.brokerOrBankerName || finance.brokerPhone || finance.brokerEmail || finance.lenderName);
  const showBroker = isPurchaser && (finance.mortgageRequired === 'Yes' || hasBrokerDetails);

  const mortgage = (
    <SelectField
      id="finance-mortgageRequired"
      label={isPurchaser ? 'Are you taking a mortgage?' : 'Is there a mortgage on the property?'}
      required
      placeholder="Select an option"
      options={isPurchaser
        ? [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }, { value: 'Maybe', label: 'Not sure' }]
        : [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]}
      value={finance.mortgageRequired}
      error={errors['finance-mortgageRequired']}
      onChange={v => onFinanceChange({ mortgageRequired: v as FinanceFormData['mortgageRequired'] })}
    />
  );

  if (screen === 'finance') {
    return (
      <>
        <div className="rk-fields">
          {mortgage}
        </div>

        {showBroker && (
          <div className="rk-conditional rk-conditional-spaced">
            <h2 className="rk-group-title">My banker / mortgage broker details <span className="rk-optional">(optional)</span></h2>
            <div className="rk-fields">
              <TextField id="finance-brokerOrBankerName" label="Name" autoComplete="off"
                value={finance.brokerOrBankerName} onChange={v => onFinanceChange({ brokerOrBankerName: v })} />
              <TextField id="finance-brokerPhone" type="tel" inputMode="tel" label="Contact number" maxLength={20} autoComplete="off"
                value={finance.brokerPhone} error={errors['finance-brokerPhone']}
                onChange={v => onFinanceChange({ brokerPhone: v })} />
              <TextField id="finance-brokerEmail" type="email" inputMode="email" label="Email address" autoComplete="off"
                value={finance.brokerEmail} error={errors['finance-brokerEmail']}
                onChange={v => onFinanceChange({ brokerEmail: v })} />
              <TextField id="finance-lenderName" label="Company name" autoComplete="off"
                value={finance.lenderName} onChange={v => onFinanceChange({ lenderName: v })} />
            </div>
          </div>
        )}

        <div className="rk-fields rk-fields-spaced">
          <TextField id="howDidYouHear" label="How did you hear about us?" autoComplete="off"
            value={formData.howDidYouHear} onChange={onHowDidYouHearChange} />
        </div>
      </>
    );
  }

  return (
    <div className="rk-fields">
      <CurrencyField
        id="property-purchasePrice"
        label={isPurchaser ? 'Purchase price' : 'Sale price'}
        required={isPurchaser}
        value={property.purchasePrice}
        error={errors['property-purchasePrice']}
        onChange={v => onPropertyChange({ purchasePrice: v })}
      />
      <DateField
        id="property-settlementDate"
        label="Settlement date"
        hint="Leave blank if you do not know the date yet."
        min={settlementMin()}
        max={settlementMax()}
        value={property.settlementDate}
        error={errors['property-settlementDate']}
        onChange={v => onPropertyChange({ settlementDate: v })}
      />

      <TextField id="property-addressLine1" label="Property address" required autoComplete="off"
        value={property.addressLine1} error={errors['property-addressLine1']}
        onChange={v => onPropertyChange({ addressLine1: v })} />
      <TextField id="property-suburb" label="Suburb / town / locality" required autoComplete="off"
        value={property.suburb} error={errors['property-suburb']}
        onChange={v => onPropertyChange({ suburb: v })} />
      <SelectField
        id="property-state"
        label="State / territory"
        required
        options={[{ value: 'SA', label: 'SA' }]}
        value={property.state || 'SA'}
        onChange={() => onPropertyChange({ state: 'SA' })}
      />
      <TextField id="property-postcode" label="Postcode" required inputMode="numeric" maxLength={4} autoComplete="off"
        value={property.postcode} error={errors['property-postcode']}
        onChange={v => onPropertyChange({ postcode: v.replace(/\D/g, '').slice(0, 4) })} />

      {isPurchaser ? (
        <>
          <SelectField
            id="property-intendedUse"
            label="This property is for"
            required
            placeholder="Select purpose"
            options={[
              { value: 'To live in', label: 'Living in' },
              { value: 'For investment', label: 'Investment' }
            ]}
            value={property.intendedUse}
            error={errors['property-intendedUse']}
            onChange={v => onPropertyChange({ intendedUse: v })}
          />
          <SelectField
            id="property-ownershipType"
            label="Type of ownership"
            required
            placeholder="Select ownership type"
            hint={formData.parties.length > 1
              ? 'How multiple purchasers will hold the title (Joint Tenants or Tenants in Common).'
              : 'How the property title will be held.'}
            options={formData.parties.length > 1 ? [
              { value: 'Joint Tenants', label: 'Joint Tenants' },
              { value: 'Tenants in Common', label: 'Tenants in Common' }
            ] : [
              { value: 'Sole Owner', label: 'Sole Owner' },
              { value: 'Joint Tenants', label: 'Joint Tenants' },
              { value: 'Tenants in Common', label: 'Tenants in Common' }
            ]}
            value={property.ownershipType}
            error={errors['property-ownershipType']}
            onChange={v => onPropertyChange({ ownershipType: v })}
          />
        </>
      ) : (
        <>
          {mortgage}
          {finance.mortgageRequired === 'Yes' && (
            <TextField id="finance-lenderName" label="Bank name" required
              value={finance.lenderName} error={errors['finance-lenderName']}
              onChange={v => onFinanceChange({ lenderName: v })} />
          )}
        </>
      )}
    </div>
  );
};
