import '../helpers/setup.js';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { addDaysIso, cleanMoneyInput, formatMoneyDisplay } from '../../src/utils/format.js';
import { createParty, partyHasAnswers } from '../../src/components/form/formState.js';
import { validateProperty } from '../../src/utils/validation.js';
import { createInitialFormData } from '../../src/components/form/formState.js';

describe('Settlement date shortcuts', () => {
  test('TC-UI-01 "+30 days" counts from the local date, across month and year ends', () => {
    assert.equal(addDaysIso(30, new Date(2026, 9, 9)), '2026-11-08');
    assert.equal(addDaysIso(45, new Date(2026, 11, 20)), '2027-02-03');
    assert.equal(addDaysIso(1, new Date(2028, 1, 28)), '2028-02-29', 'leap year');
  });

  test('TC-UI-02 an early-morning local time is never shifted to the previous day (UTC bug)', () => {
    // 00:30 local time: toISOString() would give the previous day in time zones east of UTC (e.g. Adelaide)
    assert.equal(addDaysIso(0, new Date(2026, 9, 9, 0, 30)), '2026-10-09');
    assert.equal(addDaysIso(60, new Date(2026, 9, 9, 23, 59)), '2026-12-08');
  });

  test('TC-UI-03 a shortcut date passes the existing settlement validation', () => {
    const data = createInitialFormData();
    data.property.settlementDate = addDaysIso(90);
    assert.equal(validateProperty(data)['property.settlementDate'], undefined);
  });
});

describe('Currency field', () => {
  test('TC-UI-04 typed amounts are stored as plain numbers, never as formatted text', () => {
    assert.equal(cleanMoneyInput('$650,000'), '650000');
    assert.equal(cleanMoneyInput('650,000.509'), '650000.50');
    assert.equal(cleanMoneyInput('1.2.3'), '1.23');
    assert.equal(cleanMoneyInput('abc'), '');
  });

  test('TC-UI-05 display adds thousands separators; empty and zero stay different', () => {
    assert.equal(formatMoneyDisplay('650000'), '650,000');
    assert.equal(formatMoneyDisplay('1250000.5'), '1,250,000.5');
    assert.equal(formatMoneyDisplay(''), '');
    assert.equal(formatMoneyDisplay('0'), '0');
  });

  test('TC-UI-06 the stored value still passes the existing price validation', () => {
    const data = createInitialFormData();
    data.role = 'Purchaser';
    data.property.purchasePrice = cleanMoneyInput('$650,000');
    assert.equal(validateProperty(data)['property.purchasePrice'], undefined);
  });
});

describe('Removing a person', () => {
  test('TC-UI-07 an untouched person can be removed without asking; any answer means confirm first', () => {
    assert.equal(partyHasAnswers(createParty('p2')), false, 'blank person (default country and code only)');
    assert.equal(partyHasAnswers({ ...createParty('p2'), firstName: 'Sam' }), true);
    assert.equal(partyHasAnswers({ ...createParty('p2'), dob: '1990-01-01' }), true);
    assert.equal(partyHasAnswers({ ...createParty('p2'), idDocuments: [{ id: 'd', kind: 'identity', fileName: 'id.pdf', mimeType: 'application/pdf', sizeBytes: 1, storagePath: 'x', uploadedAt: '' }] }), true);
  });
});
