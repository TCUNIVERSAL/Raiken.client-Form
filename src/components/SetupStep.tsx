import React, { useEffect, useRef, useState } from 'react';
import { ConveyancingRole } from '../types/index.js';
import { MAX_SELECTABLE } from './form/formState.js';

interface SetupStepProps {
  /** Current answers (null role = not chosen yet). */
  role: ConveyancingRole | null;
  count: number;
  isCompanyOrTrust?: 'Yes' | 'No' | '';
  /** True when the client comes back to change answers they already gave. */
  editing: boolean;
  returningUserName?: string;
  /** Message to show before people with entered details are removed, or null if nothing would be lost. */
  removalWarning: (count: number) => string | null;
  onContinue: (role: ConveyancingRole, count: number, isCompanyOrTrust?: 'Yes' | 'No') => void;
  onCancel: () => void;
  /** Rendered at the top of the screen (save status). */
  status?: React.ReactNode;
}

/** The first page: buying or selling, how many people are on the contract, and structure check. */
export const SetupStep: React.FC<SetupStepProps> = ({
  role, count, isCompanyOrTrust = 'No', editing, returningUserName, removalWarning, onContinue, onCancel, status
}) => {
  type ClientStructure = 'individual' | 'company' | null;

  const initialStructure: ClientStructure = editing
    ? (isCompanyOrTrust === 'Yes' ? 'company' : 'individual')
    : null;

  const [structure, setStructure] = useState<ClientStructure>(initialStructure);
  const [chosenRole, setChosenRole] = useState<ConveyancingRole | null>(editing ? role : null);
  const [chosenCount, setChosenCount] = useState(count > 0 ? count : 1);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { if (editing) headingRef.current?.focus(); }, [editing]);

  /** − and + change the number of people by one, between 1 and the maximum. */
  const changeCount = (delta: number) => {
    setChosenCount(n => Math.min(MAX_SELECTABLE, Math.max(1, n + delta)));
    setWarning(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!structure) {
      setError('Please select Individual / Group of Persons or Company / Trust to continue.');
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[name="setup-structure"]')?.focus());
      return;
    }
    if (structure === 'company') {
      return; // Handled directly by office
    }
    if (!chosenRole) {
      setError('Please select Purchaser or Vendor to continue.');
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[name="setup-role"]')?.focus());
      return;
    }
    const message = removalWarning(chosenCount);
    if (message && warning !== message) {
      setWarning(message); // a second "Continue" confirms
      return;
    }
    onContinue(chosenRole, chosenCount, 'No');
  };

  const countLabel = chosenRole === 'Vendor'
    ? 'How many vendor/s are there?'
    : 'How many purchaser/s are there?';

  return (
    <section className="rk-setup-screen" aria-labelledby="setup-title">
      <div className="rk-form-meta">
        <span />
        {status}
      </div>
      <div className="rk-screen-head">
        <h1 id="setup-title" tabIndex={-1} ref={headingRef}>{editing ? 'Your property matter' : 'Let’s get started'}</h1>
      </div>
      {returningUserName && !editing && <p className="rk-welcome">Welcome back, {returningUserName}.</p>}

      <form className="rk-setup-form" onSubmit={submit} noValidate>
        <fieldset className="rk-setup-question rk-structure-question">
          <legend>Who is buying or selling?</legend>
          <div className="rk-structure-options">
            <label className={`rk-structure-card${structure === 'individual' ? ' rk-selected' : ''}`}>
              <input
                type="radio"
                name="setup-structure"
                value="individual"
                checked={structure === 'individual'}
                onChange={() => { setStructure('individual'); setWarning(null); setError(''); }}
              />
              <span className="rk-structure-content">
                <strong>Individual / Group of Persons</strong>
              </span>
            </label>

            <label className={`rk-structure-card${structure === 'company' ? ' rk-selected' : ''}`}>
              <input
                type="radio"
                name="setup-structure"
                value="company"
                checked={structure === 'company'}
                onChange={() => { setStructure('company'); setWarning(null); setError(''); }}
              />
              <span className="rk-structure-content">
                <strong>Company / Trust</strong>
              </span>
            </label>
          </div>
          {error && !structure && <p className="rk-error" id="setup-structure-error" role="alert">{error}</p>}

          {structure === 'company' && (
            <div className="rk-company-instruction-card" role="region" aria-labelledby="company-instruction-title">
              <div className="rk-company-instruction-badge">
                Instructions for Company / Trust
              </div>
              <h3 id="company-instruction-title" className="rk-company-instruction-title">
                How company and trust matters are processed
              </h3>
              <p className="rk-company-instruction-lead">
                This online intake form is designed for individual conveyancing. Company and trust structures follow a tailored corporate verification process, so this self-serve form is not applicable.
              </p>

              <div className="rk-company-instruction-contact">
                <p><strong>Next step:</strong> Please contact Raikan Conveyancing directly so we can set up your matter:</p>
                <div className="rk-company-notice-actions">
                  <a href="tel:0882320000" className="rk-btn-call">
                    <svg className="rk-btn-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>Call (08) 8232 0000</span>
                  </a>
                  <a href="mailto:admin@raikanconveyancing.com.au?subject=Company%20%2F%20Trust%20Structure%20Conveyancing" className="rk-btn-email">
                    <svg className="rk-btn-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <span>Email admin@raikanconveyancing.com.au</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </fieldset>

        {structure === 'individual' && (
          <>
            <fieldset className="rk-setup-question rk-role-question" aria-label="Purchaser or Vendor" aria-describedby={error ? 'setup-role-error' : undefined}>
              <div className="rk-role-options">
                {([['Purchaser', 'Purchaser'], ['Vendor', 'Vendor']] as const).map(([value, title]) => (
                  <label key={value} className={`rk-role-option${chosenRole === value ? ' rk-selected' : ''}`}>
                    <input
                      type="radio"
                      name="setup-role"
                      value={value}
                      checked={chosenRole === value}
                      onChange={() => { setChosenRole(value); setError(''); setWarning(null); }}
                    />
                    <span>
                      <strong>{title}</strong>
                    </span>
                  </label>
                ))}
              </div>
              {error && !chosenRole && <p className="rk-error" id="setup-role-error" role="alert">{error}</p>}
            </fieldset>

            <div className="rk-setup-question rk-people-question" role="group" aria-labelledby="setup-count-label">
              <p className="rk-setup-label" id="setup-count-label">{countLabel}</p>
              <div className="rk-counter">
                <button
                  type="button"
                  className="rk-counter-btn"
                  aria-label="One fewer person"
                  disabled={chosenCount <= 1}
                  onClick={() => changeCount(-1)}
                >
                  <span aria-hidden="true">−</span>
                </button>
                <output className="rk-counter-value" aria-live="polite">
                  <strong>{chosenCount}</strong> {chosenCount === 1 ? 'person' : 'people'}
                </output>
                <button
                  type="button"
                  className="rk-counter-btn"
                  aria-label="One more person"
                  disabled={chosenCount >= MAX_SELECTABLE}
                  onClick={() => changeCount(1)}
                >
                  <span aria-hidden="true">+</span>
                </button>
              </div>
              <p className="rk-hint rk-counter-hint">Up to {MAX_SELECTABLE} people.</p>
            </div>
          </>
        )}

        {warning && (
          <div className="rk-error-summary rk-error-compact" role="alert">
            <strong>{warning}</strong>
            <p>Select Continue again to confirm, or choose a different number.</p>
          </div>
        )}

        <div className="rk-setup-actions">
          {structure === 'company' ? (
            editing ? (
              <button type="button" className="rk-back" onClick={onCancel}>Keep current choices</button>
            ) : null
          ) : (
            <>
              <button className="rk-primary rk-primary-full" type="submit">
                {editing ? 'Save choices' : 'Continue'} <span className="rk-arrow" aria-hidden="true">›</span>
              </button>
              {editing && (
                <button type="button" className="rk-back" onClick={onCancel}>Keep current choices</button>
              )}
            </>
          )}
        </div>
      </form>
    </section>
  );
};
