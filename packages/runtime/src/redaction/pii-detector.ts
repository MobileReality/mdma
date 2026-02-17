export type PiiType = 'email' | 'phone' | 'ssn' | 'credit_card' | 'name_like';

export interface PiiDetectionResult {
  field: string;
  detectedTypes: PiiType[];
  confidence: number;
  suggestion: string;
}

const PATTERNS: Array<{ type: PiiType; regex: RegExp; fieldHints: RegExp }> = [
  {
    type: 'email',
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    fieldHints: /email|e.?mail/i,
  },
  {
    type: 'phone',
    regex: /^[\d\s\-+()]{7,15}$/,
    fieldHints: /phone|tel|mobile|cell|fax/i,
  },
  {
    type: 'ssn',
    regex: /^\d{3}-?\d{2}-?\d{4}$/,
    fieldHints: /ssn|social.?security|national.?id|pesel/i,
  },
  {
    type: 'credit_card',
    regex: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
    fieldHints: /card|credit|cc.?num/i,
  },
  {
    type: 'name_like',
    regex: /^[A-Z][a-z]+ [A-Z][a-z]+$/,
    fieldHints: /name|first.?name|last.?name|full.?name|patient|customer/i,
  },
];

/** Detect potential PII in a field based on field name and/or value */
export function detectPii(fieldName: string, value: unknown): PiiDetectionResult | null {
  const detectedTypes: PiiType[] = [];
  let confidence = 0;
  const str = typeof value === 'string' ? value : '';

  for (const pattern of PATTERNS) {
    let score = 0;

    // Check field name
    if (pattern.fieldHints.test(fieldName)) {
      score += 0.6;
    }

    // Check value pattern
    if (str && pattern.regex.test(str)) {
      score += 0.4;
    }

    if (score > 0.3) {
      detectedTypes.push(pattern.type);
      confidence = Math.max(confidence, score);
    }
  }

  if (detectedTypes.length === 0) return null;

  return {
    field: fieldName,
    detectedTypes,
    confidence: Math.min(confidence, 1),
    suggestion: `Field "${fieldName}" may contain PII (${detectedTypes.join(', ')}). Consider adding sensitive: true.`,
  };
}

/** Scan all fields in a component's form fields for potential PII not marked sensitive */
export function auditSensitiveFields(
  fields: Array<{ name: string; sensitive?: boolean; defaultValue?: unknown }>,
): PiiDetectionResult[] {
  const results: PiiDetectionResult[] = [];
  for (const field of fields) {
    if (field.sensitive) continue; // Already marked
    const detection = detectPii(field.name, field.defaultValue);
    if (detection) {
      results.push(detection);
    }
  }
  return results;
}
