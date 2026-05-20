/**
 * Mock backend for the Insurance Preview demo. Each function pretends to be
 * an endpoint of the insurance provider's API: validates a tiny shape,
 * waits a few hundred ms, and resolves with a fake server response. No
 * data leaves the browser — values land in the in-memory `submissionLog`,
 * which the optional debug pane on the right column displays.
 */

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function maskIban(iban: string): string {
  const trimmed = iban.replace(/\s+/g, '');
  if (trimmed.length <= 8) return '••••';
  return `${trimmed.slice(0, 4)} •••• ${trimmed.slice(-4)}`;
}

export interface SubmissionLogEntry {
  step: 'personal-info' | 'claim' | 'bank';
  at: Date;
  claimId: string;
  /** Display-only summary (sensitive values masked). Never raw user data. */
  summary: string;
}

let submissionLog: SubmissionLogEntry[] = [];
const listeners = new Set<() => void>();
function notify() {
  for (const fn of listeners) fn();
}

export function subscribeSubmissionLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface PersonalInfoPayload {
  'full-name': string;
  birthday: string;
}

export interface ClaimPayload {
  'claim-description': string;
}

export interface BankPayload {
  iban: string;
}

export interface PersonalInfoResult {
  claimId: string;
  accepted: true;
}

export interface ClaimResult {
  accepted: true;
}

export interface BankResult {
  accepted: true;
  etaDays: number;
}

function makeClaimId(): string {
  return `clm_${Math.random().toString(36).slice(2, 8)}`;
}

export const insuranceBackend = {
  async collectPersonalInfo(payload: PersonalInfoPayload): Promise<PersonalInfoResult> {
    await delay(700);
    const claimId = makeClaimId();
    submissionLog = [
      ...submissionLog,
      {
        step: 'personal-info',
        at: new Date(),
        claimId,
        summary: `${payload['full-name']} (DOB ${payload.birthday})`,
      },
    ];
    notify();
    return { claimId, accepted: true };
  },

  async collectClaim(claimId: string, payload: ClaimPayload): Promise<ClaimResult> {
    await delay(800);
    const desc = payload['claim-description'];
    const preview = desc.length > 60 ? `${desc.slice(0, 60)}…` : desc;
    submissionLog = [
      ...submissionLog,
      {
        step: 'claim',
        at: new Date(),
        claimId,
        summary: `"${preview}"`,
      },
    ];
    notify();
    return { accepted: true };
  },

  async collectBank(claimId: string, payload: BankPayload): Promise<BankResult> {
    await delay(700);
    submissionLog = [
      ...submissionLog,
      {
        step: 'bank',
        at: new Date(),
        claimId,
        summary: `IBAN ${maskIban(payload.iban)}`,
      },
    ];
    notify();
    return { accepted: true, etaDays: 5 };
  },
};

export function getSubmissionLog(): readonly SubmissionLogEntry[] {
  return submissionLog;
}

export function clearSubmissionLog(): void {
  submissionLog = [];
  notify();
}
