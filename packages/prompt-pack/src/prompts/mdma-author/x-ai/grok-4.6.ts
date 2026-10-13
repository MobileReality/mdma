/**
 * MDMA Author Prompt — xAI Grok 4.6 variant.
 *
 * Baseline: the same composition as `./grok-4.5.ts`, carried over unchanged
 * because no xAI Grok 4.6-specific failure mode has been observed yet. Diverge THIS
 * file (add or drop framing blocks) only once an eval run shows a pattern
 * specific to this model; keep sibling variants independent.
 *
 * Routing: substring match on `grok-4.6` (normalized `grok-4-6`).
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import { SCOPE_DISCIPLINE_BLOCK, SELECT_OPTIONS_BLOCK } from './_shared.js';

export const MDMA_AUTHOR_PROMPT_GROK_4_6 = `${BASE_OPENING}

${BASE_BODY}

${SCOPE_DISCIPLINE_BLOCK}

${SELECT_OPTIONS_BLOCK}

${BASE_CHECKLIST}
`;
