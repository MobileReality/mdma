import type { Policy, PolicyRule } from '@mobile-reality/mdma-spec';

export interface PolicyEvaluationResult {
  allowed: boolean;
  rule?: PolicyRule;
  reason?: string;
}

export class PolicyViolationError extends Error {
  readonly rule?: PolicyRule;

  constructor(message: string, rule?: PolicyRule) {
    super(message);
    this.name = 'PolicyViolationError';
    this.rule = rule;
  }
}

export class PolicyEngine {
  private readonly policy: Policy;
  private readonly environment: string;

  constructor(policy: Policy, environment: string) {
    this.policy = policy;
    this.environment = environment;
  }

  evaluate(action: string): PolicyEvaluationResult {
    // Find matching rules for this action and environment
    const matchingRules = this.policy.rules.filter(
      (rule) => rule.action === action && rule.environments.includes(this.environment),
    );

    // If we have explicit rules, use the first matching one
    if (matchingRules.length > 0) {
      const rule = matchingRules[0];
      return {
        allowed: rule.effect === 'allow',
        rule,
        reason: rule.reason,
      };
    }

    // Fall back to default effect
    return {
      allowed: this.policy.defaultEffect === 'allow',
      reason: `Default policy: ${this.policy.defaultEffect}`,
    };
  }

  enforce(action: string): void {
    const result = this.evaluate(action);
    if (!result.allowed) {
      throw new PolicyViolationError(
        result.reason ?? `Action "${action}" denied by policy`,
        result.rule,
      );
    }
  }

  get currentEnvironment(): string {
    return this.environment;
  }
}

export function createDefaultPolicy(): Policy {
  return {
    version: 1,
    rules: [
      {
        action: 'send_email',
        environments: ['preview', 'test'],
        effect: 'deny',
        reason: 'Email sending is blocked in non-production environments',
      },
      {
        action: 'webhook_call',
        environments: ['preview'],
        effect: 'deny',
        reason: 'External webhook calls are blocked in preview',
      },
    ],
    defaultEffect: 'allow',
  };
}
