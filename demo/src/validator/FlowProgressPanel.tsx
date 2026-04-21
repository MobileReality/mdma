import type { FlowStepDefinition, FlowValidationResult } from '@mobile-reality/mdma-validator';

interface FlowProgressPanelProps {
  steps: FlowStepDefinition[];
  result: FlowValidationResult | null;
}

type StepStatus = 'pending' | 'done' | 'error';

function getStepStatus(
  result: FlowValidationResult | null,
  step: FlowStepDefinition,
  stepIndex: number,
): StepStatus {
  if (!result) return 'pending';
  const stepPrefix = `Step ${stepIndex + 1} `;
  const matchingIssue = result.issues.find((iss) => iss.message.startsWith(stepPrefix));
  if (!matchingIssue) return 'pending';
  if (matchingIssue.severity === 'info' && matchingIssue.message.includes('correct')) return 'done';
  if (matchingIssue.severity === 'error') return 'error';
  return 'pending';
}

export function FlowProgressPanel({ steps, result }: FlowProgressPanelProps) {
  const stepStatuses = steps.map((step, i) => getStepStatus(result, step, i));
  const completedSteps = stepStatuses.filter((s) => s === 'done').length;

  return (
    <div className="flow-progress-panel">
      <h3>Flow Progress</h3>
      <div className="flow-steps">
        {steps.map((step, i) => {
          const status = stepStatuses[i];
          const stepPrefix = `Step ${i + 1} `;
          const issue = result?.issues.find(
            (iss) => iss.message.startsWith(stepPrefix) && iss.severity === 'error',
          );

          return (
            <div key={step.id} className={`flow-step flow-step--${status}`}>
              <span className="flow-step-num">{i + 1}</span>
              <span className="flow-step-label">{step.label}</span>
              <span className="flow-step-type">
                {step.type}#{step.id}
              </span>
              {status === 'done' && (
                <span className="flow-step-badge flow-step-badge--done">done</span>
              )}
              {status === 'error' && issue && (
                <span className="flow-step-badge flow-step-badge--error">{issue.message}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flow-progress-summary">
        {completedSteps}/{steps.length} steps completed
        {result && !result.ok && (
          <span className="validator-severity validator-severity--error" style={{ marginLeft: 8 }}>
            flow errors detected
          </span>
        )}
      </div>
    </div>
  );
}
