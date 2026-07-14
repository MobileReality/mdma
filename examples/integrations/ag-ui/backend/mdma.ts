/**
 * Text helpers for MDMA documents the model produces.
 *
 * The backend never renders MDMA — it only needs to spot a few things in the raw markdown: which
 * component a document is about, whether it's an approval gate, and which form fields can be
 * pre-filled. So these are deliberately regex-level, not a real parse.
 */
const FENCE = '```';

/** Every fenced ```mdma block in a document. */
function mdmaBlocks(doc: string): string[] {
  return doc.match(/```mdma\b[\s\S]*?```/g) ?? [];
}

/** The `id:` of a single block, if it declares one. */
function blockId(block: string): string | null {
  return block.match(/id:\s*([\w-]+)/)?.[1] ?? null;
}

/** Wrap a bare document in an ```mdma fence so the bridge's containsMdma gate passes. */
export function fenceMdma(doc: string): string {
  return /```mdma/.test(doc) ? doc : `${FENCE}mdma\n${doc.trim()}\n${FENCE}`;
}

/** The id of the document's first real component — `thinking` blocks don't count. */
export function primaryComponentId(doc: string): string | null {
  for (const block of mdmaBlocks(doc)) {
    if (/type:\s*thinking/.test(block)) continue;
    const id = blockId(block);
    if (id) return id;
  }
  return null;
}

/** The id of an approval gate in the document, so the run can park on it as an AG-UI interrupt. */
export function approvalGateId(doc: string): string | null {
  for (const block of mdmaBlocks(doc)) {
    if (/type:\s*approval-gate/.test(block)) {
      const id = blockId(block);
      if (id) return id;
    }
  }
  return null;
}

/**
 * Values a freshly generated form can inherit from the remembered `profile`, matched per field by
 * that field's OWN declared type/name (never by proximity — that once put an email in `full-name`).
 */
export function formHydration(
  doc: string,
  profile: { email?: string; name?: string },
): { id: string; values: Record<string, unknown> } | null {
  for (const block of mdmaBlocks(doc)) {
    if (!/type:\s*form/.test(block)) continue;
    const id = blockId(block);
    if (!id) continue;

    const values: Record<string, unknown> = {};
    const fieldRe = /-\s*name:\s*([\w-]+)([\s\S]*?)(?=\n\s*-\s*name:|\n\s*onSubmit:|\n```|$)/g;
    let match: RegExpExecArray | null;
    while ((match = fieldRe.exec(block)) !== null) {
      const [, field, body] = match;
      if (/type:\s*email/.test(body) && profile.email) values[field] = profile.email;
      else if (/^(full[-_]?name|first[-_]?name|name)$/i.test(field) && profile.name)
        values[field] = profile.name;
    }
    if (Object.keys(values).length > 0) return { id, values };
  }
  return null;
}
