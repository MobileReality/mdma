// OUTDATED: This file was part of an experiment with a step-by-step form generation flow. It is no longer actively maintained and may contain outdated code. Use for reference only.


import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useChat } from './chat/use-chat.js';
import { ChatSettings } from './chat/ChatSettings.js';
import { ChatMessage } from './chat/ChatMessage.js';
import { ChatInput } from './chat/ChatInput.js';
import { validate, type ValidationResult, type ValidationIssue } from '@mobile-reality/mdma-validator';
import { customizations } from './custom-components.js';

const STEPPER_PROMPT = `You are an AI assistant that generates a multi-step onboarding flow using MDMA components.

The user will ask you to generate one step at a time. Each step is a separate message. Generate ONLY the requested step — do not generate other steps in the same message.

IMPORTANT: Always start your response with a thinking block. Use this exact format:

\`\`\`mdma
type: thinking
id: thinking
status: done
collapsed: true
content: <1-2 sentences explaining the step>
\`\`\`

Do NOT put --- inside any mdma block. Do NOT use YAML document separators.

## Step 1: Personal Information
When asked to generate Step 1, produce:
- The thinking block (as above, content: "Generating Step 1 — personal information form with name, email, phone, and date of birth fields.")
- A heading "## Step 1: Personal Information"
- A callout (info, id: step-1-info, content: "Please provide your basic personal details to get started.")
- Form ID: personal-info
- Fields:
  - first_name (text, required, label: "First Name")
  - last_name (text, required, label: "Last Name")
  - email (email, required, label: "Email Address", sensitive: true)
  - phone (text, label: "Phone Number", sensitive: true)
  - date_of_birth (date, label: "Date of Birth")
- onSubmit: step-1-complete
- A callout (success, id: step-1-complete, content: "Step 1 complete! Proceed to shipping address.")

## Step 2: Shipping Address
When asked to generate Step 2, produce:
- The thinking block (content: "Generating Step 2 — shipping address form with street, city, state, zip, and country fields.")
- A heading "## Step 2: Shipping Address"
- A callout (info, id: step-2-info, content: "Enter your shipping address for delivery.")
- Form ID: shipping-address
- Fields:
  - street (text, required, label: "Street Address", sensitive: true)
  - city (text, required, label: "City")
  - state (select, required, label: "State", options: NY, CA, TX, FL, IL, WA, MA)
  - zip_code (text, required, label: "ZIP Code", sensitive: true)
  - country (select, label: "Country", defaultValue: "US", options: US, CA, UK, DE, FR)
- onSubmit: step-2-complete
- A callout (success, id: step-2-complete, content: "Step 2 complete! Proceed to payment.")

## Step 3: Payment & Review
When asked to generate Step 3, produce:
- The thinking block (content: "Generating Step 3 — payment form with card details, order summary table with bindings, and approval gate.")
- A heading "## Step 3: Payment & Review"
- A callout (info, id: step-3-info, content: "Enter your payment details and review your order.")
- Form ID: payment-review
- Fields:
  - card_number (text, required, label: "Card Number", sensitive: true)
  - expiry (text, required, label: "Expiry (MM/YY)", sensitive: true)
  - cvv (text, required, label: "CVV", sensitive: true)
  - billing_same (checkbox, label: "Billing same as shipping", defaultValue: true)
- onSubmit: submit-order
- A summary table (id: order-summary) with columns: Field, Value showing:
  - Name: "{{personal-info.first_name}} {{personal-info.last_name}}"
  - Email: "{{personal-info.email}}"
  - Ship To: "{{shipping-address.street}}, {{shipping-address.city}}"
- An approval-gate (id: submit-order, title: "Confirm Order", description: "Review your order details above and confirm to place your order.")

RULES:
- All IDs must be kebab-case
- All PII fields (email, phone, street, zip_code, card_number, expiry, cvv) must have sensitive: true
- All bindings use double-brace syntax: {{component.field}}
- Every callout MUST have a non-empty content field
- Do NOT use --- (YAML document separators) inside mdma blocks`;

const STEP_PROMPTS = [
  'Generate Step 1: Personal Information form.',
  'Generate Step 2: Shipping Address form.',
  'Generate Step 3: Payment & Review form with summary table and approval gate.',
];

const STEP_LABELS = [
  'Personal Info',
  'Shipping Address',
  'Payment & Review',
];

function severityClass(severity: string): string {
  if (severity === 'error') return 'validator-severity--error';
  if (severity === 'warning') return 'validator-severity--warning';
  return 'validator-severity--info';
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  return (
    <div className={`validator-issue ${issue.fixed ? 'validator-issue--fixed' : ''}`}>
      <span className={`validator-severity ${severityClass(issue.severity)}`}>
        {issue.severity}
      </span>
      <span className="validator-issue-rule">{issue.ruleId}</span>
      {issue.componentId && (
        <span className="validator-issue-component">#{issue.componentId}</span>
      )}
      <span className="validator-issue-msg">{issue.message}</span>
      {issue.fixed && <span className="validator-issue-badge">fixed</span>}
    </div>
  );
}

function ValidationPanel({
  results,
  stepLabels,
}: {
  results: Map<number, ValidationResult>;
  stepLabels: Map<number, string>;
}) {
  const entries = useMemo(
    () => Array.from(results.entries()).reverse(),
    [results],
  );

  if (entries.length === 0) {
    return (
      <div className="validator-results-panel">
        <div className="validator-empty">
          Validation results will appear here as each step is generated.
        </div>
      </div>
    );
  }

  return (
    <div className="validator-results-panel">
      {entries.map(([msgId, result]) => (
        <div key={msgId} className="validator-msg-result">
          <div className={`validator-summary ${result.ok ? 'validator-summary--ok' : 'validator-summary--fail'}`}>
            <span className="validator-summary-status">
              {result.ok ? 'PASS' : 'FAIL'}
            </span>
            <span className="validator-summary-label">
              {stepLabels.get(msgId) ?? `msg #${msgId}`}
            </span>
            <span className="validator-summary-counts">
              {result.summary.errors > 0 && (
                <span className="validator-severity validator-severity--error">
                  {result.summary.errors} error{result.summary.errors > 1 ? 's' : ''}
                </span>
              )}
              {result.summary.warnings > 0 && (
                <span className="validator-severity validator-severity--warning">
                  {result.summary.warnings} warning{result.summary.warnings > 1 ? 's' : ''}
                </span>
              )}
              {result.summary.infos > 0 && (
                <span className="validator-severity validator-severity--info">
                  {result.summary.infos} info{result.summary.infos > 1 ? 's' : ''}
                </span>
              )}
              {result.fixCount > 0 && (
                <span className="validator-fix-count">
                  {result.fixCount} auto-fixed
                </span>
              )}
            </span>
          </div>

          {result.issues.length > 0 && (
            <div className="validator-issues">
              <h3>Issues ({result.issues.length})</h3>
              <div className="validator-issues-list">
                {result.issues.map((issue, i) => (
                  <IssueRow key={i} issue={issue} />
                ))}
              </div>
            </div>
          )}

          {result.fixCount > 0 && (
            <div className="validator-output">
              <details>
                <summary className="validator-output-toggle">View fixed output</summary>
                <pre className="validator-output-pre">{result.output}</pre>
              </details>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function StepperView() {
  const {
    config,
    messages,
    input,
    setInput,
    isGenerating,
    error,
    inputRef,
    updateConfig,
    applyPreset,
    send,
    stop,
    clear,
    updateMessage,
  } = useChat({
    systemPrompt: STEPPER_PROMPT,
    storageKey: 'stepper',
    ...(customizations.schemas && { parserOptions: { customSchemas: customizations.schemas } }),
  });

  const [validationResults, setValidationResults] = useState<Map<number, ValidationResult>>(new Map());
  const [stepLabelMap, setStepLabelMap] = useState<Map<number, string>>(new Map());
  const validatedRef = useRef<Set<number>>(new Set());

  // Determine current step based on how many assistant messages exist
  const assistantCount = messages.filter((m) => m.role === 'assistant').length;
  const currentStep = Math.min(assistantCount, 3); // 0, 1, 2, or 3 (done)

  // Auto-validate completed assistant messages and apply fixes
  useEffect(() => {
    if (isGenerating) return;
    let stepIdx = 0;
    for (const msg of messages) {
      if (msg.role === 'assistant') {
        stepIdx++;
        if (msg.content && !validatedRef.current.has(msg.id)) {
          validatedRef.current.add(msg.id);
          const result = validate(msg.content);
          const label = `Step ${stepIdx}: ${STEP_LABELS[stepIdx - 1] ?? 'Unknown'}`;

          setValidationResults((prev) => {
            const next = new Map(prev);
            next.set(msg.id, result);
            return next;
          });

          setStepLabelMap((prev) => {
            const next = new Map(prev);
            next.set(msg.id, label);
            return next;
          });

          if (result.fixCount > 0 && result.output !== msg.content) {
            updateMessage(msg.id, result.output);
          }
        }
      }
    }
  }, [messages, isGenerating, updateMessage]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  const handleClear = useCallback(() => {
    clear();
    setValidationResults(new Map());
    setStepLabelMap(new Map());
    validatedRef.current = new Set();
  }, [clear]);

  // Send the next step prompt
  const pendingSendRef = useRef(false);
  const pendingPromptRef = useRef('');

  useEffect(() => {
    if (pendingSendRef.current && input === pendingPromptRef.current && !isGenerating) {
      pendingSendRef.current = false;
      pendingPromptRef.current = '';
      send();
    }
  }, [input, isGenerating, send]);

  const handleNextStep = useCallback(() => {
    if (isGenerating || currentStep >= 3) return;
    const prompt = STEP_PROMPTS[currentStep];
    setInput(prompt);
    pendingSendRef.current = true;
    pendingPromptRef.current = prompt;
  }, [isGenerating, currentStep, setInput]);

  const lastMsgId = messages[messages.length - 1]?.id;

  return (
    <div className="validator-wrapper">
      <div className="stepper-info">
        <strong>Stepper Forms</strong>
        <div className="stepper-progress">
          {STEP_LABELS.map((label, i) => (
            <span
              key={i}
              className={`stepper-step ${i < currentStep ? 'stepper-step--done' : ''} ${i === currentStep && isGenerating ? 'stepper-step--active' : ''}`}
            >
              <span className="stepper-step-num">{i + 1}</span>
              {label}
            </span>
          ))}
        </div>
        {!isGenerating && currentStep < 3 && (
          <button
            type="button"
            className="stepper-generate-btn"
            onClick={handleNextStep}
          >
            {currentStep === 0 ? 'Start' : `Step ${currentStep + 1}`}: {STEP_LABELS[currentStep]}
          </button>
        )}
        {currentStep >= 3 && !isGenerating && (
          <span className="stepper-done-badge">All steps generated</span>
        )}
      </div>

      <div className="validator-content">
        <div className="validator-chat-panel">
          <ChatSettings
            config={config}
            onUpdate={updateConfig}
            onPreset={applyPreset}
          />

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">
                <p className="chat-empty-title">Stepper Forms Playground</p>
                <p className="chat-empty-hint">
                  Generate a 3-step onboarding flow one step at a time.
                  Each step is a separate AI response, validated by <code>@mobile-reality/mdma-validator</code>.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isStreaming={isGenerating && msg.id === lastMsgId}
                customizations={customizations}
              />
            ))}

            {error && <div className="chat-error">{error}</div>}

            <div ref={chatEndRef} />
          </div>

          <ChatInput
            value={input}
            onChange={setInput}
            onSend={send}
            onStop={stop}
            onClear={handleClear}
            isGenerating={isGenerating}
            hasMessages={messages.length > 0}
            inputRef={inputRef}
          />
        </div>

        <ValidationPanel results={validationResults} stepLabels={stepLabelMap} />
      </div>
    </div>
  );
}
