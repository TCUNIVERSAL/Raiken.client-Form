import React, { useRef } from 'react';
import { ConveyancingRole } from '../types/index.js';
import { ChoiceCards } from './form/fields.js';
import { ClockIcon, HomeIcon, IdCardIcon, ShieldIcon, SignIcon, UsersIcon } from './form/icons.js';

interface RoleSelectorProps {
  selectedRole: ConveyancingRole | null;
  /** advance=false when the choice came from arrow keys: select only, so keyboard users are not moved on unexpectedly. */
  onSelectRole: (role: ConveyancingRole, advance: boolean) => void;
  returningUserName?: string;
  error?: string;
}

/** What to have ready before starting — so nobody gets stuck half-way through. */
const NEED_TO_HAVE = [
  { icon: <UsersIcon />, text: 'Name, date of birth and contact details for each person on the contract' },
  { icon: <HomeIcon />, text: 'The property address and price' },
  { icon: <IdCardIcon />, text: 'Photo ID, if you have it handy (you can also send it later)' }
];

export const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole, onSelectRole, returningUserName, error }) => {
  const arrowKeyRef = useRef(false);

  return (
    <>
      <section
        className="rk-panel rk-role-panel"
        onKeyDown={e => { arrowKeyRef.current = e.key.startsWith('Arrow'); }}
        onPointerDown={() => { arrowKeyRef.current = false; }}
      >
        {returningUserName && <p className="rk-welcome">Welcome back, {returningUserName}.</p>}
        <ChoiceCards
          id="role"
          label="Are you buying or selling a property?"
          required
          size="large"
          value={selectedRole || ''}
          error={error}
          onChange={v => {
            onSelectRole(v as ConveyancingRole, !arrowKeyRef.current);
            arrowKeyRef.current = false;
          }}
          options={[
            { value: 'Purchaser', label: 'I’m buying', description: 'I’m purchasing a property', icon: <HomeIcon size={26} /> },
            { value: 'Vendor', label: 'I’m selling', description: 'I’m selling a property', icon: <SignIcon size={26} /> }
          ]}
        />
      </section>

      <section className="rk-ready" aria-labelledby="ready-title">
        <h2 id="ready-title" className="rk-ready-title">Before you start, have these ready</h2>
        <ul className="rk-ready-list">
          {NEED_TO_HAVE.map(item => (
            <li key={item.text}>
              <span className="rk-ready-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
        <div className="rk-ready-meta">
          <span><ClockIcon size={16} /> About 10 minutes</span>
          <span><ShieldIcon size={16} /> Your details are stored privately</span>
        </div>
      </section>
    </>
  );
};
