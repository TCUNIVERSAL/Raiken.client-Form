import React from 'react';
import { SyncStatus } from './useSessionSync.js';
import { PhoneIcon } from './icons.js';

export type SaveState = 'none' | 'uploading' | 'saving' | 'saved' | 'offline' | 'error' | 'auto';

/** Turns the sync state into one of the header's save messages. "Saved" only after the server confirmed it. */
export function saveStateFor(status: SyncStatus, lastSavedAt: string | null, uploading: boolean, started: boolean): SaveState {
  if (uploading) return 'uploading';
  if (status === 'saving') return 'saving';
  if (status === 'offline') return 'offline';
  if (status === 'error') return 'error';
  if (lastSavedAt) return 'saved';
  return started ? 'auto' : 'none';
}

/** `short` is shown on phones, where the header has little room. */
const MESSAGES: Record<Exclude<SaveState, 'none'>, { text: string; short: string; detail: string }> = {
  uploading: { text: 'Uploading file…', short: 'Uploading…', detail: 'Please wait until the upload finishes before you submit.' },
  saving: { text: 'Saving…', short: 'Saving…', detail: 'Your latest answers are being saved.' },
  saved: { text: 'All changes saved', short: 'Saved', detail: 'You can close this page and continue later on this device.' },
  offline: { text: 'Offline · kept on this device', short: 'Offline', detail: 'Your changes will be saved as soon as you are back online.' },
  error: { text: 'Not synced · retrying', short: 'Not synced', detail: 'We could not reach the server. Your changes are kept on this device and will be sent automatically.' },
  auto: { text: 'Answers save automatically', short: 'Auto-saves', detail: 'Your answers are saved as you go.' }
};

export const FormHeader: React.FC<{ saveState: SaveState; lastSavedAt: string | null }> = ({ saveState, lastSavedAt }) => {
  const message = saveState === 'none' ? null : MESSAGES[saveState];
  const time = lastSavedAt && saveState === 'saved'
    ? new Date(lastSavedAt).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <header className="rk-header">
      <div className="rk-header-inner">
        <div className="rk-brand">
          <span className="rk-brand-mark" aria-hidden="true">R</span>
          <span className="rk-brand-text">
            <span className="rk-brand-name">Raikan Conveyancing</span>
            <span className="rk-brand-sub">Client intake form</span>
          </span>
        </div>
        <div className="rk-header-end">
          <p className={`rk-save rk-save-${saveState}`} title={message?.detail}>
            {message && (
              <>
                <span className="rk-save-dot" aria-hidden="true" />
                <span className="rk-save-long">{message.text}{time && <span className="rk-save-time"> · {time}</span>}</span>
                <span className="rk-save-short" aria-hidden="true">{message.short}</span>
              </>
            )}
          </p>
          <a className="rk-help-link" href="tel:+61870769899" aria-label="Need help? Call us on 08 7076 9899">
            <PhoneIcon size={16} />
            <span className="rk-help-text">Need help? <strong>08 7076 9899</strong></span>
          </a>
        </div>
        {/* Screen readers hear only problems, not every routine save */}
        <span className="rk-sr-only" role="status" aria-live="polite">
          {message && (saveState === 'offline' || saveState === 'error') ? `${message.text}. ${message.detail}` : ''}
        </span>
      </div>
    </header>
  );
};
