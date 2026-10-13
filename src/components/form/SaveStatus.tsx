import React from 'react';
import { SyncStatus } from './useSessionSync.js';

export type SaveState = 'none' | 'uploading' | 'saving' | 'saved' | 'offline' | 'error' | 'auto';

/** Turns the sync state into one save message. "Saved" only appears after the server confirmed it. */
export function saveStateFor(status: SyncStatus, lastSavedAt: string | null, uploading: boolean, started: boolean): SaveState {
  if (uploading) return 'uploading';
  if (status === 'saving') return 'saving';
  if (status === 'offline') return 'offline';
  if (status === 'error') return 'error';
  if (lastSavedAt) return 'saved';
  return started ? 'auto' : 'none';
}

const MESSAGES: Record<Exclude<SaveState, 'none'>, string> = {
  uploading: 'Uploading file…',
  saving: 'Saving…',
  saved: 'All changes saved',
  offline: 'Offline — answers kept on this device',
  error: 'Not saved yet — retrying',
  auto: 'Answers save as you go'
};

/** Short save note in the top row of each screen. */
export const SaveStatus: React.FC<{ state: SaveState; lastSavedAt: string | null }> = ({ state, lastSavedAt }) => {
  const problem = state === 'offline' || state === 'error';
  const time = state === 'saved' && lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
    : '';
  return (
    <>
      <p className={`rk-footnote${problem ? ' rk-footnote-warning' : ''}`}>
        {state === 'none' ? '' : MESSAGES[state]}{time && ` · ${time}`}
      </p>
      {/* Screen readers hear only problems, not every routine save */}
      <span className="rk-sr-only" role="status" aria-live="polite">{problem ? MESSAGES[state as 'offline' | 'error'] : ''}</span>
    </>
  );
};
