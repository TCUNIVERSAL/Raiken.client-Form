import { ClientIntakeFormData } from '../../types/index.js';
import { stampDutyVisibility } from '../../utils/validation.js';
import { StepKey } from './formState.js';

/*
 * The pages of each step, grouped as in the approved design preview:
 * each person has two pages (personal details, then address and identity);
 * the property step has two for buyers (the property, then the mortgage and broker) and one for sellers;
 * stamp duty has one, plus an eligibility page for clients whose answers lead to the criteria;
 * review is one page.
 * A page knows which fields (error keys / element ids) belong to it, so validation,
 * "Continue" and "go to the problem" work one page at a time.
 */

export type PersonScreen = 'details' | 'address';
export type PropertyScreen = 'property' | 'finance';
export type StampDutyScreen = 'stampDuty' | 'eligibility';
export type ScreenId = PersonScreen | PropertyScreen | StampDutyScreen | 'review';

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
    { id: 'address', title: 'Current address', short: 'address', owns: k => field(k) !== null && !DETAILS_FIELDS.includes(field(k) as string) }
  ];
}

function propertyScreens(data: ClientIntakeFormData): Screen[] {
  // Sellers have no broker questions, so their mortgage question sits on the property page
  if (data.role === 'Vendor') {
    return [{ id: 'property', title: 'Property details', short: 'property', owns: k => k.startsWith('property-') || k.startsWith('finance-') }];
  }
  return [
    { id: 'property', title: 'Property details', short: 'property', owns: k => k.startsWith('property-') },
    { id: 'finance', title: 'Mortgage', short: 'mortgage', owns: k => k.startsWith('finance-') || k === 'howDidYouHear' }
  ];
}

/** The eligibility criteria are long, so they get their own page (only for clients whose answers lead there). */
const ELIGIBILITY_FIELDS = ['stampDuty-meetsEligibilityCriteria'];

function stampDutyScreens(data: ClientIntakeFormData): Screen[] {
  const show = stampDutyVisibility(data.stampDuty);
  const screens: Screen[] = [
    { id: 'stampDuty', title: 'Stamp duty relief', short: 'stamp duty', owns: k => k.startsWith('stampDuty-') && !ELIGIBILITY_FIELDS.includes(k) }
  ];
  if (show.criteria) {
    screens.push({ id: 'eligibility', title: 'Eligibility criteria', short: 'eligibility', owns: k => ELIGIBILITY_FIELDS.includes(k) });
  }
  return screens;
}
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
    case 'stampDuty': return stampDutyScreens(data);
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
