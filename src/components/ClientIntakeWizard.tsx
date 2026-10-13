import React, { useEffect, useRef, useState } from 'react';
import {
  ClientIntakeFormData, ConveyancingRole, DeclarationFormData, FinanceFormData, PartyFormData,
  PropertyFormData, StampDutyFormData, SubmissionResponse, UploadedDocument
} from '../types/index.js';
import { SetupStep } from './SetupStep.js';
import { SubmissionSuccess } from './SubmissionSuccess.js';
import { getRememberedUser, saveUserIdentityCookies, collectClientTelemetry } from '../utils/tracker.js';
import {
  clearHiddenStampDutyAnswers, FieldErrors, validateDeclaration, validatePartyAddress, validatePartyDetails,
  validateProperty, validateStampDuty
} from '../utils/validation.js';
import {
  Address, applyAddressChange, applySameAsAbove, collectDocuments, createInitialFormData, createParty,
  MAX_PARTIES, partyHasAnswers, StepKey, stepFromNumber, stepsFor, stepTitle, stepToNumber
} from './form/formState.js';
import { ErrorSummary, FieldProblemsContext, Notice, Stepper } from './form/fields.js';
import { partyDisplayName, PeopleStep } from './form/PeopleStep.js';
import { PropertyStep } from './form/PropertyStep.js';
import { StampDutyStep } from './form/StampDutyStep.js';
import { ReviewProblem, ReviewStep } from './form/ReviewStep.js';
import { allScreens, PersonScreen, PropertyScreen, ScreenId, screensFor } from './form/screens.js';
import { useSessionSync } from './form/useSessionSync.js';
import { SaveStatus, saveStateFor } from './form/SaveStatus.js';
import '../form.css';

function prefixKeys(errors: FieldErrors, prefix: string): FieldErrors {
  const out: FieldErrors = {};
  Object.entries(errors).forEach(([k, v]) => { out[`${prefix}${k.replace('.', '-')}`] = v; });
  return out;
}

/** Shown in the button that leads to the next step. */
const NEXT_STEP_LABEL: Partial<Record<StepKey, string>> = {
  property: 'property',
  stampDuty: 'stamp duty',
  review: 'review'
};

export const ClientIntakeWizard: React.FC = () => {
  const [step, setStep] = useState<StepKey>('start');
  const [partyIndex, setPartyIndex] = useState(0);
  /** Each person has two pages; the other steps are one page each (see screens.ts). */
  const [screenId, setScreenId] = useState<ScreenId>('details');
  const [formData, setFormData] = useState<ClientIntakeFormData>(createInitialFormData);
  const [attempted, setAttempted] = useState<Partial<Record<StepKey, boolean>>>({});
  /** Fields the client has visited and left — their messages show without waiting for "Continue". */
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
  const pageChangedByUser = useRef(false);
  /** Where to return when the client opens "Change" (buying/selling, number of people) and keeps their choices. */
  const stepBeforeSetupRef = useRef<StepKey | null>(null);

  const role = formData.role;
  const roleLower = role.toLowerCase();
  const steps = stepsFor(role);
  const formSteps: StepKey[] = steps.filter(s => s !== 'start');
  const total = formData.parties.length;

  const screens = screensFor(step, formData, partyIndex);
  const screenIndex = Math.max(0, screens.findIndex(s => s.id === screenId));
  const screen = screens[screenIndex];
  const isFinalScreen = step === 'review';

  // ─── Load saved answers from the server (or this device when offline) ─────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const restored = await sync.restore();
        if (cancelled || restoreAppliedRef.current) return;
        restoreAppliedRef.current = true;
        if (restored?.hasAnswers) {
          const restoredStep = stepFromNumber(restored.formData.role, restored.currentStep);
          setFormData(restored.formData);
          setStep(restoredStep);
          setPartyIndex(restored.partyIndex);
          setScreenId(screensFor(restoredStep, restored.formData, restored.partyIndex)[0]?.id ?? 'details');
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
      } catch (err) {
        console.error('Session restore notice:', err);
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
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

  // Start each screen at the top and move keyboard / screen-reader focus to its heading
  useEffect(() => {
    window.scrollTo(0, 0);
    if (pageChangedByUser.current) headingRef.current?.focus({ preventScroll: true });
    pageChangedByUser.current = false;
  }, [step, partyIndex, screen?.id]);

  // ─── Validation ────────────────────────────────────────────────────────────
  const errorsForStep = (s: StepKey, data: ClientIntakeFormData = formData): FieldErrors => {
    switch (s) {
      case 'start':
        return data.roleConfirmed ? {} : { role: 'Please choose whether you are buying or selling.' };
      case 'people': {
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

  const liveErrors = errorsForStep(step);
  /** Only the open screen's questions count when pressing "Continue". */
  const pageErrors: FieldErrors = {};
  Object.entries(liveErrors).forEach(([key, message]) => {
    if (screen?.owns(key)) pageErrors[key] = message;
  });

  // Errors show for fields the client has left (empty or wrong), and for every field once they press Continue
  const errors: FieldErrors = {};
  Object.entries(pageErrors).forEach(([key, message]) => {
    if (attempted[step] || touched.has(key)) errors[key] = message;
  });
  const summaryErrors: FieldErrors = attempted[step] ? pageErrors : {};

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

  /** Opens the screen that holds a field (and the right person), then focuses the field. */
  const focusField = (fieldId: string | undefined) => {
    if (!fieldId) return;
    let owner = partyIndex;
    if (step === 'people') {
      const found = formData.parties.findIndex(p => fieldId.startsWith(`${p.id}-`));
      if (found !== -1) owner = found;
    }
    const target = screensFor(step, formData, owner).find(s => s.owns(fieldId));
    if (target) {
      setPartyIndex(owner);
      setScreenId(target.id);
    }
    // Wait for the screen and error messages to render before moving focus
    setTimeout(() => {
      const el = document.getElementById(fieldId);
      el?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      el?.focus({ preventScroll: true });
    }, 60);
  };

  /** A field is checked as soon as the client leaves it: a required field left empty shows its message straight away. */
  const handleBlurCapture = (e: React.FocusEvent<HTMLElement>) => {
    const target = e.target as HTMLInputElement;
    if (!target.id || !['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
    if (['checkbox', 'radio', 'file'].includes(target.type)) return;
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

  /** Sets buying/selling and the number of people (people past the new count are removed). */
  const applySetup = (newRole: ConveyancingRole, count: number) => {
    const clamped = Math.max(1, Math.min(MAX_PARTIES, count));
    saveSoon();
    setFormData(prev => {
      let parties = [...prev.parties];
      while (parties.length < clamped) parties.push(createParty());
      if (parties.length > clamped) parties = parties.slice(0, clamped);
      // The first person has nobody "above" them to copy an address from
      if (parties[0]?.sameAddressAsPrevious) parties[0] = { ...parties[0], sameAddressAsPrevious: false };
      return { ...prev, role: newRole, roleConfirmed: true, parties, partyCount: parties.length };
    });
  };

  const removalWarning = (count: number): string | null => {
    if (count >= total) return null;
    const lost = formData.parties.slice(count).filter(partyHasAnswers);
    if (!lost.length) return null;
    const names = lost.map(p => partyDisplayName(p) || `${role} ${formData.parties.indexOf(p) + 1}`).join(' and ');
    return `Choosing ${count} ${count === 1 ? 'person' : 'people'} removes the details already entered for ${names}.`;
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
  /** Opens a step at a given screen (default: its first screen). */
  const goToStep = (s: StepKey, pIndex = 0, sId?: ScreenId) => {
    saveSoon();
    setRestoredNotice(false);
    setAttempted(a => ({ ...a, [s]: false }));
    setPartyIndex(pIndex);
    setScreenId(sId ?? screensFor(s, formData, pIndex)[0]?.id ?? 'details');
    pageChangedByUser.current = true;
    setStep(s);
  };

  /** Moves to another screen within the current step. */
  const goToScreen = (pIndex: number, sId: ScreenId) => {
    saveSoon();
    setRestoredNotice(false);
    setAttempted(a => ({ ...a, [step]: false }));
    setPartyIndex(pIndex);
    setScreenId(sId);
    pageChangedByUser.current = true;
  };

  const lastScreenOf = (s: StepKey, pIndex = 0): ScreenId => {
    const list = screensFor(s, formData, pIndex);
    return list[list.length - 1]?.id ?? 'details';
  };

  const handleNext = () => {
    const pageKeys = Object.keys(pageErrors);
    if (pageKeys.length) {
      setAttempted(a => ({ ...a, [step]: true }));
      focusField(pageKeys[0]);
      return;
    }
    if (returnToReview && step !== 'review' && Object.keys(liveErrors).length === 0) {
      setReturnToReview(false);
      goToStep('review');
      return;
    }
    if (screenIndex < screens.length - 1) {
      goToScreen(partyIndex, screens[screenIndex + 1].id);
      return;
    }
    if (step === 'people' && partyIndex < total - 1) {
      goToScreen(partyIndex + 1, 'details');
      return;
    }
    if (returnToReview) {
      setReturnToReview(false);
      goToStep('review');
      return;
    }
    const next = formSteps[formSteps.indexOf(step) + 1];
    if (next) goToStep(next);
  };

  const handleBack = () => {
    if (screenIndex > 0) {
      goToScreen(partyIndex, screens[screenIndex - 1].id);
      return;
    }
    if (step === 'people') {
      if (partyIndex > 0) goToScreen(partyIndex - 1, lastScreenOf('people', partyIndex - 1));
      else openSetup();
      return;
    }
    const prev = formSteps[formSteps.indexOf(step) - 1];
    if (prev === 'people') goToStep('people', total - 1, lastScreenOf('people', total - 1));
    else if (prev) goToStep(prev, 0, lastScreenOf(prev));
  };

  /** Opens the first screen to change buying/selling or the number of people. */
  const openSetup = () => {
    stepBeforeSetupRef.current = step === 'start' ? null : step;
    setReturnToReview(false);
    goToStep('start');
  };

  const handleSetupContinue = (newRole: ConveyancingRole, count: number) => {
    const changed = !formData.roleConfirmed || newRole !== role || count !== total;
    applySetup(newRole, count);
    const back = stepBeforeSetupRef.current;
    stepBeforeSetupRef.current = null;
    if (!changed && back) goToStep(back);
    else goToStep('people', 0, 'details');
  };

  const handleSetupCancel = () => {
    const back = stepBeforeSetupRef.current || 'people';
    stepBeforeSetupRef.current = null;
    goToStep(back);
  };

  /** "Change" on the review: opens the first screen of that section that needs attention. */
  const handleEditFromReview = (s: StepKey, pIndex = 0) => {
    const problemKeys = Object.keys(errorsForStep(s));
    const list = screensFor(s, formData, pIndex);
    const target = list.find(sc => problemKeys.some(k => sc.owns(k))) ?? list[0];
    setReturnToReview(true);
    goToStep(s, pIndex, target?.id);
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
    setScreenId('details');
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
  const saveStatus = <SaveStatus state={saveState} lastSavedAt={sync.lastSavedAt} />;

  // ─── Render ────────────────────────────────────────────────────────────────
  if (submission) {
    return (
      <div className="rk-form-page">
        <SubmissionSuccess response={submission.response} formData={submission.formData} onStartAnother={handleStartAnother} />
      </div>
    );
  }

  if (step === 'start' || !screen) {
    return (
      <div className="rk-form-page rk-is-setup">
        <SetupStep
          role={formData.roleConfirmed ? role : null}
          count={total}
          editing={formData.roleConfirmed}
          returningUserName={returningUser}
          removalWarning={removalWarning}
          onContinue={handleSetupContinue}
          onCancel={handleSetupCancel}
          status={saveStatus}
        />
      </div>
    );
  }

  // Progress across every screen of the form, so the bar moves on each "Continue"
  const everyScreen = allScreens(formSteps, formData);
  const position = everyScreen.findIndex(s => s.step === step && s.partyIndex === partyIndex && s.id === screen.id);
  const progress = everyScreen.length ? (Math.max(0, position) + 1) / everyScreen.length : 0;

  let primaryLabel: string;
  const nextScreen = screens[screenIndex + 1];
  if (isFinalScreen) primaryLabel = isSubmitting ? 'Sending…' : 'Send my form';
  else if (returnToReview && Object.keys(liveErrors).length === 0) primaryLabel = 'Save and return to review';
  else if (nextScreen) primaryLabel = `Continue to ${nextScreen.short}`;
  else if (step === 'people' && partyIndex < total - 1) primaryLabel = `Continue to ${roleLower} ${partyIndex + 2}`;
  else if (returnToReview) primaryLabel = 'Continue to review';
  else primaryLabel = `Continue to ${NEXT_STEP_LABEL[formSteps[formSteps.indexOf(step) + 1]] ?? 'review'}`;

  const kicker = step === 'people' ? `${role} ${partyIndex + 1} of ${total}` : null;

  return (
    <div className="rk-form-page">
      <Stepper
        steps={formSteps.map(s => stepTitle(s, role))}
        current={Math.max(0, formSteps.indexOf(step))}
        progress={progress}
        aside={(
          <div className="rk-matter-summary">
            <span>
              {role === 'Purchaser' ? 'Buying' : 'Selling'}
              <span className="rk-summary-divider" aria-hidden="true">·</span>
              <strong>{total} {roleLower}{total > 1 ? 's' : ''}</strong>
            </span>
            <button type="button" onClick={openSetup} aria-label="Change buying or selling and number of people">Change</button>
          </div>
        )}
      />

      <FieldProblemsContext.Provider value={liveErrors}>
        <section
          className="rk-screen"
          key={`${step}-${partyIndex}-${screen.id}`}
          aria-labelledby="rk-screen-title"
          onBlurCapture={handleBlurCapture}
        >
          <div className="rk-screen-head">
            {kicker && <p className="rk-screen-kicker">{kicker}</p>}
            <h1 id="rk-screen-title" tabIndex={-1} ref={headingRef}>{screen.title}</h1>
          </div>

          {restoredNotice && (
            <Notice role="status" className="rk-notice-compact">
              <p>Welcome back. We kept your answers.</p>
              {confirmStartOver ? (
                <span className="rk-confirm-actions">
                  <button type="button" className="rk-btn-danger" onClick={handleStartOver}>Clear and start again</button>
                  <button type="button" className="rk-link-button" onClick={() => setConfirmStartOver(false)}>Cancel</button>
                </span>
              ) : (
                <button type="button" className="rk-link-button" onClick={() => setConfirmStartOver(true)}>Start a new form</button>
              )}
            </Notice>
          )}

          {returnToReview && step !== 'review' && (
            <Notice role="status" className="rk-notice-compact">
              <p>You are changing an answer.</p>
              <button type="button" className="rk-link-button" onClick={handleBackToReview}>Back to review</button>
            </Notice>
          )}

          {step !== 'review' && <ErrorSummary errors={summaryErrors} onSelect={focusField} />}

          {step === 'people' && (
            <PeopleStep
              formData={formData}
              partyIndex={partyIndex}
              screen={screen.id as PersonScreen}
              errors={errors}
              onUpdateParty={updateParty}
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
              screen={screen.id as PropertyScreen}
              errors={errors}
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
              onDeclarationChange={(patch: Partial<DeclarationFormData>) => setFormData(prev => ({ ...prev, declaration: { ...prev.declaration, ...patch } }))}
              onEdit={handleEditFromReview}
              submitError={submitError}
            />
          )}
        </section>
      </FieldProblemsContext.Provider>

      <div className="rk-actions">
        <button type="button" className="rk-back" onClick={handleBack} disabled={isSubmitting}>
          <span className="rk-arrow" aria-hidden="true">‹</span>Back
        </button>
        <div className="rk-actions-status">{saveStatus}</div>
        <button
          type="button"
          className="rk-primary"
          onClick={isFinalScreen ? handleSubmitIntake : handleNext}
          disabled={isSubmitting || (isFinalScreen && uploadsInFlight > 0)}
          aria-busy={isSubmitting || undefined}
        >
          {isSubmitting && <span className="rk-spinner" aria-hidden="true" />}
          {primaryLabel.startsWith('Continue to ')
            ? <>Continue<span className="rk-label-extra"> {primaryLabel.slice('Continue '.length)}</span></>
            : primaryLabel}
          {!isSubmitting && <span className="rk-arrow" aria-hidden="true">›</span>}
        </button>
      </div>
    </div>
  );
};
