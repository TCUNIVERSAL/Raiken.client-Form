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
        <div className="rk-next-steps">
          <h2>What happens next</h2>
          <ol>
            <li>{several ? 'Each person gets' : 'You’ll get'} an email from <strong>LiveSign</strong> (check junk too).</li>
            <li>Open it on your phone, scan your ID and take a selfie (about 5 minutes).</li>
            <li>We’ll email you once you’re verified. Keep your reference if you call us.</li>
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
