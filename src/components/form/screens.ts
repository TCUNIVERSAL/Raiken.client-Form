import { ClientIntakeFormData } from '../../types/index.js';
import { StepKey } from './formState.js';

/*
 * The pages of each step, grouped as in the approved design preview:
 * each person has two pages (personal details, then address and identity);
 * the property step has two (the property, then mortgage and payment);
 * stamp duty and review are one page each.
 * A page knows which fields (error keys / element ids) belong to it, so validation,
 * "Continue" and "go to the problem" work one page at a time.
 */

export type PersonScreen = 'details' | 'address';
export type PropertyScreen = 'property' | 'finance';
export type ScreenId = PersonScreen | PropertyScreen | 'stampDuty' | 'review';

export interface Screen {
  id: ScreenId;
  /** Page heading. */
  title: string;
  /** Used in the button that leads here: "Continue to address". */
  short: string;
  owns: (fieldKey: string) => boolean;
}

/** Fields on the first page of each person; everything else of theirs is on the address page. */
const DETAILS_FIELDS = ['firstName', 'middleName', 'lastName', 'dob', 'mobile', 'email'];

export function personScreens(partyId: string): Screen[] {
  const field = (k: string) => (k.startsWith(`${partyId}-`) ? k.slice(partyId.length + 1) : null);
  return [
    { id: 'details', title: 'Personal details', short: 'personal details', owns: k => DETAILS_FIELDS.includes(field(k) ?? '') },
    { id: 'address', title: 'Current address and identity', short: 'address', owns: k => field(k) !== null && !DETAILS_FIELDS.includes(field(k) as string) }
  ];
}

function propertyScreens(data: ClientIntakeFormData): Screen[] {
  const isPurchaser = data.role === 'Purchaser';
  return [
    { id: 'property', title: 'Property details', short: 'property', owns: k => k.startsWith('property-') },
    {
      id: 'finance',
      title: isPurchaser ? 'Mortgage and payment' : 'Mortgage',
      short: isPurchaser ? 'mortgage and payment' : 'mortgage',
      owns: k => k.startsWith('finance-') || k === 'howDidYouHear'
    }
  ];
}

const STAMP_DUTY_SCREEN: Screen = {
  id: 'stampDuty', title: 'Stamp duty relief', short: 'stamp duty', owns: k => k.startsWith('stampDuty-')
};
const REVIEW_SCREEN: Screen = {
  id: 'review', title: 'Review your details', short: 'review', owns: k => k.startsWith('declaration-')
};

/** The pages of one step (for the people step: the pages of one person). */
export function screensFor(step: StepKey, data: ClientIntakeFormData, partyIndex = 0): Screen[] {
  switch (step) {
    case 'people': {
      const party = data.parties[Math.min(Math.max(partyIndex, 0), data.parties.length - 1)];
      return personScreens(party.id);
    }
    case 'property': return propertyScreens(data);
    case 'stampDuty': return [STAMP_DUTY_SCREEN];
    case 'review': return [REVIEW_SCREEN];
    default: return [];
  }
}

/** Every page of the form in order, for the progress bar. */
export function allScreens(steps: StepKey[], data: ClientIntakeFormData): Array<{ step: StepKey; partyIndex: number; id: ScreenId }> {
  const out: Array<{ step: StepKey; partyIndex: number; id: ScreenId }> = [];
  steps.forEach(step => {
    if (step === 'start') return;
    if (step === 'people') {
      data.parties.forEach((_, i) => screensFor('people', data, i).forEach(s => out.push({ step, partyIndex: i, id: s.id })));
    } else {
      screensFor(step, data).forEach(s => out.push({ step, partyIndex: 0, id: s.id }));
    }
  });
  return out;
}
