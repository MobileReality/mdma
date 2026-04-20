import type { ValidationIssue } from '@mobile-reality/mdma-validator';

function severityClass(severity: string): string {
  if (severity === 'error') return 'validator-severity--error';
  if (severity === 'warning') return 'validator-severity--warning';
  return 'validator-severity--info';
}

export function IssueRow({ issue }: { issue: ValidationIssue }) {
  return (
    <div className={`validator-issue ${issue.fixed ? 'validator-issue--fixed' : ''}`}>
      <span className={`validator-severity ${severityClass(issue.severity)}`}>
        {issue.severity}
      </span>
      <span className="validator-issue-rule">{issue.ruleId}</span>
      {issue.componentId && <span className="validator-issue-component">#{issue.componentId}</span>}
      <span className="validator-issue-msg">{issue.message}</span>
      {issue.fixed && <span className="validator-issue-badge">fixed</span>}
    </div>
  );
}
