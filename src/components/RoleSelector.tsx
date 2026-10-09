import React, { useRef } from 'react';
import { ConveyancingRole } from '../types/index.js';
import { ChoiceCards } from './form/fields.js';

interface RoleSelectorProps {
  selectedRole: ConveyancingRole | null;
  /** advance=false when the choice came from arrow keys: select only, so keyboard users are not moved on unexpectedly. */
  onSelectRole: (role: ConveyancingRole, advance: boolean) => void;
  returningUserName?: string;
  error?: string;
}

const HouseIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9v11h14V9" /><path d="M10 20v-5h4v5" />
  </svg>
);

const SaleSignIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 21V4" /><path d="M5 5h13l-2.5 4L18 13H5" />
  </svg>
);

export const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole, onSelectRole, returningUserName, error }) => {
  const arrowKeyRef = useRef(false);

  return (
    <section
      className="rk-panel"
      onKeyDown={e => { arrowKeyRef.current = e.key.startsWith('Arrow'); }}
      onPointerDown={() => { arrowKeyRef.current = false; }}
    >
      {returningUserName && <p className="rk-welcome">Welcome back, {returningUserName}.</p>}
      <ChoiceCards
        id="role"
        label="Are you buying or selling?"
        required
        value={selectedRole || ''}
        error={error}
        onChange={v => {
          onSelectRole(v as ConveyancingRole, !arrowKeyRef.current);
          arrowKeyRef.current = false;
        }}
        options={[
          { value: 'Purchaser', label: 'I’m buying', description: 'Purchaser', icon: <HouseIcon /> },
          { value: 'Vendor', label: 'I’m selling', description: 'Vendor', icon: <SaleSignIcon /> }
        ]}
      />
    </section>
  );
};
