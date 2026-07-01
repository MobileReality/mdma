/**
 * Cheap gate run on every streamed content event before the (comparatively expensive)
 * markdown parse. Returns true only if the buffer plausibly contains an opening ```mdma
 * fence, so plain prose messages never touch the parser.
 */
const MDMA_FENCE = /(^|\n)[ \t]*(`{3,}|~{3,})[ \t]*mdma\b/;

export function containsMdma(text: string): boolean {
  return MDMA_FENCE.test(text);
}
