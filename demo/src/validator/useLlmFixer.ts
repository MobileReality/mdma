import { useRef, useEffect, useState, useCallback } from 'react';
import type { ValidationResult } from '@mobile-reality/mdma-validator';
import {
  buildFixerPrompt,
  buildFixerMessage,
  buildSystemPrompt,
} from '@mobile-reality/mdma-prompt-pack';
import { chatCompletion } from '../llm-client.js';
import { FIXER_FLOW_RULES, FIXER_CORRECT_STRUCTURE } from '../validator-prompts.js';
import type { ChatMsg } from '../chat/types.js';
import type { LlmConfig } from '../llm-client.js';

interface UseLlmFixerOptions {
  messages: ChatMsg[];
  config: LlmConfig;
  promptKey: string;
  validationResults: Map<number, ValidationResult>;
  isGenerating: boolean;
  onFixed: (msgId: number, content: string) => void;
  onInvalidate: (msgId: number) => void;
}

export function useLlmFixer({
  messages,
  config,
  promptKey,
  validationResults,
  isGenerating,
  onFixed,
  onInvalidate,
}: UseLlmFixerOptions) {
  const [fixerModel, setFixerModel] = useState(
    () => localStorage.getItem('mdma-fixer-model') || '',
  );
  const [customFixerModel, setCustomFixerModel] = useState(
    () => localStorage.getItem('mdma-fixer-custom-model') || '',
  );
  const [autoFixWithLlm, setAutoFixWithLlm] = useState(
    () => localStorage.getItem('mdma-auto-fix-llm') !== 'false',
  );

  const [fixingMsgId, setFixingMsgId] = useState<number | null>(null);
  const isFixing = fixingMsgId !== null;
  const fixAbortRef = useRef<AbortController | null>(null);

  const handleRequestFix = useCallback(
    async (msgId: number) => {
      const result = validationResults.get(msgId);
      const msg = messages.find((m) => m.id === msgId);
      if (!result || !msg || isFixing) return;

      const unfixed = result.issues.filter(
        (i) => !i.fixed && (i.severity === 'error' || i.severity === 'warning'),
      );
      if (unfixed.length === 0) return;

      setFixingMsgId(msgId);
      fixAbortRef.current = new AbortController();

      try {
        const systemPrompt = `${buildSystemPrompt()}\n\n---\n\n${buildFixerPrompt(promptKey)}`;

        const history = messages
          .filter((m) => m.id < msgId)
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        const userMessage = buildFixerMessage(result.output, unfixed, {
          conversationHistory: history.length > 0 ? history : undefined,
          promptContext:
            FIXER_FLOW_RULES[promptKey] ?? FIXER_CORRECT_STRUCTURE[promptKey] ?? undefined,
        });

        const resolvedModel = fixerModel === '__custom__' ? customFixerModel : fixerModel;
        const fixerConfig = resolvedModel ? { ...config, model: resolvedModel } : config;

        const fixedContent = await chatCompletion(
          fixerConfig,
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          fixAbortRef.current.signal,
        );

        if (fixedContent) {
          onFixed(msg.id, fixedContent);
          onInvalidate(msg.id);
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('Fixer error:', err);
        }
      } finally {
        setFixingMsgId(null);
        fixAbortRef.current = null;
      }
    },
    [validationResults, messages, config, isFixing, fixerModel, customFixerModel, promptKey, onFixed, onInvalidate],
  );

  // Auto-fix with LLM when enabled and unfixed issues detected
  const autoFixTriggeredRef = useRef<Set<number>>(new Set());
  const autoFixQueueRef = useRef<number | null>(null);

  useEffect(() => {
    if (!autoFixWithLlm || isFixing || isGenerating) return;
    for (const [msgId, result] of validationResults) {
      if (autoFixTriggeredRef.current.has(msgId)) continue;
      const unfixed = result.issues.filter(
        (i) => !i.fixed && (i.severity === 'error' || i.severity === 'warning'),
      );
      if (unfixed.length > 0) {
        autoFixTriggeredRef.current.add(msgId);
        autoFixQueueRef.current = msgId;
        break;
      }
    }
  }, [validationResults, autoFixWithLlm, isFixing, isGenerating]);

  useEffect(() => {
    if (autoFixQueueRef.current === null || isFixing || isGenerating) return;
    const msgId = autoFixQueueRef.current;
    autoFixQueueRef.current = null;
    handleRequestFix(msgId);
  }, [isFixing, isGenerating, handleRequestFix]);

  const updateFixerModel = (model: string) => {
    setFixerModel(model);
    localStorage.setItem('mdma-fixer-model', model);
  };

  const updateCustomFixerModel = (model: string) => {
    setCustomFixerModel(model);
    localStorage.setItem('mdma-fixer-custom-model', model);
  };

  const updateAutoFix = (enabled: boolean) => {
    setAutoFixWithLlm(enabled);
    localStorage.setItem('mdma-auto-fix-llm', String(enabled));
  };

  return {
    fixerModel,
    customFixerModel,
    autoFixWithLlm,
    fixingMsgId,
    isFixing,
    handleRequestFix,
    updateFixerModel,
    updateCustomFixerModel,
    updateAutoFix,
  };
}
