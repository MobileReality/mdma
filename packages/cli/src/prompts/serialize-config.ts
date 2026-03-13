import type { DomainConfig, ComponentConfig } from './types.js';

export function serializeConfig(domain: DomainConfig, components: ComponentConfig[]): string {
  const enabled = components.filter((c) => c.enabled);
  const lines: string[] = [
    `## User Configuration`,
    ``,
    `**Flow Name:** ${domain.name || '(not set)'}`,
    `**Domain:** ${domain.domain || '(not set)'}`,
    `**Description:** ${domain.description || '(not set)'}`,
  ];

  if (domain.businessRules) {
    lines.push(`**Business Rules:** ${domain.businessRules}`);
  }

  if (domain.triggerMode === 'immediate') {
    lines.push('**When to Display Components:** Immediately when the conversation starts — always respond with MDMA components in the first message.');
  } else if (domain.triggerMode === 'keyword' && domain.trigger) {
    lines.push(`**When to Display Components:** When the user says one of these keywords or phrases: ${domain.trigger}. Only generate MDMA components when triggered by these phrases, otherwise respond with plain text.`);
  } else if (domain.triggerMode === 'contextual' && domain.trigger) {
    lines.push(`**When to Display Components:** ${domain.trigger}`);
  }

  lines.push('', '**Selected Components:**', '');

  for (const comp of enabled) {
    lines.push(`### ${comp.type}`);

    if (comp.type === 'form' && comp.form?.fields.length) {
      lines.push('Fields:');
      for (const f of comp.form.fields) {
        lines.push(`- ${f.name} (${f.type}, label: "${f.label}", required: ${f.required}, sensitive: ${f.sensitive})`);
      }
    }

    if (comp.type === 'approval-gate' && comp.approvalGate) {
      const ag = comp.approvalGate;
      lines.push(`Roles: ${ag.roles.join(', ') || '(none)'}`);
      lines.push(`Required approvers: ${ag.requiredApprovers}`);
      lines.push(`Require reason on denial: ${ag.requireReason}`);
    }

    if (comp.type === 'tasklist' && comp.tasklist?.items.length) {
      lines.push('Items:');
      for (const item of comp.tasklist.items) {
        lines.push(`- ${item}`);
      }
    }

    if (comp.type === 'table' && comp.table?.columns.length) {
      lines.push('Columns:');
      for (const col of comp.table.columns) {
        lines.push(`- ${col.key}: "${col.header}"`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}
