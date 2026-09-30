import React, { useState } from 'react';
import { ClientIntakeFormData, PartyFormData, UploadedDocument } from '../../types/index.js';
import { DOB_MIN, dobMax, isPartyDetailsComplete } from '../../utils/validation.js';
import { MAX_PARTIES } from './formState.js';
import { ChoiceCards, DateField, Suggestions, TextField, TickIcon } from './fields.js';
import { FileUpload } from './FileUpload.js';

interface PeopleStepProps {
  formData: ClientIntakeFormData;
  partyIndex: number;
  errors: Record<string, string>;
  live: Record<string, string>;
  onSelectParty: (index: number) => void;
  onUpdateParty: (index: number, field: keyof PartyFormData, value: string) => void;
  onAddParty: () => void;
  onRemoveParty: (index: number) => void;
  onAddDocument: (partyId: string, doc: UploadedDocument) => void;
  onRemoveDocument: (partyId: string, docId: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}

export const RESIDENCY_OPTIONS = [
  { value: 'Australian Citizen', label: 'Australian citizen', description: 'I am an Australian citizen.' },
  { value: 'Permanent Resident', label: 'Permanent resident', description: 'I hold an Australian permanent visa.' },
  { value: 'Temporary Resident', label: 'Temporary resident', description: 'I am in Australia on a temporary visa.' }
];

// For people without a job title; everyone else types theirs (e.g. Nurse, Electrician)
const OCCUPATION_SUGGESTIONS = ['Retired', 'Student', 'Self-employed', 'Business owner', 'Home duties', 'Not currently working'];

export function partyDisplayName(p: PartyFormData): string {
  return [p.firstName, p.lastName].filter(s => s.trim()).join(' ');
}

export const PeopleStep: React.FC<PeopleStepProps> = ({
  formData, partyIndex, errors, live, onSelectParty, onUpdateParty, onAddParty, onRemoveParty,
  onAddDocument, onRemoveDocument, onUploadingChange
}) => {
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const role = formData.role;
  const party = formData.parties[partyIndex];
  const total = formData.parties.length;
  const id = (field: string) => `${party.id}-${field}`;
  const ok = (field: keyof PartyFormData) => Boolean(String(party[field]).trim()) && !live[id(field)];
  const update = (field: keyof PartyFormData) => (value: string) => onUpdateParty(partyIndex, field, value);

  return (
    <>
      {/* Everyone on the form — this list scrolls on its own */}
      <section className="rk-panel" aria-labelledby="party-list-title">
        <div className="rk-panel-head">
          <h2 id="party-list-title" className="rk-panel-title">{role}s on this contract ({total})</h2>
          <p className="rk-hint">Add every person whose name will be on the contract.</p>
        </div>

        <ol className="rk-party-list" aria-label={`${role} list`}>
          {formData.parties.map((p, i) => {
            const name = partyDisplayName(p);
            const complete = isPartyDetailsComplete(p);
            const isCurrent = i === partyIndex;
            const confirming = confirmRemoveId === p.id;
            return (
              <li key={p.id} className={`rk-party${isCurrent ? ' rk-party-current' : ''}`}>
                <span className={`rk-party-dot${complete ? ' rk-party-dot-done' : ''}`} aria-hidden="true">
                  {complete ? <TickIcon /> : i + 1}
                </span>
                <span className="rk-party-info">
                  <span className="rk-party-name">{name || `${role} ${i + 1}`}</span>
                  <span className="rk-party-status">
                    {isCurrent ? 'You are editing this person' : complete ? 'Details complete' : 'Details needed'}
                  </span>
                </span>
                {confirming ? (
                  <span className="rk-party-actions">
                    <span className="rk-confirm">Remove {name || `${role} ${i + 1}`}?</span>
                    <button type="button" className="rk-btn rk-btn-danger rk-btn-small"
                      onClick={() => { setConfirmRemoveId(null); onRemoveParty(i); }}>
                      Yes, remove
                    </button>
                    <button type="button" className="rk-btn rk-btn-secondary rk-btn-small" onClick={() => setConfirmRemoveId(null)}>
                      Cancel
                    </button>
                  </span>
                ) : (
                  <span className="rk-party-actions">
                    {!isCurrent && (
                      <button type="button" className="rk-btn rk-btn-secondary rk-btn-small" onClick={() => onSelectParty(i)}>
                        Edit
                      </button>
                    )}
                    {total > 1 && (
                      <button type="button" className="rk-link-button rk-danger" onClick={() => setConfirmRemoveId(p.id)}>
                        Remove
                      </button>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <button type="button" className="rk-add-button" onClick={onAddParty} disabled={total >= MAX_PARTIES}>
          + Add another {role.toLowerCase()}
        </button>
        {total >= MAX_PARTIES && <p className="rk-hint">You can add up to {MAX_PARTIES} people.</p>}
      </section>

      {/* Details of the selected person */}
      <section className="rk-panel" aria-labelledby="party-form-title">
        <div className="rk-panel-head">
          <p className="rk-overline">{role} {partyIndex + 1} of {total}</p>
          <h2 id="party-form-title" className="rk-panel-title">{partyDisplayName(party) || `${role} ${partyIndex + 1}`}</h2>
        </div>

        <TextField id={id('firstName')} label="First name" required placeholder="e.g. John" autoComplete="given-name"
          value={party.firstName} error={errors[id('firstName')]} valid={ok('firstName')} onChange={update('firstName')} />
        <TextField id={id('middleName')} label="Middle name" placeholder="e.g. Michael" autoComplete="additional-name"
          value={party.middleName} valid={ok('middleName')} onChange={update('middleName')} />
        <TextField id={id('lastName')} label="Last name" required placeholder="e.g. Smith" autoComplete="family-name"
          hint="Please write your name exactly as it appears on your ID."
          value={party.lastName} error={errors[id('lastName')]} valid={ok('lastName')} onChange={update('lastName')} />
        <TextField id={id('mobile')} type="tel" inputMode="tel" label="Phone" required
          placeholder="e.g. 0412 345 678" autoComplete="tel" maxLength={20}
          value={party.mobile} error={errors[id('mobile')]} valid={ok('mobile')} onChange={update('mobile')} />
        <TextField id={id('email')} type="email" inputMode="email" label="Email" required
          placeholder="e.g. john.smith@example.com" autoComplete="email"
          hint={partyIndex === 0 ? 'We will send your confirmation to this email.' : undefined}
          value={party.email} error={errors[id('email')]} valid={ok('email')} onChange={update('email')} />
        <DateField
          id={id('dob')}
          label="Date of birth"
          required
          hint="You must be 18 or older."
          min={DOB_MIN}
          max={dobMax()}
          autoComplete="bday"
          value={party.dob}
          error={errors[id('dob')]}
          valid={ok('dob')}
          onChange={update('dob')}
        />

        <TextField id={id('occupation')} label="Occupation" required placeholder="e.g. Nurse" autoComplete="organization-title"
          hint="Needed for the identity and anti-money-laundering check."
          value={party.occupation} error={errors[id('occupation')]} valid={ok('occupation')} onChange={update('occupation')} />
        <Suggestions items={OCCUPATION_SUGGESTIONS} current={party.occupation} onPick={update('occupation')} />

        <ChoiceCards
          id={id('residencyStatus')}
          label="Residency status"
          required
          columns={3}
          options={RESIDENCY_OPTIONS}
          value={party.residencyStatus}
          error={errors[id('residencyStatus')]}
          onChange={update('residencyStatus')}
        />

        <FileUpload
          id={id('idDocuments')}
          label="Photo ID"
          hint="Driver licence, passport or photo card. You can upload the front and back as separate files. A clear phone photo is fine."
          kind="identity"
          partyId={party.id}
          value={party.idDocuments}
          onAdd={doc => onAddDocument(party.id, doc)}
          onRemove={docId => onRemoveDocument(party.id, docId)}
          onUploadingChange={onUploadingChange}
        />
      </section>
    </>
  );
};
