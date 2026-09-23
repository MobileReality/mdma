import type { MdmaBlock } from '@mobile-reality/mdma-spec';

export function extractIdFromYaml(yaml?: string): string | null {
  const match = yaml?.match(/^\s*id:\s*(\S+)/m);
  return match ? match[1] : null;
}

export function extractTypeFromYaml(yaml?: string): string | null {
  const match = yaml?.match(/^\s*type:\s*(\S+)/m);
  return match ? match[1] : null;
}

function extractContent(yaml: string): string {
  const block = yaml.match(/^\s*content:\s*\|\s*\n([\s\S]*)$/m);
  if (block) {
    const lines: string[] = [];
    for (const line of block[1].split('\n')) {
      // A non-indented non-empty line starts a new YAML key — stop there.
      if (line.length > 0 && !line.startsWith(' ') && !line.startsWith('\t')) break;
      lines.push(line.replace(/^ {1,2}/, ''));
    }
    return lines.join('\n').trimEnd();
  }

  const inline = yaml.match(/^\s*content:\s*(?:"([^"]*)"|'([^']*)'|(.+))$/m);
  return inline ? (inline[1] ?? inline[2] ?? inline[3] ?? '').trim() : '';
}

/**
 * Build a synthetic `thinking` block from still-streaming YAML, so its content
 * appears live instead of sitting behind a loading skeleton. Returns null when
 * the fence hasn't produced an id yet.
 */
export function buildPartialThinkingBlock(yaml: string): MdmaBlock | null {
  const id = extractIdFromYaml(yaml);
  if (!id) return null;

  const labelMatch = yaml.match(/^\s*label:\s*(.+)$/m);
  const label = labelMatch ? labelMatch[1].trim() : undefined;

  return {
    type: 'mdmaBlock',
    rawYaml: yaml,
    component: {
      type: 'thinking',
      id,
      content: extractContent(yaml) || '...',
      status: 'thinking',
      collapsed: false,
      ...(label ? { label } : {}),
    },
  } as MdmaBlock;
}
