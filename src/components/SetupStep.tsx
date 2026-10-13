import React, { useEffect, useRef, useState } from 'react';
import { ConveyancingRole } from '../types/index.js';
import { MAX_SELECTABLE } from './form/PeopleStep.js';

interface SetupStepProps {
  /** Current answers (null role = not chosen yet). */
  role: ConveyancingRole | null;
  count: number;
  /** True when the client comes back to change answers they already gave. */
  editing: boolean;
  returningUserName?: string;
  /** Message to show before people with entered details are removed, or null if nothing would be lost. */
  removalWarning: (count: number) => string | null;
  onContinue: (role: ConveyancingRole, count: number) => void;
  onCancel: () => void;
  /** Rendered at the top of the screen (save status). */
  status?: React.ReactNode;
}

/** The first page: buying or selling, and how many people are on the contract. */
export const SetupStep: React.FC<SetupStepProps> = ({ role, count, editing, returningUserName, removalWarning, onContinue, onCancel, status }) => {
  const [chosenRole, setChosenRole] = useState<ConveyancingRole | null>(role);
  const [chosenCount, setChosenCount] = useState(count);
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
    if (!chosenRole) {
      setError('Choose buying or selling to continue.');
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[name="setup-role"]')?.focus());
      return;
    }
    const message = removalWarning(chosenCount);
    if (message && warning !== message) {
      setWarning(message); // a second "Continue" confirms
      return;
    }
    onContinue(chosenRole, chosenCount);
  };

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
        <fieldset className="rk-setup-question" aria-describedby={error ? 'setup-role-error' : undefined}>
          <legend>Are you buying or selling?</legend>
          <div className="rk-role-options">
            {([['Purchaser', 'Buying a property'], ['Vendor', 'Selling a property']] as const).map(([value, title]) => (
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
                  <small>{value}</small>
                </span>
              </label>
            ))}
          </div>
          {error && <p className="rk-error" id="setup-role-error" role="alert">{error}</p>}
        </fieldset>

        <div className="rk-setup-question rk-people-question" role="group" aria-labelledby="setup-count-label">
          <p className="rk-setup-label" id="setup-count-label">
            {chosenRole ? `How many ${chosenRole.toLowerCase()}s are there?` : 'How many people are involved?'}
          </p>
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

        {warning && (
          <div className="rk-error-summary rk-error-compact" role="alert">
            <strong>{warning}</strong>
            <p>Select Continue again to confirm, or choose a different number.</p>
          </div>
        )}

        <div className="rk-actions">
          {editing
            ? <button type="button" className="rk-back" onClick={onCancel}>Keep current choices</button>
            : <p className="rk-setup-reassurance">You can change these choices later. Your answers save as you go.</p>}
          <button className="rk-primary" type="submit">
            {editing ? 'Save choices' : 'Continue'} <span className="rk-arrow" aria-hidden="true">›</span>
          </button>
        </div>
      </form>
    </section>
  );
};
