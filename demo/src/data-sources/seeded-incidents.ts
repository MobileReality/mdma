export interface Incident {
  id: string;
  title: string;
  service: string;
  severity: string;
  status: string;
  opened_at: string;
}

const INCIDENT_KEYS: readonly (keyof Incident)[] = [
  'id',
  'title',
  'service',
  'severity',
  'status',
  'opened_at',
];

export function isIncidentKey(key: string): key is keyof Incident {
  return (INCIDENT_KEYS as readonly string[]).includes(key);
}

export const SERVICES = ['auth', 'billing', 'checkout', 'notifications', 'search'] as const;
export const STATUSES = ['open', 'resolved'] as const;

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const TITLES = [
  'Elevated error rate',
  'Slow responses',
  'Queue backlog growing',
  'Failed health check',
  'Certificate nearing expiry',
  'Unexpected 5xx spike',
];

const INCIDENT_COUNT = 10_000;
const SEED = 42;
const FIRST_OPENED_AT = Date.UTC(2026, 0, 1);
const HOUR_MS = 3_600_000;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildIncidents(count: number): Incident[] {
  const rand = mulberry32(SEED);
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)] as T;
  return Array.from({ length: count }, (_, i) => ({
    id: `INC-${String(i + 1).padStart(5, '0')}`,
    title: pick(TITLES),
    service: pick(SERVICES),
    severity: pick(SEVERITIES),
    status: pick(STATUSES),
    opened_at: new Date(FIRST_OPENED_AT + i * HOUR_MS).toISOString().slice(0, 16).replace('T', ' '),
  }));
}

export const INCIDENTS: readonly Incident[] = buildIncidents(INCIDENT_COUNT);
