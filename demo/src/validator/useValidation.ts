import { useRef, useEffect, useState } from 'react';
import {
  validate,
  type ValidationResult,
  type ValidationRuleId,
  type ExpectedComponent,
} from '@mobile-reality/mdma-validator';
import {
  ALL_RULE_IDS,
  EXPECTED_COMPONENTS,
  FLOW_EXPECTED_COMPONENTS,
} from '../validator-prompts.js';
import type { ChatMsg } from '../chat/types.js';

function collectPriorComponentIds(messages: ChatMsg[], beforeId: number): string[] {
  const ids: string[] = [];
  for (const prev of messages) {
    if (prev.id >= beforeId) break;
    if (prev.role !== 'assistant' || !prev.content) continue;
    const idMatches = prev.content.matchAll(/```mdma[\s\S]*?```/g);
    for (const match of idMatches) {
      const idMatch = match[0].match(/id:\s*(\S+)/);
      if (idMatch) ids.push(idMatch[1]);
    }
  }
  return ids;
}

function resolveExpectedComponents(
  promptKey: string,
): Record<string, ExpectedComponent> | undefined {
  const staticComps = EXPECTED_COMPONENTS[promptKey];
  if (staticComps) return staticComps;

  const flowStepDefs = FLOW_EXPECTED_COMPONENTS[promptKey];
  if (flowStepDefs) return Object.assign({}, ...flowStepDefs);

  return undefined;
}

interface UseValidationOptions {
  messages: ChatMsg[];
  isGenerating: boolean;
  promptKey: string;
  variantRules: Set<string>;
  onFixApplied: (msgId: number, fixedOutput: string) => void;
}

export function useValidation({
  messages,
  isGenerating,
  promptKey,
  variantRules,
  onFixApplied,
}: UseValidationOptions) {
  const [results, setResults] = useState<Map<number, ValidationResult>>(new Map());
  const validatedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (isGenerating) return;
    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.content && !validatedRef.current.has(msg.id)) {
        validatedRef.current.add(msg.id);

        const priorComponentIds = collectPriorComponentIds(messages, msg.id);
        const excludeRules = ALL_RULE_IDS.filter((r) => !variantRules.has(r));
        const expectedComps = resolveExpectedComponents(promptKey);

        const result = validate(msg.content, {
          ...(priorComponentIds.length > 0 && { priorComponentIds }),
          ...(excludeRules.length > 0 && { exclude: excludeRules as ValidationRuleId[] }),
          ...(expectedComps && { expectedComponents: expectedComps }),
        });

        setResults((prev) => {
          const next = new Map(prev);
          next.set(msg.id, result);
          return next;
        });

        if (result.fixCount > 0 && result.output !== msg.content) {
          onFixApplied(msg.id, result.output);
        }
      }
    }
  }, [messages, isGenerating, variantRules, promptKey, onFixApplied]);

  const clear = () => {
    setResults(new Map());
    validatedRef.current = new Set();
  };

  const invalidate = (msgId: number) => {
    validatedRef.current.delete(msgId);
    setResults((prev) => {
      const next = new Map(prev);
      next.delete(msgId);
      return next;
    });
  };

  return { results, clear, invalidate };
}
