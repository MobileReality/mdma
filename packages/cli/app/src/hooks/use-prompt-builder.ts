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
  TriggerMode,
  DomainConfig,
} from '../../../src/prompts/types.js';

import type { ComponentType, ComponentConfig, DomainConfig } from '../../../src/prompts/types.js';

export interface BuilderState {
  domain: DomainConfig;
  components: ComponentConfig[];
  messages: ChatMessage[];
  generatedPrompt: string;
  isGenerating: boolean;
  error: string | null;
}

const DEFAULT_COMPONENTS: ComponentConfig[] = [
  { type: 'form', enabled: false, form: { fields: [] } },
  { type: 'button', enabled: false },
  { type: 'tasklist', enabled: false, tasklist: { items: [] } },
  { type: 'table', enabled: false, table: { columns: [] } },
  { type: 'callout', enabled: false },
  { type: 'approval-gate', enabled: false, approvalGate: { roles: [], requiredApprovers: 1, requireReason: false } },
  { type: 'webhook', enabled: false },
  { type: 'chart', enabled: false },
  { type: 'thinking', enabled: true },
];

export function usePromptBuilder(llmConfig: LlmConfig) {
  const [domain, setDomain] = useState<DomainConfig>({
    name: '',
    domain: '',
    description: '',
    businessRules: '',
    triggerMode: 'keyword',
    trigger: '',
  });

  const [components, setComponents] = useState<ComponentConfig[]>(
    DEFAULT_COMPONENTS.map((c) => ({ ...c })),
  );

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

      const configContext = serializeConfig(domain, components);

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
    [domain, components, messages, llmConfig],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setGeneratedPrompt('');
    setError(null);
  }, []);

  const toggleComponent = useCallback((type: ComponentType) => {
    setComponents((prev) =>
      prev.map((c) => (c.type === type ? { ...c, enabled: !c.enabled } : c)),
    );
  }, []);

  const updateComponent = useCallback((type: ComponentType, update: Partial<ComponentConfig>) => {
    setComponents((prev) =>
      prev.map((c) => (c.type === type ? { ...c, ...update } : c)),
    );
  }, []);

  return {
    domain,
    setDomain,
    components,
    setComponents,
    toggleComponent,
    updateComponent,
    messages,
    generatedPrompt,
    isGenerating,
    error,
    generate,
    stop,
    reset,
  };
}
