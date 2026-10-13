import React from 'react';
import { ClientIntakeFormData, FinanceFormData, PropertyFormData } from '../../types/index.js';
import { formatDateLong, settlementMax, settlementMin } from '../../utils/validation.js';
import { addDaysIso } from '../../utils/format.js';
import { CheckboxCard, CurrencyField, DateField, ErrorText, Notice, SelectField, TextField } from './fields.js';
import { FileUpload } from './FileUpload.js';
import { PropertyScreen } from './screens.js';

interface PropertyStepProps {
  formData: ClientIntakeFormData;
  /** Page 1: the property itself. Page 2: mortgage and how it will be paid for. */
  screen: PropertyScreen;
  errors: Record<string, string>;
  onPropertyChange: (patch: Partial<PropertyFormData>) => void;
  onFinanceChange: (patch: Partial<FinanceFormData>) => void;
  onHowDidYouHearChange: (value: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}

const SETTLEMENT_PERIODS = [30, 45, 60, 90];

type Part = 'price' | 'address' | 'ownership' | 'mortgage' | 'lender' | 'payment' | 'amounts' | 'proof' | 'howDidYouHear';

/** The property step, over two pages: the property and its ownership, then the mortgage and payment. */
export const PropertyStep: React.FC<PropertyStepProps> = ({
  formData, screen, errors, onPropertyChange, onFinanceChange, onHowDidYouHearChange, onUploadingChange
}) => {
  const { property, finance } = formData;
  const isPurchaser = formData.role === 'Purchaser';
  const payError = errors['finance-paysByElectronicTransfer'];
  const hasBrokerDetails = Boolean(finance.brokerOrBankerName || finance.brokerPhone || finance.brokerEmail || finance.lenderName);
  const showBroker = isPurchaser && (finance.mortgageRequired === 'Yes' || hasBrokerDetails);
  const paysOtherWays = isPurchaser && (finance.paysByCash || finance.paysByVirtualAssets || finance.paysByOther);
  const needsProof = isPurchaser && (finance.paysByVirtualAssets || finance.paysByOther);

  const part = (name: Part): React.ReactNode => {
    switch (name) {
      case 'price':
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
            >
              <div className="rk-quick-picks" role="group" aria-label="Quick pick a settlement date, counted from today">
                {SETTLEMENT_PERIODS.map(days => {
                  const dateIso = addDaysIso(days);
                  return (
                    <button
                      key={days}
                      type="button"
                      className="rk-quick-pick"
                      aria-pressed={property.settlementDate === dateIso}
                      aria-label={`${days} days from today: ${formatDateLong(dateIso)}`}
                      onClick={() => onPropertyChange({ settlementDate: dateIso })}
                    >
                      {days} days
                    </button>
                  );
                })}
              </div>
            </DateField>
          </div>
        );

      case 'address':
        return (
          <div className="rk-fields">
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
          </div>
        );

      case 'ownership':
        return (
          <div className="rk-fields">
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
              label="How would you like to own the property?"
              required
              placeholder="Select ownership type"
              hint="Choose 'Not sure' if you would like to discuss this."
              options={[
                { value: 'Joint Tenants', label: 'Joint tenants' },
                { value: 'Tenants in Common', label: 'Tenants in common' },
                { value: 'Not Sure', label: 'Not sure' }
              ]}
              value={property.ownershipType}
              error={errors['property-ownershipType']}
              onChange={v => onPropertyChange({ ownershipType: v })}
            />
          </div>
        );

      case 'mortgage':
        return (
          <>
            <div className="rk-fields">
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
            </div>
            {!isPurchaser && finance.mortgageRequired === 'Yes' && (
              <div className="rk-conditional">
                <div className="rk-fields">
                  <TextField id="finance-lenderName" label="Bank name" required
                    value={finance.lenderName} error={errors['finance-lenderName']}
                    onChange={v => onFinanceChange({ lenderName: v })} />
                </div>
              </div>
            )}
          </>
        );

      case 'lender':
        return (
          <div className="rk-fields">
            <TextField id="finance-brokerOrBankerName" label="Banker or broker name" autoComplete="off"
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
        );

      case 'payment':
        return (
          <>
            <fieldset
              id="finance-paysByElectronicTransfer"
              tabIndex={-1}
              className={`rk-choice-set${payError ? ' rk-has-error' : ''}`}
              aria-describedby={`finance-pay-hint${payError ? ' finance-paysByElectronicTransfer-error' : ''}`}
            >
              <legend>How will you pay for this property?<span className="rk-sr-only"> (required)</span></legend>
              <p className="rk-hint" id="finance-pay-hint">Tick all that apply. Required for anti-money-laundering checks.</p>
              <div className="rk-choice-row">
                <CheckboxCard id="finance-pay-transfer" checked={finance.paysByElectronicTransfer}
                  onChange={checked => onFinanceChange({ paysByElectronicTransfer: checked })}>
                  Bank transfer or loan
                </CheckboxCard>
                <CheckboxCard id="finance-pay-cash" checked={finance.paysByCash}
                  onChange={checked => onFinanceChange({ paysByCash: checked, cashAmount: checked ? finance.cashAmount : '' })}>
                  Cash
                </CheckboxCard>
                <CheckboxCard id="finance-pay-virtual" checked={finance.paysByVirtualAssets}
                  onChange={checked => onFinanceChange({ paysByVirtualAssets: checked, virtualAssetsAmount: checked ? finance.virtualAssetsAmount : '' })}>
                  Cryptocurrency
                </CheckboxCard>
                <CheckboxCard id="finance-pay-other" checked={finance.paysByOther}
                  onChange={checked => onFinanceChange({ paysByOther: checked, otherPaymentDetails: checked ? finance.otherPaymentDetails : '' })}>
                  Other
                </CheckboxCard>
              </div>
              <ErrorText id="finance-paysByElectronicTransfer" error={payError} />
            </fieldset>
          </>
        );

      case 'howDidYouHear':
        return (
          <div className="rk-fields">
            <TextField id="howDidYouHear" label="How did you hear about us?" autoComplete="off"
              value={formData.howDidYouHear} onChange={onHowDidYouHearChange} />
          </div>
        );

      case 'amounts':
        return (
          <div className="rk-fields">
            {finance.paysByCash && (
              <CurrencyField id="finance-cashAmount" label="Cash amount" required
                value={finance.cashAmount} error={errors['finance-cashAmount']}
                onChange={v => onFinanceChange({ cashAmount: v })} />
            )}
            {finance.paysByVirtualAssets && (
              <CurrencyField id="finance-virtualAssetsAmount" label="Cryptocurrency amount" required
                value={finance.virtualAssetsAmount} error={errors['finance-virtualAssetsAmount']}
                onChange={v => onFinanceChange({ virtualAssetsAmount: v })} />
            )}
            {finance.paysByOther && (
              <TextField id="finance-otherPaymentDetails" label="Other way of paying" required maxLength={300}
                value={finance.otherPaymentDetails} error={errors['finance-otherPaymentDetails']}
                onChange={v => onFinanceChange({ otherPaymentDetails: v })} />
            )}
          </div>
        );

      case 'proof':
        return (
          <>
            <Notice tone="warning" className="rk-notice-spaced">
              <p>AUSTRAC rules require proof of where crypto or third-party funds come from. Upload it now or send it to us later.</p>
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
          </>
        );
    }
  };

  if (screen === 'property') {
    return (
      <>
        {part('price')}
        <div className="rk-subsection">{part('address')}</div>
        {isPurchaser && <div className="rk-subsection">{part('ownership')}</div>}
      </>
    );
  }

  return (
    <>
      {part('mortgage')}
      {showBroker && <div className="rk-conditional rk-conditional-spaced">{part('lender')}</div>}
      {isPurchaser && (
        <div className="rk-subsection">
          {part('payment')}
          {paysOtherWays && <div className="rk-conditional rk-conditional-spaced">{part('amounts')}{needsProof && part('proof')}</div>}
        </div>
      )}
      {isPurchaser && <div className="rk-subsection">{part('howDidYouHear')}</div>}
    </>
  );
};
