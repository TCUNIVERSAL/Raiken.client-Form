import React, { useEffect, useRef } from 'react';
import { ClientIntakeFormData, SubmissionResponse } from '../types/index.js';
import { RaikanDetails } from './form/ReviewStep.js';

interface SubmissionSuccessProps {
  response: SubmissionResponse;
  formData: ClientIntakeFormData;
  onStartAnother: () => void;
}

const SuccessIcon = () => (
  <svg className="rk-success-icon" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false">
    <circle cx="32" cy="32" r="30" fill="var(--rk-success-soft)" />
    <path d="M20 33l8 8 16-17" fill="none" stroke="var(--rk-success)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SubmissionSuccess: React.FC<SubmissionSuccessProps> = ({ response, formData, onStartAnother }) => {
  const email = response.clientEmail || formData.parties[0]?.email;
  const several = formData.parties.length > 1;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { headingRef.current?.focus(); }, []);

  return (
    <section className="rk-panel rk-success" aria-labelledby="success-title">
      <SuccessIcon />
      <h1 id="success-title" className="rk-title" tabIndex={-1} ref={headingRef}>We’ve received your form</h1>
      <p className="rk-lead">
        {response.sentToLiveSign
          ? 'Your details have been sent to LiveSign to verify your identity.'
          : 'Your identity verification request is being sent to LiveSign.'}
      </p>

      <dl className="rk-reference-card">
        <div>
          <dt>Your reference</dt>
          <dd className="rk-reference">{response.matterReference}</dd>
        </div>
        {email && (
          <div>
            <dt>Confirmation email</dt>
            <dd>{response.emailDispatched ? `Sent to ${email}` : `We will email ${email}`}</dd>
          </div>
        )}
      </dl>
      <p className="rk-hint rk-center">Keep this reference if you call us.</p>

      <div className="rk-next-steps">
        <h2 className="rk-group-title">Next</h2>
        <ol>
          <li>{several ? 'Each person gets' : 'You’ll get'} an email from <strong>LiveSign</strong> (check junk too).</li>
          <li>Open it on your phone, scan your ID and take a selfie (about 5 minutes).</li>
          <li>We’ll email you once you’re verified.</li>
        </ol>
      </div>

      <RaikanDetails />

      <div className="rk-button-row">
        <button type="button" className="rk-btn rk-btn-secondary" onClick={() => window.print()}>Print this page</button>
        <button type="button" className="rk-btn rk-btn-ghost" onClick={onStartAnother}>Start another form</button>
      </div>
    </section>
  );
};
