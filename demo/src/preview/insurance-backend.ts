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

function appendEntry(entry: SubmissionLogEntry): void {
  submissionLog = [...submissionLog, entry];
  notify();
}

export const insuranceBackend = {
  async collectPersonalInfo(payload: PersonalInfoPayload): Promise<PersonalInfoResult> {
    await delay(700);
    const claimId = makeClaimId();
    appendEntry({
      step: 'personal-info',
      at: new Date(),
      claimId,
      summary: `${payload['full-name']} (DOB ${payload.birthday})`,
    });
    return { claimId, accepted: true };
  },

  async collectClaim(claimId: string, payload: ClaimPayload): Promise<ClaimResult> {
    await delay(800);
    const desc = payload['claim-description'];
    const preview = desc.length > 60 ? `${desc.slice(0, 60)}…` : desc;
    appendEntry({ step: 'claim', at: new Date(), claimId, summary: `"${preview}"` });
    return { accepted: true };
  },

  async collectBank(claimId: string, payload: BankPayload): Promise<BankResult> {
    await delay(700);
    appendEntry({
      step: 'bank',
      at: new Date(),
      claimId,
      summary: `IBAN ${maskIban(payload.iban)}`,
    });
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
