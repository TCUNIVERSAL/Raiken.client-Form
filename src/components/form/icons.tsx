import React from 'react';

/** Simple line icons (24×24, stroke = currentColor). Decorative: always hidden from screen readers. */
const Icon: React.FC<{ size?: number; className?: string; children: React.ReactNode }> = ({ size = 20, className, children }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

type IconProps = { size?: number; className?: string };

export const UserIcon: React.FC<IconProps> = p => (
  <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></Icon>
);

export const UsersIcon: React.FC<IconProps> = p => (
  <Icon {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 19.5c1.2-3 3.6-4.5 6.5-4.5s5.3 1.5 6.5 4.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" /><path d="M18 15.2c1.6.6 2.8 2 3.5 4.3" /></Icon>
);

export const PhoneIcon: React.FC<IconProps> = p => (
  <Icon {...p}><path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" /></Icon>
);

export const HomeIcon: React.FC<IconProps> = p => (
  <Icon {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9v11h14V9" /><path d="M10 20v-5h4v5" /></Icon>
);

export const SignIcon: React.FC<IconProps> = p => (
  <Icon {...p}><path d="M5 21V4" /><path d="M5 5h13l-2.5 4L18 13H5" /></Icon>
);

export const IdCardIcon: React.FC<IconProps> = p => (
  <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M6 16c.6-1.4 1.7-2 3-2s2.4.6 3 2" /><path d="M14.5 10h4M14.5 13.5h3" /></Icon>
);

export const GlobeIcon: React.FC<IconProps> = p => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z" /></Icon>
);

export const DollarIcon: React.FC<IconProps> = p => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M14.8 9.2c-.4-1-1.5-1.7-2.8-1.7-1.7 0-2.8.9-2.8 2.1 0 2.9 5.8 1.5 5.8 4.6 0 1.2-1.2 2.2-3 2.2-1.4 0-2.5-.7-3-1.8" /><path d="M12 6v1.5M12 16.5V18" /></Icon>
);

export const BankIcon: React.FC<IconProps> = p => (
  <Icon {...p}><path d="M3 9.5 12 4l9 5.5" /><path d="M5 10v7M9.7 10v7M14.3 10v7M19 10v7" /><path d="M3 20h18" /></Icon>
);

export const KeyIcon: React.FC<IconProps> = p => (
  <Icon {...p}><circle cx="8" cy="15" r="4" /><path d="m11 12 8.5-8.5" /><path d="m16 7 2.5 2.5M18.5 4.5 21 7" /></Icon>
);

export const PenIcon: React.FC<IconProps> = p => (
  <Icon {...p}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" /><path d="m13.5 6.5 4 4" /></Icon>
);

export const ChatIcon: React.FC<IconProps> = p => (
  <Icon {...p}><path d="M4 5h16v11H9l-5 4V5z" /><path d="M8 9.5h8M8 12.5h5" /></Icon>
);

export const ShieldIcon: React.FC<IconProps> = p => (
  <Icon {...p}><path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6L12 3z" /><path d="m9 12 2 2 4-4" /></Icon>
);

export const ClockIcon: React.FC<IconProps> = p => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
);

export const FileIcon: React.FC<IconProps> = p => (
  <Icon {...p}><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 16.5h4" /></Icon>
);

export const ArrowRightIcon: React.FC<IconProps> = p => (
  <Icon {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Icon>
);

export const ArrowLeftIcon: React.FC<IconProps> = p => (
  <Icon {...p}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></Icon>
);

export const PlusIcon: React.FC<IconProps> = p => (
  <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
);

export const InfoIcon: React.FC<IconProps> = p => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5" /><path d="M12 7.6v.1" /></Icon>
);
