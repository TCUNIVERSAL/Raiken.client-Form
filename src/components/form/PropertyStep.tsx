import React from 'react';
import { ClientIntakeFormData, FinanceFormData, PropertyFormData } from '../../types/index.js';
import { formatDateLong, settlementMax, settlementMin } from '../../utils/validation.js';
import { addDaysIso } from '../../utils/format.js';
import {
  CheckboxCard, ChoiceCards, CurrencyField, DateField, ErrorText, GroupHeading, Notice, OptionalReveal, SelectField, TextField
} from './fields.js';
import { FileUpload } from './FileUpload.js';
import { BankIcon, DollarIcon, HomeIcon, KeyIcon } from './icons.js';

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
        <div className="rk-group">
          <GroupHeading icon={<HomeIcon />} description={`The South Australian property you are ${isPurchaser ? 'buying' : 'selling'}.`}>
            Property address
          </GroupHeading>
          <TextField id="property-addressLine1" label="Street address" required placeholder="e.g. 12 King William Street"
            autoComplete="off"
            value={property.addressLine1} error={errors['property-addressLine1']}
            onChange={v => onPropertyChange({ addressLine1: v })} />
          <div className="rk-row rk-row-pair">
            <TextField id="property-suburb" label="Suburb" required autoComplete="off"
              value={property.suburb} error={errors['property-suburb']}
              className="rk-field-last"
              onChange={v => onPropertyChange({ suburb: v })} />
            <TextField id="property-postcode" label="Postcode" required inputMode="numeric" maxLength={4}
              autoComplete="off"
              value={property.postcode} error={errors['property-postcode']} valid={ok('property-postcode', property.postcode)}
              className="rk-field-last"
              onChange={v => onPropertyChange({ postcode: v.replace(/\D/g, '').slice(0, 4) })} />
          </div>
        </div>

        <div className="rk-group">
          <GroupHeading
            icon={<DollarIcon />}
            description="Settlement is the day the property officially changes hands. Leave it blank if it isn’t set yet."
          >
            Price and settlement
          </GroupHeading>
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
                <span className="rk-chips-label" aria-hidden="true">Quick pick:</span>
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
        </div>

        {isPurchaser && (
          <div className="rk-group">
            <GroupHeading icon={<KeyIcon />}>Owning the property</GroupHeading>
            <ChoiceCards
              id="property-intendedUse"
              label="What will the property be used for?"
              required
              options={[
                { value: 'To live in', label: 'To live in', description: 'It will be my home' },
                { value: 'For investment', label: 'An investment', description: 'For example, to rent out' }
              ]}
              value={property.intendedUse}
              error={errors['property-intendedUse']}
              onChange={v => onPropertyChange({ intendedUse: v })}
            />
            <ChoiceCards
              id="property-ownershipType"
              label="How will the owners be shown on the title?"
              hint="Not sure what these mean? Choose “Not sure” and we’ll explain the options."
              required
              columns={3}
              options={[
                { value: 'Joint Tenants', label: 'Joint tenants', description: 'Equal shares. If one owner dies, the others inherit their share.' },
                { value: 'Tenants in Common', label: 'Tenants in common', description: 'Set shares (e.g. 60/40) that each owner can leave in their will.' },
                { value: 'Not Sure', label: 'Not sure', description: 'That’s fine — we’ll help you choose.' }
              ]}
              value={property.ownershipType}
              error={errors['property-ownershipType']}
              onChange={v => onPropertyChange({ ownershipType: v })}
            />
          </div>
        )}
      </section>

      <section className="rk-panel" aria-labelledby="finance-title">
        <GroupHeading
          as="h2"
          icon={<BankIcon />}
          description={isPurchaser
            ? 'The law requires us to check where the money for a purchase comes from.'
            : 'So we can arrange for any loan to be paid off at settlement.'}
        >
          <span id="finance-title">{isPurchaser ? 'Paying for the property' : 'Home loan'}</span>
        </GroupHeading>
        <ChoiceCards
          id="finance-mortgageRequired"
          label={isPurchaser ? 'Will you be taking out a home loan (mortgage)?' : 'Is there a home loan (mortgage) on the property?'}
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
          <OptionalReveal label="Add your mortgage broker or bank contact (optional)" open={hasBrokerDetails}>
            <p className="rk-hint rk-reveal-hint">Helpful if you have one — we’ll keep them updated for you.</p>
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
            <legend className="rk-label">How will you pay for it?<span className="rk-sr-only"> (required)</span></legend>
            <p className="rk-hint" id="finance-pay-hint">Tick all that apply.</p>
            <div className="rk-check-list">
              <CheckboxCard id="finance-pay-transfer" checked={finance.paysByElectronicTransfer}
                onChange={checked => onFinanceChange({ paysByElectronicTransfer: checked })}>
                Bank transfer or home loan
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
                Something else (e.g. a gift from family)
              </CheckboxCard>
              {finance.paysByOther && (
                <div className="rk-reveal">
                  <TextField id="finance-otherPaymentDetails" label="Please describe" required placeholder="e.g. Gift from family" maxLength={300}
                    value={finance.otherPaymentDetails} error={errors['finance-otherPaymentDetails']}
                    onChange={v => onFinanceChange({ otherPaymentDetails: v })} />
                </div>
              )}
            </div>
            <ErrorText id="finance-paysByElectronicTransfer" error={errors['finance-paysByElectronicTransfer']} />

            {(finance.paysByVirtualAssets || finance.paysByOther) && (
              <div className="rk-reveal rk-funds">
                <Notice tone="warning">
                  <p>
                    For cryptocurrency or money from someone else, the law asks for proof of where it came from.
                    You can upload it now or send it to us later.
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
            <TextField id="finance-lenderName" label="Which bank is the loan with?" required placeholder="e.g. Commonwealth Bank"
              value={finance.lenderName} error={errors['finance-lenderName']} className="rk-w-half"
              onChange={v => onFinanceChange({ lenderName: v })} />
          </div>
        )}
      </section>

      {isPurchaser && (
        <section className="rk-panel rk-panel-quiet" aria-label="How did you hear about us?">
          <SelectField
            id="howDidYouHear"
            label="How did you hear about us?"
            placeholder="Choose one"
            options={heardOptions.map(h => ({ value: h, label: h }))}
            value={formData.howDidYouHear}
            className="rk-w-half rk-field-last"
            onChange={onHowDidYouHearChange}
          />
        </section>
      )}
    </>
  );
};
