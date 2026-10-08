/**
 * Re-test of the LiveSign problems reported on 29–30 Sep 2026:
 *  - "LiveSign rejected the request (400). Invalid PartnerId provided"
 *  - "Person 1: mobile number "1351685136565" is not valid for LiveSign."
 * Runs against the fake LiveSign from tests/helpers/preload.ts (nothing reaches the real one).
 */
import { fakeLiveSign, TEST_EMAILS, validParty, validPurchaserForm } from '../helpers/setup.js';
import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'net';
import type { Server } from 'http';
import { randomUUID } from 'crypto';
import { app } from '../../server/app.js';
import { emailOutbox } from '../../server/emailService.js';
import { buildEnvelopePayload, validateEnvelopePayload, ZERO_GUID } from '../../server/livesign/payload.js';
import { handleLiveSignWebhook, resetPartnerIdDiscovery, sendIntakeToLiveSign } from '../../server/livesign/service.js';
import { liveSignConfig, toLiveSignTimeZone } from '../../server/livesign/config.js';
import { listIntakesNeedingWork, startVerification, updateIntake } from '../../server/verificationStore.js';
import { validatePartyDetails } from '../../src/utils/validation.js';

const GOOD_PARTNER_ID = '11111111-2222-3333-4444-555555555555';
const codes = [{ id: 13, phoneCode: '+61' }, { id: 99, phoneCode: '+91' }];

let server: Server;
let base = '';
let warnings: string[] = [];
const realWarn = console.warn;
const realLog = console.log;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

beforeEach(() => {
  emailOutbox.length = 0;
  fakeLiveSign.reset();
  warnings = [];
  console.warn = (...args: any[]) => { warnings.push(args.join(" ")); };
  console.log = () => {}; // app progress logs are not needed here
});
afterEach(() => {
  console.warn = realWarn;
  console.log = realLog;
  process.env.LIVESIGN_PARTNER_ID = GOOD_PARTNER_ID;
});

async function submit(form = validPurchaserForm()) {
  const res = await fetch(`${base}/api/intake`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ formData: form })
  });
  return { status: res.status, body: await res.json() as any };
}

/** A form record as the background worker would see it (kept in the in-memory store). */
async function localIntake(form = validPurchaserForm()) {
  const { intake } = await startVerification({
    id: `local_${randomUUID()}`, matter_reference: `RK-2026-${Math.floor(1000 + Math.random() * 8999)}`,
    role: form.role, parties: form.parties, property: form.property, finance: form.finance
  });
  return intake;
}

const firmSubjects = () => emailOutbox.filter(e => e.to === TEST_EMAILS.firm).map(e => e.subject);

describe('Issue 1 — Invalid PartnerId (30 Sep 2026; Partner ID is required per the LiveSign API guide)', () => {
  test('TC-PID-01 the pre-send check now catches a missing / all-zero partner ID', () => {
    const f = validPurchaserForm();
    const payload: any = buildEnvelopePayload(
      { matterReference: 'RK-2026-1000', role: f.role, parties: f.parties, property: f.property, finance: f.finance },
      { partnerId: '', productPackageType: 'AMLWithVoi', voiProductId: 1, timeZone: 'Cen. Australia Standard Time', countryCodes: codes });
    assert.equal(payload.envelope.partnerId, ZERO_GUID);
    assert.ok(validateEnvelopePayload(payload).some(p => /Partner ID is missing/.test(p)), 'missing partner ID is reported');
  });

  test('TC-PID-02 LIVESIGN_PARTNER_ID empty (no earlier envelopes): nothing is sent to LiveSign, the form waits', async () => {
    process.env.LIVESIGN_PARTNER_ID = '';
    resetPartnerIdDiscovery();
    const { status, body } = await submit();
    assert.equal(status, 200, 'the client still gets their confirmation');
    assert.equal(body.sentToLiveSign, false);
    assert.equal(fakeLiveSign.expressCount(), 0, 'no doomed request is sent to LiveSign');
    assert.ok(warnings.some(w => w.includes('LIVESIGN_PARTNER_ID is not set')), 'clear reason logged / saved');
    assert.ok(firmSubjects().some(s => s.includes('LiveSign pending')), 'firm is told it is waiting');
    const waiting = (await listIntakesNeedingWork()).find(i => i.matter_reference === body.matterReference);
    assert.equal(waiting?.livesign_status, 'pending_send', 'kept for automatic sending once the ID is set');
    assert.equal(waiting?.livesign_attempts, 0, 'not counted as a failed attempt');
  });

  test('TC-PID-03 a partner ID that is not a GUID (typo) is ignored: the form waits instead of failing', async () => {
    process.env.LIVESIGN_PARTNER_ID = '1111-2222-typo';
    resetPartnerIdDiscovery();
    const { body } = await submit();
    assert.equal(body.sentToLiveSign, false);
    assert.equal(fakeLiveSign.expressCount(), 0);
    assert.ok(warnings.some(w => w.includes('LIVESIGN_PARTNER_ID is not set')));
  });

  test('TC-PID-04 with the correct LIVESIGN_PARTNER_ID set, the form is sent', async () => {
    process.env.LIVESIGN_PARTNER_ID = GOOD_PARTNER_ID;
    const { body } = await submit();
    assert.equal(body.sentToLiveSign, true);
    assert.equal(fakeLiveSign.lastPayload.envelope.partnerId, GOOD_PARTNER_ID);
  });

  test('TC-PID-05 a waiting form is sent automatically once the partner ID is set: exactly one envelope, everyone emailed', async () => {
    process.env.LIVESIGN_PARTNER_ID = '';
    resetPartnerIdDiscovery();
    const intake = await localIntake();
    assert.equal(await sendIntakeToLiveSign(intake), 'pending');

    // The fix: set the partner ID (no manual reset of the form needed)
    process.env.LIVESIGN_PARTNER_ID = GOOD_PARTNER_ID;
    const queued = (await listIntakesNeedingWork()).find(i => i.id === intake.id)!;
    assert.equal(queued.livesign_status, 'pending_send', 'the background worker picks it up');

    emailOutbox.length = 0;
    const createdBefore = fakeLiveSign.envelopes.size;
    assert.equal(await sendIntakeToLiveSign(queued), 'sent');
    assert.equal(fakeLiveSign.envelopes.size, createdBefore + 1, 'exactly one envelope');
    assert.ok(emailOutbox.some(e => e.to === TEST_EMAILS.purchaser1 && e.subject.includes('sent to LiveSign')));
    assert.ok(emailOutbox.some(e => e.to === TEST_EMAILS.purchaser2 && e.subject.includes('sent to LiveSign')));
  });

  test('TC-PID-06 partner ID left empty but the account already has an envelope: ID is discovered and used', async () => {
    const existing = randomUUID();
    fakeLiveSign.envelopes.set(existing, {
      id: existing, status: 'Completed', partnerReference: 'OLD-1', partnerId: GOOD_PARTNER_ID,
      aml: { status: 'Completed', riskRating: 'Low' }, customers: []
    });
    process.env.LIVESIGN_PARTNER_ID = '';
    resetPartnerIdDiscovery();
    const { body } = await submit();
    assert.equal(body.sentToLiveSign, true);
    assert.equal(fakeLiveSign.lastPayload.envelope.partnerId, GOOD_PARTNER_ID);
  });
});

describe('Issue 2 — mobile number not valid for LiveSign (29 Sep 2026)', () => {
  test('TC-MOB-01 the 29 Sep number 1351685136565 (+61) is now rejected on the form', () => {
    const errors = validatePartyDetails(validParty({ mobile: '1351685136565', phoneCountryCode: '+61' } as any));
    assert.ok(errors.mobile, 'form shows a phone error');
  });

  test('TC-MOB-02 the server also refuses it, so it never reaches LiveSign', async () => {
    const form = validPurchaserForm();
    form.parties[0].mobile = '1351685136565';
    const { status, body } = await submit(form);
    const outcome = `HTTP ${status}, sentToLiveSign=${body?.sentToLiveSign}, LiveSign calls=${fakeLiveSign.expressCount()}`;
    assert.ok(status === 400 && fakeLiveSign.expressCount() === 0, `server accepted the number instead of refusing it (${outcome})`);
  });

  test('TC-MOB-03 gap: a 13-digit number with a country not in the phone rules passes the form but LiveSign would refuse it', async () => {
    const party = validParty({ mobile: '1351685136565', phoneCountryCode: '+27' } as any);
    assert.equal(validatePartyDetails(party).mobile, undefined, 'form accepts 7–15 digits for unlisted countries');
    const payload: any = buildEnvelopePayload(
      { matterReference: 'RK-2026-1001', role: 'Purchaser', parties: [party], property: {}, finance: {} },
      { partnerId: GOOD_PARTNER_ID, productPackageType: 'AMLWithVoi', voiProductId: 1, timeZone: 'Australia/Adelaide', countryCodes: codes });
    assert.ok(validateEnvelopePayload(payload).some(p => /mobile number/.test(p)), 'caught by the pre-send check → send_error');
  });

  test('TC-MOB-04 valid Australian and Indian numbers are formatted the way LiveSign accepts', () => {
    const form = validPurchaserForm();
    const payload: any = buildEnvelopePayload(
      { matterReference: 'RK-2026-1002', role: form.role, parties: form.parties, property: form.property, finance: form.finance },
      { partnerId: GOOD_PARTNER_ID, productPackageType: 'AMLWithVoi', voiProductId: 1, timeZone: 'Australia/Adelaide', countryCodes: codes });
    assert.deepEqual(payload.customers.map((c: any) => [c.countryCodeId, c.mobileNumber]), [[13, '412345678'], [99, '9876543210']]);
    assert.deepEqual(validateEnvelopePayload(payload), []);
  });
});

describe('LiveSign API guide (Oct 2026): required data and behaviour', () => {
  // Values returned by GET /api/Utilities/supported-timezones on the production API (Oct 2026)
  const LIVESIGN_AU_TIME_ZONES = ['W. Australia Standard Time', 'Aus Central W. Standard Time', 'Cen. Australia Standard Time',
    'AUS Central Standard Time', 'E. Australia Standard Time', 'AUS Eastern Standard Time', 'Tasmania Standard Time'];

  test('TC-TZ-01 the envelope time zone is a LiveSign-supported value (Adelaide by default)', () => {
    assert.equal(liveSignConfig.timeZone, 'Cen. Australia Standard Time');
    assert.ok(LIVESIGN_AU_TIME_ZONES.includes(liveSignConfig.timeZone));
  });

  test('TC-TZ-02 city-style names in .env are translated to LiveSign names', () => {
    assert.equal(toLiveSignTimeZone('Australia/Adelaide'), 'Cen. Australia Standard Time');
    assert.equal(toLiveSignTimeZone('Australia/Sydney'), 'AUS Eastern Standard Time');
    assert.equal(toLiveSignTimeZone('Australia/Brisbane'), 'E. Australia Standard Time');
    assert.equal(toLiveSignTimeZone('Australia/Perth'), 'W. Australia Standard Time');
    assert.equal(toLiveSignTimeZone('AUS Eastern Standard Time'), 'AUS Eastern Standard Time', 'already-valid names are kept');
  });

  test('TC-API-DOC-01 a real submission sends every field the guide requires: partnerId, AccountHolderPays, AML (property + transaction type), customer details', async () => {
    process.env.LIVESIGN_PARTNER_ID = GOOD_PARTNER_ID;
    const { body } = await submit();
    assert.equal(body.sentToLiveSign, true);
    const { envelope, customers } = fakeLiveSign.lastPayload;
    assert.equal(envelope.partnerId, GOOD_PARTNER_ID);
    assert.equal(envelope.payMethod, 'AccountHolderPays', 'the firm pays on behalf of its clients');
    assert.equal(envelope.notificationType, 'Email');
    assert.equal(envelope.timeZone, 'Cen. Australia Standard Time');
    assert.equal(envelope.hasAml, true);
    assert.equal(envelope.aml.transactionType, 'Purchase');
    assert.ok(Array.isArray(envelope.aml.properties) && envelope.aml.properties[0].includes('King William Street'), 'property address');
    for (const k of ['otherFundingMeansOfPayment', 'physicalCurrencyAmount', 'virtualAssetsAmount']) assert.ok(k in envelope.aml, `${k} (required by the schema)`);
    for (const c of customers) {
      for (const k of ['firstName', 'lastName', 'emailAddress', 'countryCodeId', 'mobileNumber', 'address', 'organisationName']) {
        assert.ok(c[k] !== undefined && c[k] !== '', `customer.${k}`);
      }
    }
  });

  test('TC-WH-02 a webhook reporting invalid contact details alerts the firm and still re-reads the envelope', async () => {
    process.env.LIVESIGN_PARTNER_ID = GOOD_PARTNER_ID;
    const { body } = await submit();
    const env = [...fakeLiveSign.envelopes.values()].find(e => e.partnerReference === body.matterReference)!;
    emailOutbox.length = 0;
    const getsBefore = fakeLiveSign.calls.filter(c => c === `GET /api/Envelopes/${env.id}`).length;
    const result = await handleLiveSignWebhook({
      envelopeId: env.id, status: 'SentToClient', eventType: 'InvalidContactDetails',
      invalidContactDetails: { emailAddress: TEST_EMAILS.purchaser2, reason: 'Email bounced' }
    }, {});
    assert.equal(result.matched, true);
    assert.equal(result.eventType, 'InvalidContactDetails');
    assert.ok(firmSubjects().some(s => s.startsWith('Invalid contact details for LiveSign') && s.includes(body.matterReference)));
    assert.equal(fakeLiveSign.calls.filter(c => c === `GET /api/Envelopes/${env.id}`).length, getsBefore + 1, 'envelope re-read from the API');
  });
});
