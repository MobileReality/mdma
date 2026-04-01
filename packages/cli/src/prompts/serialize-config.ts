import type { DomainConfig, FlowStep, ComponentConfig } from './types.js';

function serializeTrigger(step: FlowStep): string {
  switch (step.triggerMode) {
    case 'immediate':
      return 'Immediately when the conversation starts';
    case 'keyword':
      return step.trigger
        ? `When the user says: ${step.trigger}`
        : 'When the user says a specific keyword or phrase';
    case 'form-submit':
      return 'After the user submits the form/component from the previous step';
    case 'contextual':
      return step.trigger || 'Based on conversation context';
  }
}

function serializeStepComponent(comp: ComponentConfig): string[] {
  const lines: string[] = [];
  lines.push(`  - **${comp.type}**`);

  if (comp.type === 'form' && comp.form?.fields.length) {
    lines.push('    Fields:');
    for (const f of comp.form.fields) {
      lines.push(
        `    - ${f.name} (${f.type}, label: "${f.label}", required: ${f.required}, sensitive: ${f.sensitive})`,
      );
    }
  }

  if (comp.type === 'approval-gate' && comp.approvalGate) {
    const ag = comp.approvalGate;
    lines.push(`    Roles: ${ag.roles.join(', ') || '(none)'}`);
    lines.push(`    Required approvers: ${ag.requiredApprovers}`);
    lines.push(`    Require reason on denial: ${ag.requireReason}`);
  }

  if (comp.type === 'tasklist' && comp.tasklist?.items.length) {
    lines.push('    Items:');
    for (const item of comp.tasklist.items) {
      lines.push(`    - ${item}`);
    }
  }

  if (comp.type === 'table' && comp.table?.columns.length) {
    lines.push('    Columns:');
    for (const col of comp.table.columns) {
      lines.push(`    - ${col.key}: "${col.header}"`);
    }
  }

  return lines;
}

export function serializeConfig(domain: DomainConfig): string {
  const lines: string[] = [
    '## User Configuration',
    '',
    `**Flow Name:** ${domain.name || '(not set)'}`,
    `**Domain:** ${domain.domain || '(not set)'}`,
    `**Description:** ${domain.description || '(not set)'}`,
  ];

  if (domain.businessRules) {
    lines.push(`**Business Rules:** ${domain.businessRules}`);
  }

  // Conversation flow with per-step components
  if (domain.flowSteps.length > 0) {
    lines.push('', '**Conversation Flow:**', '');
    for (let i = 0; i < domain.flowSteps.length; i++) {
      const step = domain.flowSteps[i];
      lines.push(`Step ${i + 1} — ${step.label || `Step ${i + 1}`}`);
      lines.push(`  Trigger: ${serializeTrigger(step)}`);

      const enabled = step.components.filter((c) => c.enabled);
      if (enabled.length > 0) {
        lines.push('  Components:');
        for (const comp of enabled) {
          lines.push(...serializeStepComponent(comp));
        }
      }

      if (step.description) {
        lines.push(`  ${step.description}`);
      }
      lines.push('');
    }

    // Derive global component type summary
    const allTypes = new Set<string>();
    for (const step of domain.flowSteps) {
      for (const comp of step.components) {
        if (comp.enabled) allTypes.add(comp.type);
      }
    }
    if (allTypes.size > 0) {
      lines.push(`**All Component Types Used:** ${[...allTypes].join(', ')}`, '');
    }

    // Count forms across all steps
    let formCount = 0;
    for (const step of domain.flowSteps) {
      formCount += step.components.filter((c) => c.enabled && c.type === 'form').length;
    }
    if (formCount > 0) {
      lines.push(
        `**IMPORTANT:** Your output MUST include concrete \`\`\`mdma code block examples for all ${formCount} form(s) defined above. Each form must include onSubmit and all specified fields.`,
        '',
      );
    }
  }

  return lines.join('\n');
}
