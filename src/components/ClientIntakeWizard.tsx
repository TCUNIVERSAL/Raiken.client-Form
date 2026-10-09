import React, { useEffect, useRef, useState } from 'react';
import {
  ClientIntakeFormData, ConveyancingRole, DeclarationFormData, FinanceFormData, PartyFormData,
  PropertyFormData, StampDutyFormData, SubmissionResponse, UploadedDocument
} from '../types/index.js';
import { RoleSelector } from './RoleSelector.js';
import { SubmissionSuccess } from './SubmissionSuccess.js';
import { getRememberedUser, saveUserIdentityCookies, collectClientTelemetry } from '../utils/tracker.js';
import {
  clearHiddenStampDutyAnswers, FieldErrors, validateDeclaration, validatePartyAddress, validatePartyDetails,
  validateProperty, validateStampDuty
} from '../utils/validation.js';
import {
  Address, applyAddressChange, applySameAsAbove, collectDocuments, createInitialFormData, createParty,
  MAX_PARTIES, StepKey, stepFromNumber, stepsFor, stepTitle, stepToNumber
} from './form/formState.js';
import { ErrorSummary, Notice, Stepper } from './form/fields.js';
import { PeopleStep } from './form/PeopleStep.js';
import { PropertyStep } from './form/PropertyStep.js';
import { StampDutyStep } from './form/StampDutyStep.js';
import { ReviewProblem, ReviewStep } from './form/ReviewStep.js';
import { useSessionSync } from './form/useSessionSync.js';
import { FormHeader, saveStateFor } from './form/FormHeader.js';
import { ArrowLeftIcon, ArrowRightIcon } from './form/icons.js';
import '../form.css';

function prefixKeys(errors: FieldErrors, prefix: string): FieldErrors {
  const out: FieldErrors = {};
  Object.entries(errors).forEach(([k, v]) => { out[`${prefix}${k.replace('.', '-')}`] = v; });
  return out;
}

const STEP_HEADINGS: Record<StepKey, (role: ConveyancingRole) => { title: string; lead?: string }> = {
  start: () => ({
    title: 'Welcome to Raikan Conveyancing',
    lead: 'A few simple questions so we can start on your property. Your answers save automatically, so you can stop and come back any time.'
  }),
  people: role => ({
    title: role === 'Purchaser' ? 'Who is buying?' : 'Who is selling?',
    lead: `Add everyone who will be named on the contract as a ${role === 'Purchaser' ? 'buyer' : 'seller'}.`
  }),
  property: role => ({
    title: 'About the property',
    lead: role === 'Purchaser'
      ? 'Tell us about the property and how you plan to pay for it.'
      : 'Tell us about the property you are selling.'
  }),
  stampDuty: () => ({
    title: 'Stamp duty relief',
    lead: 'First home buyers may pay less stamp duty. Answer a few quick questions — if you’re unsure, choose “Not sure” and we’ll check for you.'
  }),
  review: () => ({ title: 'Check and sign', lead: 'Make sure everything looks right, then sign at the bottom to send it to us.' })
};

export const ClientIntakeWizard: React.FC = () => {
  const [step, setStep] = useState<StepKey>('start');
  const [partyIndex, setPartyIndex] = useState(0);
  const [formData, setFormData] = useState<ClientIntakeFormData>(createInitialFormData);
  const [attempted, setAttempted] = useState<Partial<Record<StepKey, boolean>>>({});
  /** Fields the client has filled in and left — their format errors show without waiting for "Continue". */
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [returnToReview, setReturnToReview] = useState(false);
  const [uploadsInFlight, setUploadsInFlight] = useState(0);
  const [ready, setReady] = useState(false);
  const [restoredNotice, setRestoredNotice] = useState(false);
  const [confirmStartOver, setConfirmStartOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<{ response: SubmissionResponse; formData: ClientIntakeFormData } | null>(null);
  const [returningUser, setReturningUser] = useState('');

  const sync = useSessionSync(ready && !submission);
  const saveImmediatelyRef = useRef(false);
  // Saved answers are applied once per page; re-running effects (StrictMode, hot reload)
  // must never overwrite newer answers with the snapshot loaded at start-up.
  const restoreAppliedRef = useRef(false);
  const submittingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepChangedByUser = useRef(false);

  const role = formData.role;
  const steps = stepsFor(role);
  const stepIndex = Math.max(0, steps.indexOf(step));
  const isLastStep = step === 'review';

  // ─── Load saved answers from the server (or this device when offline) ─────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = await sync.restore();
      if (cancelled || restoreAppliedRef.current) return;
      restoreAppliedRef.current = true;
      if (restored?.hasAnswers) {
        setFormData(restored.formData);
        setStep(stepFromNumber(restored.formData.role, restored.currentStep));
        setPartyIndex(restored.partyIndex);
        setRestoredNotice(restored.currentStep > 1);
      } else {
        // Nothing saved yet — pre-fill contact details remembered from an earlier visit
        const remembered = getRememberedUser();
        if (remembered.name || remembered.phone || remembered.email) {
          setReturningUser(remembered.name || remembered.email || remembered.phone);
          setFormData(prev => {
            const parties = [...prev.parties];
            const nameParts = (remembered.name || '').split(' ');
            parties[0] = {
              ...parties[0],
              firstName: parties[0].firstName || nameParts[0] || '',
              lastName: parties[0].lastName || nameParts.slice(1).join(' ') || '',
              mobile: parties[0].mobile || remembered.phone || '',
              email: parties[0].email || remembered.email || ''
            };
            return { ...prev, parties };
          });
        }
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Save every change to the server ───────────────────────────────────────
  useEffect(() => {
    if (!ready || submission) return;
    const immediate = saveImmediatelyRef.current;
    saveImmediatelyRef.current = false;
    sync.queueSave({ formData, currentStep: stepToNumber(role, step), partyIndex: Math.max(0, partyIndex) }, immediate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, step, partyIndex, ready]);

  /** Marks the next state change as important enough to save without waiting. */
  const saveSoon = () => { saveImmediatelyRef.current = true; };

  // Start each step at the top and move keyboard / screen-reader focus to its heading
  useEffect(() => {
    window.scrollTo(0, 0);
    if (stepChangedByUser.current) headingRef.current?.focus({ preventScroll: true });
    stepChangedByUser.current = false;
  }, [step]);

  // ─── Validation ────────────────────────────────────────────────────────────
  const errorsForStep = (s: StepKey, data: ClientIntakeFormData = formData): FieldErrors => {
    switch (s) {
      case 'start':
        return data.roleConfirmed ? {} : { role: 'Please choose whether you are buying or selling.' };
      case 'people': {
        // Validate ALL parties' details AND addresses together
        let allErrors: FieldErrors = {};
        data.parties.forEach(p => {
          allErrors = { ...allErrors, ...prefixKeys(validatePartyDetails(p), `${p.id}-`) };
          allErrors = { ...allErrors, ...prefixKeys(validatePartyAddress(p), `${p.id}-addr-`) };
        });
        return allErrors;
      }
      case 'property':
        return prefixKeys(validateProperty(data), '');
      case 'stampDuty':
        return prefixKeys(validateStampDuty(data.stampDuty), '');
      case 'review':
        return prefixKeys(validateDeclaration(data), '');
    }
  };

  // Live errors drive the ✓ marks. Errors are shown for fields the client has filled in and left,
  // and for every field once they try to continue.
  const liveErrors = errorsForStep(step);
  const errors: FieldErrors = {};
  Object.entries(liveErrors).forEach(([key, message]) => {
    if (attempted[step] || touched.has(key)) errors[key] = message;
  });

  // On pages where several people answer the same questions, say whose answer is missing
  // On the people step each person gets one short line (it opens their panel); each field shows its own message.
  const summaryErrors: FieldErrors = {};
  if (attempted[step]) {
    const ownerOf = (key: string) => (step === 'people'
      ? formData.parties.findIndex(p => key.startsWith(`${p.id}-`))
      : -1);
    const keys = Object.keys(liveErrors);
    keys.forEach(key => {
      const owner = ownerOf(key);
      if (owner === -1) summaryErrors[key] = liveErrors[key];
      else if (!Object.keys(summaryErrors).some(k => ownerOf(k) === owner)) {
        const count = keys.filter(k => ownerOf(k) === owner).length;
        summaryErrors[key] = count === 1
          ? `${role} ${owner + 1}: ${liveErrors[key]}`
          : `${role} ${owner + 1}: ${count} answers to complete`;
      }
    });
  }

  const reviewProblems: ReviewProblem[] = [];
  formData.parties.forEach((p, i) => {
    if (Object.keys(validatePartyDetails(p)).length) {
      reviewProblems.push({ step: 'people', partyIndex: i, message: `${role} ${i + 1}: some personal details are missing or incorrect.` });
    }
  });
  formData.parties.forEach((p, i) => {
    if (Object.keys(validatePartyAddress(p)).length) {
      reviewProblems.push({ step: 'people', partyIndex: i, message: `${role} ${i + 1}: the address is missing or incomplete.` });
    }
  });
  if (Object.keys(validateProperty(formData)).length) {
    reviewProblems.push({ step: 'property', message: 'Property: some answers are missing or incorrect.' });
  }
  if (role === 'Purchaser' && Object.keys(validateStampDuty(formData.stampDuty)).length) {
    reviewProblems.push({ step: 'stampDuty', message: 'Stamp duty: some questions have not been answered.' });
  }

  /** Opens the person a field belongs to, then scrolls to and focuses the field. */
  const focusField = (fieldId: string | undefined) => {
    if (!fieldId) return;
    const owner = formData.parties.findIndex(p => fieldId.startsWith(`${p.id}-`));
    if (step === 'people' && owner !== -1) setPartyIndex(owner);
    // Wait for the panel and error messages to render before moving focus
    setTimeout(() => {
      const el = document.getElementById(fieldId);
      el?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      el?.focus({ preventScroll: true });
    }, 60);
  };

  /** A filled-in field the client leaves is validated straight away (empty fields wait for "Continue"). */
  const handleBlurCapture = (e: React.FocusEvent<HTMLElement>) => {
    const target = e.target as HTMLInputElement;
    if (!target.id || !('value' in target) || target.type === 'checkbox' || target.type === 'radio') return;
    if (!String(target.value).trim()) return;
    if (touched.has(target.id)) return;
    setTouched(prev => new Set(prev).add(target.id));
  };

  // ─── State updates ─────────────────────────────────────────────────────────
  const updateParty = (index: number, field: keyof PartyFormData, value: string) => {
    setFormData(prev => {
      const parties = [...prev.parties];
      parties[index] = { ...parties[index], [field]: value };
      if (index === 0 && ['firstName', 'lastName', 'mobile', 'email'].includes(field)) {
        const p = parties[0];
        saveUserIdentityCookies({ name: `${p.firstName} ${p.lastName}`.trim(), phone: p.mobile, email: p.email });
      }
      return { ...prev, parties };
    });
  };

  /** Opens one person's panel (-1 closes them all). Errors already shown stay visible. */
  const selectParty = (index: number) => setPartyIndex(index);

  const addParty = () => {
    if (formData.parties.length >= MAX_PARTIES) return;
    saveSoon();
    const newIndex = formData.parties.length;
    setFormData(prev => {
      const parties = [...prev.parties, createParty()];
      return { ...prev, parties, partyCount: parties.length };
    });
    selectParty(newIndex);
  };

  const setPartyCount = (count: number) => {
    const clamped = Math.max(1, Math.min(MAX_PARTIES, count));
    saveSoon();
    setFormData(prev => {
      let parties = [...prev.parties];
      if (clamped > parties.length) {
        while (parties.length < clamped) parties.push(createParty());
      } else if (clamped < parties.length) {
        parties = parties.slice(0, clamped);
      }
      // The first person has nobody "above" them to copy from
      if (parties[0]?.sameAddressAsPrevious) parties[0] = { ...parties[0], sameAddressAsPrevious: false };
      return { ...prev, parties, partyCount: parties.length };
    });
    if (partyIndex >= clamped) selectParty(clamped - 1);
  };

  const removeParty = (index: number) => {
    saveSoon();
    setFormData(prev => {
      const parties = prev.parties.filter((_, i) => i !== index);
      // The first person has nobody "above" them to copy from
      if (parties[0]?.sameAddressAsPrevious) parties[0] = { ...parties[0], sameAddressAsPrevious: false };
      return { ...prev, parties, partyCount: parties.length };
    });
    if (partyIndex === -1) return;
    const nextIndex = index < partyIndex ? partyIndex - 1 : Math.min(partyIndex, formData.parties.length - 2);
    selectParty(Math.max(0, nextIndex));
  };

  const addDocument = (partyId: string, doc: UploadedDocument) => {
    saveSoon();
    setFormData(prev => ({
      ...prev,
      parties: prev.parties.map(p => (p.id === partyId ? { ...p, idDocuments: [...p.idDocuments, doc] } : p))
    }));
  };

  const removeDocument = (partyId: string, docId: string) => {
    saveSoon();
    setFormData(prev => ({
      ...prev,
      parties: prev.parties.map(p => (p.id === partyId ? { ...p, idDocuments: p.idDocuments.filter(d => d.id !== docId) } : p))
    }));
  };

  const onUploadingChange = (uploading: boolean) => setUploadsInFlight(n => Math.max(0, n + (uploading ? 1 : -1)));

  // ─── Navigation ────────────────────────────────────────────────────────────
  const goToStep = (s: StepKey, pIndex = 0) => {
    saveSoon();
    setRestoredNotice(false);
    setAttempted(a => ({ ...a, [s]: false }));
    setPartyIndex(pIndex);
    stepChangedByUser.current = true;
    setStep(s);
  };

  const handleNext = () => {
    const stepErrors = errorsForStep(step);
    if (Object.keys(stepErrors).length) {
      setAttempted(a => ({ ...a, [step]: true }));
      focusField(Object.keys(stepErrors)[0]);
      return;
    }

    if (returnToReview) {
      setReturnToReview(false);
      goToStep('review');
      return;
    }
    goToStep(steps[Math.min(steps.length - 1, stepIndex + 1)]);
  };

  const handleBack = () => {
    const prev = steps[Math.max(0, stepIndex - 1)];
    goToStep(prev);
  };

  const handleSelectRole = (selected: ConveyancingRole, advance = true) => {
    setFormData(prev => ({ ...prev, role: selected, roleConfirmed: true }));
    if (!advance) return; // arrow keys only select; "Continue" moves on
    setRestoredNotice(false);
    setReturnToReview(false);
    goToStep(returnToReview ? 'review' : 'people');
  };

  const handleEditFromReview = (s: StepKey, pIndex = 0) => {
    setReturnToReview(true);
    goToStep(s, pIndex);
  };

  const handleBackToReview = () => {
    setReturnToReview(false);
    goToStep('review');
  };

  const handleStartOver = async () => {
    setConfirmStartOver(false);
    setRestoredNotice(false);
    setReady(false);
    await sync.startNewSession();
    setFormData(createInitialFormData());
    setStep('start');
    setPartyIndex(0);
    setAttempted({});
    setTouched(new Set());
    setReturnToReview(false);
    setSubmitError(null);
    setReady(true);
  };

  // ─── Submission (API → Supabase → confirmation email) ─────────────────────
  const handleSubmitIntake = async () => {
    if (submittingRef.current) return; // a double click must never send the form twice
    const declarationErrors = errorsForStep('review');
    setAttempted(a => ({ ...a, review: true }));
    if (reviewProblems.length > 0) {
      window.scrollTo(0, 0);
      return;
    }
    if (Object.keys(declarationErrors).length) {
      focusField(Object.keys(declarationErrors)[0]);
      return;
    }
    if (uploadsInFlight > 0) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    await sync.saveNow();

    const primary = formData.parties[0];
    const fullName = `${primary.firstName || ''} ${primary.lastName || ''}`.trim();
    const telemetry = collectClientTelemetry({ name: fullName, phone: primary.mobile, email: primary.email });
    const blank = createInitialFormData();
    const isVendor = formData.role === 'Vendor';
    const payload: ClientIntakeFormData = {
      ...formData,
      // Drop purchaser-only answers left over if the client switched role part-way through
      ...(isVendor && {
        stampDuty: blank.stampDuty,
        howDidYouHear: '',
        property: { ...formData.property, intendedUse: '', ownershipType: '' },
        finance: { ...formData.finance, brokerOrBankerName: '', brokerPhone: '', brokerEmail: '' },
        declaration: { ...formData.declaration, coolingOffAcknowledged: false }
      }),
      partyCount: formData.parties.length,
      idDocuments: collectDocuments(formData)
    };

    try {
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ formData: payload, telemetry, sessionId: sync.getSessionId() })
      });
      const data: SubmissionResponse = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Submission failed.');
      }
      sync.markSubmitted();
      setSubmission({ response: data, formData: payload });
      window.scrollTo(0, 0);
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmitError(navigator.onLine
        ? err.message || 'Something went wrong while sending the form.'
        : 'You appear to be offline.');
      window.scrollTo(0, 0);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleStartAnother = async () => {
    setSubmission(null);
    await handleStartOver();
  };

  const saveState = saveStateFor(sync.status, sync.lastSavedAt, uploadsInFlight > 0, formData.roleConfirmed);

  // ─── Render ────────────────────────────────────────────────────────────────
  if (submission) {
    return (
      <div className="rk-form">
        <div className="rk-hero rk-hero-short">
          <FormHeader saveState="none" lastSavedAt={null} />
          <div className="rk-hero-inner">
            <Stepper steps={steps.map(s => stepTitle(s, role))} current={steps.length} allDone />
          </div>
        </div>
        <div className="rk-shell">
          <SubmissionSuccess response={submission.response} formData={submission.formData} onStartAnother={handleStartAnother} />
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="rk-form">
        <div className="rk-hero rk-hero-short">
          <FormHeader saveState="none" lastSavedAt={null} />
        </div>
        <div className="rk-shell">
          <div className="rk-panel rk-loading" role="status">
            <span className="rk-spinner" aria-hidden="true" />
            Loading your form…
          </div>
        </div>
      </div>
    );
  }

  const heading = STEP_HEADINGS[step](role);
  let primaryLabel = 'Continue';
  if (isLastStep) primaryLabel = isSubmitting ? 'Sending…' : 'Submit form';
  else if (returnToReview) primaryLabel = 'Save and go back';
  // Picking buying / selling already moves on, so the first page only needs a button once a choice is made
  const showPrimary = step !== 'start' || formData.roleConfirmed;

  return (
    <div className="rk-form">
      {/* Navy band: brand, progress and the page title; the form card overlaps its lower edge */}
      <div className="rk-hero">
        <FormHeader saveState={saveState} lastSavedAt={sync.lastSavedAt} />
        <div className="rk-hero-inner">
          <Stepper steps={steps.map(s => stepTitle(s, role))} current={stepIndex} />
          <div className="rk-intro" key={step}>
            <h1 className="rk-title" tabIndex={-1} ref={headingRef}>{heading.title}</h1>
            {heading.lead && <p className="rk-lead">{heading.lead}</p>}
          </div>
        </div>
      </div>

      <div className="rk-shell">
        <div className="rk-step-body" key={step} onBlurCapture={handleBlurCapture}>
          {restoredNotice && (
            <Notice tone="info" role="status" className="rk-restored">
              <p>Welcome back. We kept your answers.</p>
              {confirmStartOver ? (
                <div className="rk-confirm-actions">
                  <span>Clear this form and start again?</span>
                  <button type="button" className="rk-btn rk-btn-danger rk-btn-small" onClick={handleStartOver}>Yes, start again</button>
                  <button type="button" className="rk-btn rk-btn-secondary rk-btn-small" onClick={() => setConfirmStartOver(false)}>Cancel</button>
                </div>
              ) : (
                <button type="button" className="rk-link-button" onClick={() => setConfirmStartOver(true)}>Start a new form</button>
              )}
            </Notice>
          )}

          {returnToReview && !isLastStep && (
            <div className="rk-edit-banner" role="status">
              <p>Editing an answer</p>
              <button type="button" className="rk-link-button" onClick={handleBackToReview}>Back to review</button>
            </div>
          )}

          {!isLastStep && <ErrorSummary errors={summaryErrors} onSelect={focusField} />}

          {step === 'start' && (
            <RoleSelector
              selectedRole={formData.roleConfirmed ? role : null}
              onSelectRole={handleSelectRole}
              returningUserName={returningUser}
              error={errors.role}
            />
          )}

          {step === 'people' && (
            <PeopleStep
              formData={formData}
              partyIndex={partyIndex}
              errors={errors}
              live={liveErrors}
              onSelectParty={selectParty}
              onUpdateParty={updateParty}
              onSetPartyCount={setPartyCount}
              onAddParty={addParty}
              onRemoveParty={removeParty}
              onAddDocument={addDocument}
              onRemoveDocument={removeDocument}
              onUploadingChange={onUploadingChange}
              onAddressChange={(i: number, patch: Partial<Address>) => setFormData(prev => ({ ...prev, parties: applyAddressChange(prev.parties, i, patch) }))}
              onSameAsAbove={(i: number, checked: boolean) => {
                saveSoon();
                setFormData(prev => ({ ...prev, parties: applySameAsAbove(prev.parties, i, checked) }));
              }}
            />
          )}

          {step === 'property' && (
            <PropertyStep
              formData={formData}
              errors={errors}
              live={liveErrors}
              onPropertyChange={(patch: Partial<PropertyFormData>) => setFormData(prev => ({ ...prev, property: { ...prev.property, ...patch } }))}
              onFinanceChange={(patch: Partial<FinanceFormData>) => setFormData(prev => ({ ...prev, finance: { ...prev.finance, ...patch } }))}
              onHowDidYouHearChange={(value: string) => setFormData(prev => ({ ...prev, howDidYouHear: value }))}
              onUploadingChange={onUploadingChange}
            />
          )}

          {step === 'stampDuty' && (
            <StampDutyStep
              stampDuty={formData.stampDuty}
              errors={errors}
              onChange={(patch: Partial<StampDutyFormData>) => setFormData(prev => ({
                ...prev,
                stampDuty: clearHiddenStampDutyAnswers({ ...prev.stampDuty, ...patch })
              }))}
            />
          )}

          {step === 'review' && (
            <ReviewStep
              formData={formData}
              problems={reviewProblems}
              errors={errors}
              live={liveErrors}
              onDeclarationChange={(patch: Partial<DeclarationFormData>) => setFormData(prev => ({ ...prev, declaration: { ...prev.declaration, ...patch } }))}
              onEdit={handleEditFromReview}
              submitError={submitError}
            />
          )}
        </div>

        {/* Navigation — stays at the bottom of the screen so it never has to be scrolled to */}
        {showPrimary && (
          <div className="rk-nav">
            <div className="rk-nav-inner">
              {step !== 'start' ? (
                <button type="button" className="rk-btn rk-btn-ghost rk-nav-back" onClick={handleBack} disabled={isSubmitting}>
                  <ArrowLeftIcon size={18} />
                  Back
                </button>
              ) : <span />}
              <div className="rk-nav-right">
                {uploadsInFlight > 0 && isLastStep && <span className="rk-nav-note">Waiting for an upload to finish…</span>}
                <button
                  type="button"
                  className="rk-btn rk-btn-primary"
                  onClick={isLastStep ? handleSubmitIntake : handleNext}
                  disabled={isSubmitting || (isLastStep && uploadsInFlight > 0)}
                  aria-busy={isSubmitting || undefined}
                >
                  {isSubmitting && <span className="rk-spinner rk-spinner-light" aria-hidden="true" />}
                  {primaryLabel}
                  {!isSubmitting && !isLastStep && !returnToReview && <ArrowRightIcon size={18} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
