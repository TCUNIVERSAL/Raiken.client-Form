import React from 'react';
import { ClientIntakeFormData, FinanceFormData, PropertyFormData } from '../../types/index.js';
import { formatDateLong, settlementMax, settlementMin } from '../../utils/validation.js';
import { addDaysIso } from '../../utils/format.js';
import { CheckboxCard, ChoiceCards, CurrencyField, DateField, Notice, OptionalReveal, SelectField, TextField } from './fields.js';
import { FileUpload } from './FileUpload.js';

interface PropertyStepProps {
  formData: ClientIntakeFormData;
  errors: Record<string, string>;
  live: Record<string, string>;
  onPropertyChange: (patch: Partial<PropertyFormData>) => void;
  onFinanceChange: (patch: Partial<FinanceFormData>) => void;
  onHowDidYouHearChange: (value: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}

const HEARD_FROM = ['Google search', 'Facebook', 'Friend or family', 'Real estate agent', 'Mortgage broker', 'I am a returning client', 'Other'];
const SETTLEMENT_PERIODS = [30, 45, 60, 90];

export const PropertyStep: React.FC<PropertyStepProps> = ({
  formData, errors, live, onPropertyChange, onFinanceChange, onHowDidYouHearChange, onUploadingChange
}) => {
  const { property, finance } = formData;
  const isPurchaser = formData.role === 'Purchaser';
  const ok = (id: string, value: string) => Boolean(value.trim()) && !live[id];
  const hasBrokerDetails = Boolean(finance.brokerOrBankerName || finance.lenderName || finance.brokerPhone || finance.brokerEmail);
  // A free-text answer saved before this became a list is still shown
  const heardOptions = formData.howDidYouHear && !HEARD_FROM.includes(formData.howDidYouHear)
    ? [...HEARD_FROM, formData.howDidYouHear]
    : HEARD_FROM;

  return (
    <>
      <section className="rk-panel" aria-label="Property">
        <TextField id="property-addressLine1" label="Property address (SA)" required placeholder="e.g. 12 King William Street"
          autoComplete="off"
          value={property.addressLine1} error={errors['property-addressLine1']}
          onChange={v => onPropertyChange({ addressLine1: v })} />
        <div className="rk-row rk-row-pair">
          <TextField id="property-suburb" label="Suburb" required autoComplete="off"
            value={property.suburb} error={errors['property-suburb']}
            onChange={v => onPropertyChange({ suburb: v })} />
          <TextField id="property-postcode" label="Postcode" required inputMode="numeric" maxLength={4}
            autoComplete="off"
            value={property.postcode} error={errors['property-postcode']} valid={ok('property-postcode', property.postcode)}
            onChange={v => onPropertyChange({ postcode: v.replace(/\D/g, '').slice(0, 4) })} />
        </div>

        <div className="rk-row">
          <CurrencyField
            id="property-purchasePrice"
            label={isPurchaser ? 'Purchase price' : 'Sale price'}
            required={isPurchaser}
            value={property.purchasePrice}
            error={errors['property-purchasePrice']}
            onChange={v => onPropertyChange({ purchasePrice: v })}
          />
          <div>
            <DateField
              id="property-settlementDate"
              label="Settlement date"
              min={settlementMin()}
              max={settlementMax()}
              value={property.settlementDate}
              error={errors['property-settlementDate']}
              onChange={v => onPropertyChange({ settlementDate: v })}
            />
            <div className="rk-chips rk-chips-tight" role="group" aria-label="Quick pick a settlement date, counted from today">
              {SETTLEMENT_PERIODS.map(days => {
                const dateIso = addDaysIso(days);
                const isSelected = property.settlementDate === dateIso;
                return (
                  <button
                    key={days}
                    type="button"
                    className={`rk-chip rk-chip-small${isSelected ? ' rk-chip-active' : ''}`}
                    aria-pressed={isSelected}
                    aria-label={`${days} days from today: ${formatDateLong(dateIso)}`}
                    onClick={() => onPropertyChange({ settlementDate: dateIso })}
                  >
                    {days} days
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {isPurchaser && (
          <ChoiceCards
            id="property-intendedUse"
            label="The property is"
            required
            size="compact"
            options={[
              { value: 'To live in', label: 'To live in' },
              { value: 'For investment', label: 'An investment' }
            ]}
            value={property.intendedUse}
            error={errors['property-intendedUse']}
            onChange={v => onPropertyChange({ intendedUse: v })}
          />
        )}

        {isPurchaser && (
          <ChoiceCards
            id="property-ownershipType"
            label="Own it as"
            required
            columns={3}
            options={[
              { value: 'Joint Tenants', label: 'Joint tenants', description: 'Equal shares' },
              { value: 'Tenants in Common', label: 'Tenants in common', description: 'Set shares, e.g. 60/40' },
              { value: 'Not Sure', label: 'Not sure', description: 'We’ll help you choose' }
            ]}
            value={property.ownershipType}
            error={errors['property-ownershipType']}
            onChange={v => onPropertyChange({ ownershipType: v })}
          />
        )}
      </section>

      <section className="rk-panel" aria-labelledby="finance-title">
        <h2 id="finance-title" className="rk-panel-title">{isPurchaser ? 'Paying for it' : 'Mortgage'}</h2>
        <ChoiceCards
          id="finance-mortgageRequired"
          label={isPurchaser ? 'Taking a mortgage?' : 'Is there a mortgage on the property?'}
          required
          columns={3}
          size="compact"
          options={isPurchaser
            ? [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }, { value: 'Maybe', label: 'Not sure' }]
            : [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]}
          value={finance.mortgageRequired}
          error={errors['finance-mortgageRequired']}
          onChange={v => onFinanceChange({ mortgageRequired: v as FinanceFormData['mortgageRequired'] })}
        />

        {isPurchaser && (
          <OptionalReveal label="Add broker or bank contact" open={hasBrokerDetails}>
            <div className="rk-row">
              <TextField id="finance-brokerOrBankerName" label="Contact name" autoComplete="off"
                value={finance.brokerOrBankerName}
                onChange={v => onFinanceChange({ brokerOrBankerName: v })} />
              <TextField id="finance-lenderName" label="Bank or company" autoComplete="off"
                value={finance.lenderName}
                onChange={v => onFinanceChange({ lenderName: v })} />
            </div>
            <div className="rk-row">
              <TextField id="finance-brokerPhone" type="tel" inputMode="tel" label="Phone" maxLength={20}
                autoComplete="off"
                value={finance.brokerPhone} error={errors['finance-brokerPhone']} valid={ok('finance-brokerPhone', finance.brokerPhone)}
                onChange={v => onFinanceChange({ brokerPhone: v })} />
              <TextField id="finance-brokerEmail" type="email" inputMode="email" label="Email"
                autoComplete="off"
                value={finance.brokerEmail} error={errors['finance-brokerEmail']} valid={ok('finance-brokerEmail', finance.brokerEmail)}
                onChange={v => onFinanceChange({ brokerEmail: v })} />
            </div>
          </OptionalReveal>
        )}

        {isPurchaser && (
          <fieldset id="finance-paysByElectronicTransfer" tabIndex={-1}
            aria-describedby="finance-pay-hint"
            className={`rk-field rk-fieldset${errors['finance-paysByElectronicTransfer'] ? ' rk-invalid' : ''}`}>
            <legend className="rk-label">How will you pay?<span className="rk-req" aria-hidden="true"> *</span><span className="rk-sr-only"> (required)</span></legend>
            <p className="rk-hint" id="finance-pay-hint">Tick all that apply. Required for anti-money-laundering checks.</p>
            <div className="rk-check-list">
              <CheckboxCard id="finance-pay-transfer" checked={finance.paysByElectronicTransfer}
                onChange={checked => onFinanceChange({ paysByElectronicTransfer: checked })}>
                Bank transfer or loan
              </CheckboxCard>
              <CheckboxCard id="finance-pay-cash" checked={finance.paysByCash}
                onChange={checked => onFinanceChange({ paysByCash: checked, cashAmount: checked ? finance.cashAmount : '' })}>
                Cash
              </CheckboxCard>
              {finance.paysByCash && (
                <div className="rk-reveal">
                  <CurrencyField id="finance-cashAmount" label="Cash amount" required
                    value={finance.cashAmount} error={errors['finance-cashAmount']}
                    className="rk-w-half"
                    onChange={v => onFinanceChange({ cashAmount: v })} />
                </div>
              )}
              <CheckboxCard id="finance-pay-virtual" checked={finance.paysByVirtualAssets}
                onChange={checked => onFinanceChange({ paysByVirtualAssets: checked, virtualAssetsAmount: checked ? finance.virtualAssetsAmount : '' })}>
                Cryptocurrency
              </CheckboxCard>
              {finance.paysByVirtualAssets && (
                <div className="rk-reveal">
                  <CurrencyField id="finance-virtualAssetsAmount" label="Amount" required
                    value={finance.virtualAssetsAmount} error={errors['finance-virtualAssetsAmount']}
                    className="rk-w-half"
                    onChange={v => onFinanceChange({ virtualAssetsAmount: v })} />
                </div>
              )}
              <CheckboxCard id="finance-pay-other" checked={finance.paysByOther}
                onChange={checked => onFinanceChange({ paysByOther: checked, otherPaymentDetails: checked ? finance.otherPaymentDetails : '' })}>
                Other
              </CheckboxCard>
              {finance.paysByOther && (
                <div className="rk-reveal">
                  <TextField id="finance-otherPaymentDetails" label="Please describe" required placeholder="e.g. Gift from family" maxLength={300}
                    value={finance.otherPaymentDetails} error={errors['finance-otherPaymentDetails']}
                    onChange={v => onFinanceChange({ otherPaymentDetails: v })} />
                </div>
              )}
            </div>
            {errors['finance-paysByElectronicTransfer'] && (
              <p id="finance-paysByElectronicTransfer-error" className="rk-error">
                <span>{errors['finance-paysByElectronicTransfer']}</span>
              </p>
            )}

            {(finance.paysByVirtualAssets || finance.paysByOther) && (
              <div className="rk-reveal">
                <Notice tone="warning">
                  <p>
                    AUSTRAC rules require proof of where crypto or third-party funds come from.
                    Upload it now or send it to us later.
                  </p>
                </Notice>
                <FileUpload
                  id="finance-sourceOfFunds"
                  label="Proof of funds"
                  hint="Bank statement, wallet history or gift letter."
                  kind="source_of_funds"
                  value={finance.sourceOfFundsDocuments || []}
                  onAdd={doc => onFinanceChange({ sourceOfFundsDocuments: [...(finance.sourceOfFundsDocuments || []), doc] })}
                  onRemove={docId => onFinanceChange({ sourceOfFundsDocuments: (finance.sourceOfFundsDocuments || []).filter(d => d.id !== docId) })}
                  onUploadingChange={onUploadingChange}
                />
              </div>
            )}
          </fieldset>
        )}

        {!isPurchaser && finance.mortgageRequired === 'Yes' && (
          <div className="rk-reveal">
            <TextField id="finance-lenderName" label="Which bank?" required placeholder="e.g. Commonwealth Bank"
              value={finance.lenderName} error={errors['finance-lenderName']} className="rk-w-half"
              onChange={v => onFinanceChange({ lenderName: v })} />
          </div>
        )}

        {isPurchaser && (
          <SelectField
            id="howDidYouHear"
            label="How did you hear about us?"
            placeholder="Choose"
            options={heardOptions.map(h => ({ value: h, label: h }))}
            value={formData.howDidYouHear}
            className="rk-w-half rk-field-last"
            onChange={onHowDidYouHearChange}
          />
        )}
      </section>
    </>
  );
};
