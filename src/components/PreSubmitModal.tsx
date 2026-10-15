import React, { useEffect, useRef } from 'react';

interface PreSubmitModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Modal that pops up when the user clicks Submit on the review screen.
 * Displays "What happens next" steps so the user is informed before final submit.
 */
export const PreSubmitModal: React.FC<PreSubmitModalProps> = ({
  isOpen, isSubmitting, onConfirm, onClose
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      confirmBtnRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isSubmitting) onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  return (
    <div className="rk-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-next-steps-title">
      <div className="rk-modal-container">
        <div className="rk-modal-card" ref={modalRef}>
          <div className="rk-modal-header">
            <span className="rk-modal-badge">
              <span className="rk-modal-badge-dot" aria-hidden="true" />
              Before you submit
            </span>
            <h2 id="modal-next-steps-title">What happens next</h2>
          </div>

          <div className="rk-modal-body">
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
            <p className="rk-modal-notice">
              Please have your phone ready after submitting to complete your identity verification.
            </p>
          </div>

          <div className="rk-modal-actions">
            <button
              type="button"
              className="rk-primary rk-primary-full rk-modal-confirm-btn"
              ref={confirmBtnRef}
              disabled={isSubmitting}
              onClick={onConfirm}
            >
              {isSubmitting && <span className="rk-spinner" aria-hidden="true" />}
              {isSubmitting ? 'Submitting form...' : 'I understand, submit form'} <span className="rk-arrow" aria-hidden="true">›</span>
            </button>
            <button
              type="button"
              className="rk-back rk-modal-cancel-btn"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Back to review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
