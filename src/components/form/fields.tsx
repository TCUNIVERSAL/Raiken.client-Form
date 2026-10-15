import React, { useContext, useState } from 'react';
import { cleanMoneyInput, formatMoneyDisplay } from '../../utils/format.js';

/*
 * Form building blocks in the rcorpo.com style:
 * label above the box, "(optional)" in words, the label repeated as a light placeholder,
 * 55px boxes in a two-column grid, and answers as a row of radio boxes.
 */

export const TickIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** While a field shows an error, the error takes the hint's place (so it never adds height to the screen). */
function describedBy(id: string, hint?: React.ReactNode, error?: string) {
  return [hint && !error ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
}

/** "Label" or "Label (optional)". Required fields are not starred; screen readers still hear "required". */
export const LabelText: React.FC<{ label: React.ReactNode; required?: boolean }> = ({ label, required }) => (
  <>
    {label}
    {required
      ? <span className="rk-sr-only"> (required)</span>
      : <span className="rk-optional"> (optional)</span>}
  </>
);

export const ErrorText: React.FC<{ id: string; error?: string }> = ({ id, error }) => (
  error ? <p id={`${id}-error`} className="rk-error">{error}</p> : null
);

/** The placeholder repeats the label (as in the design preview) unless an example is given. */
function placeholderFor(label: React.ReactNode, placeholder?: string) {
  if (placeholder !== undefined) return placeholder;
  return typeof label === 'string' ? label : undefined;
}

// ─── Ticks on correct answers ────────────────────────────────────────────────
/**
 * Every current validation problem on the page, shown or not (null = no ticks).
 * A filled-in field that is not listed here gets a green tick.
 */
export const FieldProblemsContext = React.createContext<Record<string, string> | null>(null);

/** True when the field has an answer that passes validation. */
export function useFieldValid(id: string, filled: boolean, error?: string): boolean {
  const problems = useContext(FieldProblemsContext);
  return Boolean(problems && filled && !error && !(id in problems));
}

// ─── Field shell ─────────────────────────────────────────────────────────────
interface BoxProps {
  id: string;
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  wide?: boolean;
  /** The field has an answer (used for the tick). */
  filled?: boolean;
  /** Shown at the end of the label line, such as a link that reveals another box. */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const InputBox: React.FC<BoxProps> = ({ id, label, required, hint, error, wide, filled = false, aside, children, className }) => {
  const valid = useFieldValid(id, filled, error);
  return (
    <div className={`rk-field${wide ? ' rk-wide' : ''}${error ? ' rk-has-error' : ''}${valid ? ' rk-valid' : ''}${className ? ` ${className}` : ''}`}>
      <div className="rk-field-top">
        <label htmlFor={id}><LabelText label={label} required={required} /></label>
        <ErrorText id={id} error={error} />
        {aside && <span className="rk-field-aside">{aside}</span>}
      </div>
      {hint && !error && <p id={`${id}-hint`} className="rk-hint">{hint}</p>}
      {children}
    </div>
  );
};

interface TextFieldProps {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  type?: 'text' | 'email' | 'tel';
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  maxLength?: number;
  wide?: boolean;
  className?: string;
  aside?: React.ReactNode;
}

export const TextField: React.FC<TextFieldProps> = ({
  id, label, value, onChange, placeholder, required, hint, error, type = 'text', inputMode, autoComplete, maxLength = 120, wide, className, aside
}) => (
  <InputBox id={id} label={label} required={required} hint={hint} error={error} wide={wide} filled={Boolean(value.trim())} className={className} aside={aside}>
    <input
      id={id}
      type={type}
      className="rk-input"
      value={value}
      placeholder={placeholderFor(label, placeholder)}
      inputMode={inputMode}
      autoComplete={autoComplete}
      maxLength={maxLength}
      aria-required={required || undefined}
      aria-invalid={Boolean(error)}
      aria-describedby={describedBy(id, hint, error)}
      onChange={e => onChange(e.target.value)}
    />
  </InputBox>
);

/** Money is stored as plain digits ("650000") and shown as "$650,000" when the box is not being edited. */
export const CurrencyField: React.FC<Omit<TextFieldProps, 'type' | 'inputMode' | 'placeholder'>> = ({
  id, label, value, onChange, required, hint, error, maxLength = 16, wide, className
}) => {
  const [focused, setFocused] = useState(false);
  const shown = focused ? value : (value ? `$${formatMoneyDisplay(value)}` : '');
  return (
    <InputBox id={id} label={label} required={required} hint={hint} error={error} wide={wide} filled={Boolean(value)} className={className}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className="rk-input"
        value={shown}
        placeholder="$"
        maxLength={maxLength}
        autoComplete="off"
        aria-required={required || undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={e => onChange(cleanMoneyInput(e.target.value))}
      />
    </InputBox>
  );
};

interface SelectFieldProps {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  autoComplete?: string;
  wide?: boolean;
  className?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  id, label, value, onChange, options, placeholder = 'Select an option', required, hint, error, autoComplete, wide, className
}) => (
  <InputBox id={id} label={label} required={required} hint={hint} error={error} wide={wide} filled={Boolean(value)} className={className}>
    <select
      id={id}
      className={`rk-input${value ? '' : ' rk-placeholder-shown'}`}
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
  autoComplete?: string;
  wide?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/** Native date picker (the phone's own calendar on mobile). */
export const DateField: React.FC<DateFieldProps> = ({ id, label, value, onChange, min, max, required, hint, error, autoComplete, wide, className, children }) => (
  <InputBox id={id} label={label} required={required} hint={hint} error={error} wide={wide} filled={Boolean(value)} className={className}>
    <input
      id={id}
      type="date"
      className="rk-input"
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
    {children}
  </InputBox>
);

interface DateOfBirthFieldProps {
  id: string;
  label?: React.ReactNode;
  value: string; // ISO "YYYY-MM-DD"
  onChange: (value: string) => void;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  wide?: boolean;
  className?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Three separate dropdowns (Day, Month, Year) for Date of Birth.
 * Prevents non-IT / mobile users from struggling with calendar year-pickers.
 */
export const DateOfBirthField: React.FC<DateOfBirthFieldProps> = ({
  id, label = 'Date of birth', value, onChange, required, hint, error, wide = true, className
}) => {
  const parts = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-') : ['', '', ''];
  const [currentYear, currentMonth, currentDay] = parts;

  const yearNum = parseInt(currentYear, 10);
  const monthNum = parseInt(currentMonth, 10);
  const maxDays = (yearNum && monthNum) ? new Date(yearNum, monthNum, 0).getDate() : 31;

  const maxAdultYear = new Date().getFullYear() - 18;
  const years: number[] = [];
  for (let y = maxAdultYear; y >= 1920; y--) {
    years.push(y);
  }

  const handlePartChange = (part: 'day' | 'month' | 'year', val: string) => {
    let d = part === 'day' ? val : currentDay;
    let m = part === 'month' ? val : currentMonth;
    let y = part === 'year' ? val : currentYear;

    if (m && y && d) {
      const daysInM = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
      if (parseInt(d, 10) > daysInM) {
        d = String(daysInM).padStart(2, '0');
      }
    }

    if (d && m && y) {
      onChange(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    } else {
      onChange('');
    }
  };

  const formattedPreview = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? (() => {
    try {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  })() : '';

  return (
    <InputBox id={id} label={label} required={required} hint={hint} error={error} wide={wide} filled={Boolean(value)} className={className}>
      <div className="rk-dob-container">
        <div className="rk-dob-row" role="group" aria-labelledby={`${id}-label`}>
          <div className="rk-dob-col rk-dob-day">
            <label htmlFor={id} className="rk-dob-sublabel">Day</label>
            <select
              id={id}
              className={`rk-input rk-dob-select${currentDay ? '' : ' rk-placeholder-shown'}`}
              value={currentDay}
              aria-required={required || undefined}
              aria-invalid={Boolean(error)}
              aria-describedby={describedBy(id, hint, error)}
              onChange={e => handlePartChange('day', e.target.value)}
            >
              <option value="">Day</option>
              {Array.from({ length: maxDays }, (_, i) => {
                const dayStr = String(i + 1).padStart(2, '0');
                return <option key={dayStr} value={dayStr}>{i + 1}</option>;
              })}
            </select>
          </div>

          <div className="rk-dob-col rk-dob-month">
            <label htmlFor={`${id}-month`} className="rk-dob-sublabel">Month</label>
            <select
              id={`${id}-month`}
              className={`rk-input rk-dob-select${currentMonth ? '' : ' rk-placeholder-shown'}`}
              value={currentMonth}
              aria-required={required || undefined}
              aria-invalid={Boolean(error)}
              aria-describedby={describedBy(id, hint, error)}
              onChange={e => handlePartChange('month', e.target.value)}
            >
              <option value="">Month</option>
              {MONTH_NAMES.map((name, i) => {
                const monthStr = String(i + 1).padStart(2, '0');
                return <option key={monthStr} value={monthStr}>{name}</option>;
              })}
            </select>
          </div>

          <div className="rk-dob-col rk-dob-year">
            <label htmlFor={`${id}-year`} className="rk-dob-sublabel">Year</label>
            <select
              id={`${id}-year`}
              className={`rk-input rk-dob-select${currentYear ? '' : ' rk-placeholder-shown'}`}
              value={currentYear}
              aria-required={required || undefined}
              aria-invalid={Boolean(error)}
              aria-describedby={describedBy(id, hint, error)}
              onChange={e => handlePartChange('year', e.target.value)}
            >
              <option value="">Year</option>
              {years.map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        {formattedPreview && (
          <div className="rk-dob-preview">
            <span className="rk-dob-tick" aria-hidden="true">✓</span> {formattedPreview}
          </div>
        )}
      </div>
    </InputBox>
  );
};

// ─── Radio answers in a row of boxes ─────────────────────────────────────────
export interface ChoiceOption {
  value: string;
  label: string;
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
  /** Spans both columns of a two-column grid. */
  wide?: boolean;
}

export const ChoiceCards: React.FC<ChoiceCardsProps> = ({ id, label, value, onChange, options, required, hint, error, wide }) => (
  <fieldset
    id={id}
    tabIndex={-1}
    className={`rk-choice-set${wide ? ' rk-wide' : ''}${error ? ' rk-has-error' : ''}`}
    aria-describedby={describedBy(id, hint, error)}
  >
    <legend><LabelText label={label} required={required} /></legend>
    {error
      ? <ErrorText id={id} error={error} />
      : hint && <div id={`${id}-hint`} className="rk-hint">{hint}</div>}
    <div className="rk-choice-row">
      {options.map(o => (
        <label key={o.value} className={`rk-choice${value === o.value ? ' rk-choice-selected' : ''}`}>
          <input type="radio" name={id} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  </fieldset>
);

// ─── Checkbox in a box (payment methods, "same address") ─────────────────────
interface CheckboxCardProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  error?: string;
}

export const CheckboxCard: React.FC<CheckboxCardProps> = ({ id, checked, onChange, children, error }) => (
  <label htmlFor={id} className={`rk-choice${checked ? ' rk-choice-selected' : ''}`}>
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      aria-invalid={Boolean(error) || undefined}
    />
    <span>{children}</span>
  </label>
);

// ─── Notices ────────────────────────────────────────────────────────────────
export const Notice: React.FC<{
  tone?: 'info' | 'warning' | 'success';
  title?: React.ReactNode;
  children: React.ReactNode;
  role?: 'status' | 'note';
  className?: string;
}> = ({ tone = 'info', title, children, role, className }) => (
  <div className={`rk-notice${tone !== 'info' ? ` rk-notice-${tone}` : ''}${className ? ` ${className}` : ''}`} role={role}>
    {title && <p className="rk-notice-title">{title}</p>}
    {children}
  </div>
);

// ─── Progress: "1 of 4 · Your details" over a bar ────────────────────────────
/**
 * `progress` (0–1) fills the bar by screens done; without it the bar fills by step.
 * `aside` sits on the same line as the step count (the matter summary), saving a row.
 */
export const Stepper: React.FC<{ steps: string[]; current: number; progress?: number; aside?: React.ReactNode }> = ({ steps, current, progress, aside }) => {
  const pct = Math.round((progress ?? (current + 1) / steps.length) * 100);
  return (
    <div className="rk-progress">
      <div className="rk-progress-row">
        <p><strong>{current + 1} of {steps.length}</strong> · {steps[current]}</p>
        {aside}
      </div>
      <div className="rk-track" role="progressbar" aria-label="Form progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="rk-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
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
      <strong>Please check the marked details</strong>
      <p>Your other answers are still here.</p>
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
