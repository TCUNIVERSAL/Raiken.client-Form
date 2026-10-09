import React, { useEffect, useRef, useState } from 'react';
import { formatDateLong } from '../../utils/validation.js';
import { cleanMoneyInput, formatMoneyDisplay } from '../../utils/format.js';

// ─── Small icons ─────────────────────────────────────────────────────────────
export const TickIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AlertIcon: React.FC = () => (
  <svg className="rk-error-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <circle cx="8" cy="8" r="7" fill="currentColor" />
    <path d="M8 4.5v4.2M8 11.2v.1" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

function describedBy(id: string, hint?: React.ReactNode, error?: string) {
  return [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
}

/**
 * "Label" or "Label (optional)". Almost every question is required, so only the
 * optional ones are marked on screen; screen readers still hear "required".
 */
export const LabelText: React.FC<{ label: React.ReactNode; required?: boolean }> = ({ label, required }) => (
  <>
    {label}
    {required
      ? <span className="rk-sr-only"> (required)</span>
      : <span className="rk-opt"> (optional)</span>}
  </>
);

export const ErrorText: React.FC<{ id: string; error?: string }> = ({ id, error }) => (
  error ? <p id={`${id}-error`} className="rk-error"><AlertIcon /><span>{error}</span></p> : null
);

export const HelpAndError: React.FC<{ id: string; hint?: React.ReactNode; error?: string }> = ({ id, hint, error }) => (
  <>
    {hint && <p id={`${id}-hint`} className="rk-hint">{hint}</p>}
    <ErrorText id={id} error={error} />
  </>
);

// ─── Field shell: label above, hint, control, error ─────────────────────────
interface BoxProps {
  id: string;
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  valid?: boolean;
  children: React.ReactNode;
  after?: React.ReactNode;
  className?: string;
}

export const InputBox: React.FC<BoxProps> = ({ id, label, required, hint, error, valid, children, after, className }) => (
  <div className={`rk-field${error ? ' rk-invalid' : ''}${className ? ` ${className}` : ''}`}>
    <label htmlFor={id} className="rk-label"><LabelText label={label} required={required} /></label>
    {hint && <p id={`${id}-hint`} className="rk-hint">{hint}</p>}
    <div className={`rk-control${valid && !error ? ' rk-control-valid' : ''}`}>
      {children}
      {valid && !error && <TickIcon className="rk-tick" />}
    </div>
    {after}
    <ErrorText id={id} error={error} />
  </div>
);

interface TextFieldProps {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  valid?: boolean;
  type?: 'text' | 'email' | 'tel';
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  maxLength?: number;
  readOnly?: boolean;
  className?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  id, label, value, onChange, placeholder, required, hint, error, valid, type = 'text', inputMode, autoComplete, maxLength = 120, readOnly, className
}) => (
  <InputBox id={id} label={label} required={required} hint={hint} error={error} valid={valid} className={className}>
    <input
      id={id}
      type={type}
      className="rk-input"
      value={value}
      placeholder={placeholder}
      inputMode={inputMode}
      autoComplete={autoComplete}
      maxLength={maxLength}
      readOnly={readOnly}
      aria-required={required || undefined}
      aria-invalid={Boolean(error)}
      aria-describedby={describedBy(id, hint, error)}
      onChange={e => onChange(e.target.value)}
    />
  </InputBox>
);

// ─── Money: stored as plain digits ("650000"), shown as "650,000" ───────────
interface CurrencyFieldProps extends Omit<TextFieldProps, 'type' | 'inputMode'> {}

export const CurrencyField: React.FC<CurrencyFieldProps> = ({
  id, label, value, onChange, placeholder, required, hint, error, valid, maxLength = 15, className
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <InputBox id={id} label={label} required={required} hint={hint} error={error} valid={valid} className={className}>
      <span className="rk-affix rk-prefix" aria-hidden="true">$</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className="rk-input rk-input-money"
        value={focused ? value : formatMoneyDisplay(value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        aria-required={required || undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={e => onChange(cleanMoneyInput(e.target.value))}
      />
      <span className="rk-affix rk-suffix" aria-hidden="true">AUD</span>
    </InputBox>
  );
};

interface SelectFieldProps {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  valid?: boolean;
  autoComplete?: string;
  className?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  id, label, value, onChange, options, placeholder, required, hint, error, valid, autoComplete, className
}) => (
  <InputBox id={id} label={label} required={required} hint={hint} error={error} valid={valid} className={className}>
    <select
      id={id}
      className={`rk-input rk-select${value ? '' : ' rk-placeholder'}`}
      value={value}
      autoComplete={autoComplete}
      aria-required={required || undefined}
      aria-invalid={Boolean(error)}
      aria-describedby={describedBy(id, hint, error)}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </InputBox>
);

interface DateFieldProps {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  min: string;
  max: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  valid?: boolean;
  autoComplete?: string;
  className?: string;
}

/** Native date input (calendar popup in every modern browser) plus the chosen date spelled out. */
export const DateField: React.FC<DateFieldProps> = ({ id, label, value, onChange, min, max, required, hint, error, valid, autoComplete, className }) => {
  const readable = formatDateLong(value);
  return (
    <InputBox
      id={id}
      label={label}
      required={required}
      hint={hint}
      error={error}
      valid={valid}
      className={className}
      after={readable && !error ? <p className="rk-date-readout" aria-live="polite">{readable}</p> : null}
    >
      <input
        id={id}
        type="date"
        className="rk-input rk-date"
        value={value}
        min={min}
        max={max}
        autoComplete={autoComplete}
        aria-required={required || undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        onChange={e => onChange(e.target.value)}
        // Open the calendar when the box is clicked, not only the small icon
        onClick={e => {
          try {
            (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
          } catch {
            // Not supported, or already open — the native control still works
          }
        }}
      />
    </InputBox>
  );
};

// ─── Suggestion chips (shortcuts — the field always accepts other values) ───
export const Suggestions: React.FC<{
  items: string[];
  current?: string;
  onPick: (value: string) => void;
  label?: string;
}> = ({ items, current, onPick, label = 'Common answers' }) => (
  <div className="rk-suggestions" role="group" aria-label={label}>
    <span className="rk-overline">{label}</span>
    <div className="rk-chips">
      {items.map(item => (
        <button
          key={item}
          type="button"
          className={`rk-chip${current === item ? ' rk-chip-active' : ''}`}
          aria-pressed={current === item}
          onClick={() => onPick(item)}
        >
          {item}
        </button>
      ))}
    </div>
  </div>
);

// ─── Choice cards (accessible radio group) ───────────────────────────────────
export interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface ChoiceCardsProps {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: ChoiceOption[];
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  columns?: 1 | 2 | 3 | 4;
  /** compact: short answers such as Yes / No · large: the big buying / selling cards */
  size?: 'default' | 'compact' | 'large';
}

export const ChoiceCards: React.FC<ChoiceCardsProps> = ({ id, label, value, onChange, options, required, hint, error, columns = 2, size = 'default' }) => (
  <fieldset
    id={id}
    tabIndex={-1}
    className={`rk-field rk-fieldset${error ? ' rk-invalid' : ''}`}
    aria-describedby={describedBy(id, hint, error)}
  >
    <legend className="rk-label"><LabelText label={label} required={required} /></legend>
    {hint && <div id={`${id}-hint`} className="rk-hint">{hint}</div>}
    <div className={`rk-cards rk-cols-${columns}${size !== 'default' ? ` rk-cards-${size}` : ''}`}>
      {options.map(o => (
        <label key={o.value} className={`rk-choice${value === o.value ? ' rk-choice-selected' : ''}`}>
          <input
            type="radio"
            className="rk-choice-input"
            name={id}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <span className="rk-choice-mark" aria-hidden="true" />
          {o.icon && <span className="rk-choice-icon" aria-hidden="true">{o.icon}</span>}
          <span className="rk-choice-text">
            <span className="rk-choice-title">{o.label}</span>
            {o.description && <span className="rk-choice-desc">{o.description}</span>}
          </span>
        </label>
      ))}
    </div>
    <ErrorText id={id} error={error} />
  </fieldset>
);

// ─── Checkbox card (declarations, payment methods, "same address") ───────────
interface CheckboxCardProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  description?: React.ReactNode;
  required?: boolean;
  error?: string;
}

export const CheckboxCard: React.FC<CheckboxCardProps> = ({ id, checked, onChange, children, description, required, error }) => (
  <div className={`rk-field rk-field-tight${error ? ' rk-invalid' : ''}`}>
    <label htmlFor={id} className={`rk-check${checked ? ' rk-check-selected' : ''}`}>
      <input
        id={id}
        type="checkbox"
        className="rk-check-input"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <span className="rk-check-box" aria-hidden="true"><TickIcon /></span>
      <span className="rk-choice-text">
        <span className="rk-choice-title">
          {children}
          {required && <span className="rk-sr-only"> (required)</span>}
        </span>
        {description && <span className="rk-choice-desc">{description}</span>}
      </span>
    </label>
    <ErrorText id={id} error={error} />
  </div>
);

// ─── Notices ────────────────────────────────────────────────────────────────
export const Notice: React.FC<{
  tone?: 'info' | 'warning' | 'success';
  title?: React.ReactNode;
  children: React.ReactNode;
  role?: 'status' | 'note';
  className?: string;
}> = ({ tone = 'info', title, children, role, className }) => (
  <div className={`rk-notice rk-notice-${tone}${className ? ` ${className}` : ''}`} role={role}>
    <span className="rk-notice-icon" aria-hidden="true">
      {tone === 'success' ? <TickIcon /> : tone === 'warning' ? '!' : 'i'}
    </span>
    <div className="rk-notice-body">
      {title && <p className="rk-notice-title">{title}</p>}
      {children}
    </div>
  </div>
);

/** Heading for a group of questions inside a panel: icon, title and a one-line explanation. */
export const GroupHeading: React.FC<{
  children: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  as?: 'h2' | 'h3';
}> = ({ children, description, icon, as: Tag = 'h3' }) => (
  <div className="rk-group-head">
    {icon && <span className="rk-group-icon" aria-hidden="true">{icon}</span>}
    <div className="rk-group-text">
      <Tag className="rk-group-title">{children}</Tag>
      {description && <p className="rk-group-desc">{description}</p>}
    </div>
  </div>
);

// ─── Progress: every step named, so clients see where they are and what's next ──
export const Stepper: React.FC<{ steps: string[]; current: number; allDone?: boolean }> = ({ steps, current, allDone }) => {
  const next = !allDone && current < steps.length - 1 ? steps[current + 1] : '';
  return (
    <nav aria-label="Form progress" className="rk-progress-nav">
      <ol className="rk-steps">
        {steps.map((label, i) => {
          const done = allDone || i < current;
          const active = !allDone && i === current;
          return (
            <li
              key={label}
              className={`rk-step${done ? ' rk-step-done' : ''}${active ? ' rk-step-active' : ''}`}
              aria-current={active ? 'step' : undefined}
            >
              <span className="rk-step-dot" aria-hidden="true">{done ? <TickIcon /> : i + 1}</span>
              <span className="rk-step-label">
                {label}
                <span className="rk-sr-only">{done ? ' (done)' : active ? ' (current step)' : ''}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="rk-progress-text" aria-hidden="true">
        {allDone
          ? <strong>All done</strong>
          : <>Step {current + 1} of {steps.length}{next && <span className="rk-progress-next"> · Next: {next}</span>}</>}
      </p>
    </nav>
  );
};

// ─── "+ Add middle name": optional questions stay hidden until wanted ────────
export const OptionalReveal: React.FC<{ label: string; open?: boolean; children: React.ReactNode }> = ({ label, open: forced, children }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const openedByClick = useRef(false);

  useEffect(() => {
    if (open && openedByClick.current) {
      boxRef.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
      openedByClick.current = false;
    }
  }, [open]);

  if (open || forced) return <div className="rk-reveal" ref={boxRef}>{children}</div>;
  return (
    <button type="button" className="rk-add-link" onClick={() => { openedByClick.current = true; setOpen(true); }}>
      <span aria-hidden="true">+</span> {label}
    </button>
  );
};

// ─── Error summary ───────────────────────────────────────────────────────────
export const ErrorSummary: React.FC<{
  errors: Record<string, string>;
  onSelect?: (fieldId: string) => void;
}> = ({ errors, onSelect }) => {
  const entries = Object.entries(errors);
  if (entries.length === 0) return null;
  return (
    <div className="rk-error-summary" role="alert" id="rk-error-summary" tabIndex={-1}>
      <p className="rk-error-summary-title">
        {entries.length === 1 ? 'There is 1 answer to fix' : `There are ${entries.length} answers to fix`}
      </p>
      <ul>
        {entries.map(([fieldId, message]) => (
          <li key={fieldId}>
            <a
              href={`#${fieldId}`}
              onClick={e => {
                e.preventDefault();
                if (onSelect) {
                  onSelect(fieldId);
                  return;
                }
                const el = document.getElementById(fieldId);
                el?.scrollIntoView({ block: 'center' });
                el?.focus();
              }}
            >
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};
