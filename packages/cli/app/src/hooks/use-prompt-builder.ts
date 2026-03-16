import { useState, useCallback, useRef } from 'react';
import { streamChatCompletion, chatCompletion } from '../lib/llm-client.js';
import type { LlmConfig, ChatMessage } from '../lib/llm-client.js';
import { MASTER_PROMPT } from './master-prompt.js';
import { serializeConfig } from '../../../src/prompts/serialize-config.js';

export type {
  ComponentType,
  FormFieldConfig,
  ApprovalConfig,
  TasklistConfig,
  TableConfig,
  ComponentConfig,
  StepTriggerMode,
  FlowStep,
  DomainConfig,
} from '../../../src/prompts/types.js';

import type { DomainConfig, FlowStep } from '../../../src/prompts/types.js';

export function usePromptBuilder(llmConfig: LlmConfig) {
  const [domain, setDomain] = useState<DomainConfig>({
    name: '',
    domain: '',
    description: '',
    businessRules: '',
    flowSteps: [
      {
        label: 'Step 1',
        triggerMode: 'immediate',
        trigger: '',
        components: [],
        description: '',
      },
    ],
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (userMessage?: string) => {
      setError(null);
      setIsGenerating(true);
      abortRef.current = new AbortController();

      const configContext = serializeConfig(domain);

      const newMessages: ChatMessage[] = [
        ...messages,
        {
          role: 'user' as const,
          content: userMessage
            ? `${userMessage}\n\n${configContext}`
            : `Generate a custom prompt based on this configuration:\n\n${configContext}`,
        },
      ];

      setMessages(newMessages);

      const fullMessages: ChatMessage[] = [
        { role: 'system', content: MASTER_PROMPT },
        ...newMessages,
      ];

      try {
        let result = '';
        try {
          for await (const chunk of streamChatCompletion(
            llmConfig,
            fullMessages,
            abortRef.current.signal,
          )) {
            result += chunk;
            setGeneratedPrompt(result);
          }
        } catch {
          // Fallback to non-streaming
          result = await chatCompletion(llmConfig, fullMessages, abortRef.current.signal);
          setGeneratedPrompt(result);
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: result }]);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [domain, messages, llmConfig],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setGeneratedPrompt('');
    setError(null);
  }, []);

  const updateFlowSteps = useCallback((flowSteps: FlowStep[]) => {
    setDomain((prev) => ({ ...prev, flowSteps }));
  }, []);

  return {
    domain,
    setDomain,
    updateFlowSteps,
    messages,
    generatedPrompt,
    isGenerating,
    error,
    generate,
    stop,
    reset,
  };
}
