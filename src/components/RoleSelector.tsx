import React from 'react';
import { ConveyancingRole } from '../types/index.js';
import { ChoiceCards } from './form/fields.js';

interface RoleSelectorProps {
  selectedRole: ConveyancingRole | null;
  onSelectRole: (role: ConveyancingRole) => void;
  returningUserName?: string;
  error?: string;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole, onSelectRole, returningUserName, error }) => (
  <section className="rk-panel">
    {returningUserName && <p className="rk-welcome">Welcome back, {returningUserName}.</p>}
    <ChoiceCards
      id="role"
      label="Are you buying or selling?"
      required
      hint="Choose one. Your form opens straight away."
      value={selectedRole || ''}
      error={error}
      onChange={v => onSelectRole(v as ConveyancingRole)}
      options={[
        { value: 'Purchaser', label: 'I am a Purchaser', description: 'I am buying a property (on my own or with others).' },
        { value: 'Vendor', label: 'I am a Vendor', description: 'I am selling a property (on my own or with others).' }
      ]}
    />
  </section>
);
