import React, { useEffect, useRef } from 'react';
import { ClientIntakeFormData, SubmissionResponse } from '../types/index.js';
import { RaikanDetails } from './form/ReviewStep.js';

interface SubmissionSuccessProps {
  response: SubmissionResponse;
  formData: ClientIntakeFormData;
  onStartAnother: () => void;
}

export const SubmissionSuccess: React.FC<SubmissionSuccessProps> = ({ response, formData, onStartAnother }) => {
  const email = response.clientEmail || formData.parties[0]?.email;
  const several = formData.parties.length > 1;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { headingRef.current?.focus(); }, []);

  return (
    <section className="rk-done" aria-labelledby="success-title">
      <h1 id="success-title" tabIndex={-1} ref={headingRef}>We’ve received your form</h1>
      <p>
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

      <div className="rk-done-columns">
        <div className="rk-next-steps rk-next-steps-card rk-flash-pulse" role="region" aria-label="What happens next">
          <div className="rk-next-steps-header">
            <span className="rk-flash-badge">
              <span className="rk-pulse-dot" aria-hidden="true" />
              ACTION REQUIRED ON YOUR PHONE
            </span>
            <h2>What happens next</h2>
          </div>
          <ol className="rk-steps-timeline">
            <li className="rk-step-item">
              <span className="rk-step-num" aria-hidden="true">1</span>
              <div className="rk-step-content">
                <strong>You'll get an email from LiveSign</strong> <span className="rk-step-sub">(check junk too).</span>
              </div>
            </li>
            <li className="rk-step-item">
              <span className="rk-step-num" aria-hidden="true">2</span>
              <div className="rk-step-content">
                <strong>Open it on your phone</strong>, scan your ID and take a selfie <span className="rk-step-sub">(about 5 minutes).</span>
              </div>
            </li>
            <li className="rk-step-item">
              <span className="rk-step-num" aria-hidden="true">3</span>
              <div className="rk-step-content">
                <strong>We'll email you once you're verified.</strong> Keep your reference if you call us.
              </div>
            </li>
          </ol>
        </div>

        <RaikanDetails />
      </div>

      <div className="rk-button-row">
        <button type="button" className="rk-btn-secondary" onClick={() => window.print()}>Print this page</button>
        <button type="button" className="rk-btn-secondary" onClick={onStartAnother}>Start another form</button>
      </div>
    </section>
  );
};
