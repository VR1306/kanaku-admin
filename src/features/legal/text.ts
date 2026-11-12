import type { LegalBlock } from '@/types/legal';

/** Editor text ⇄ blocks: blank line = new paragraph; a paragraph whose lines all start with "- " is a bulleted list. */
export function textToBlocks(text: string): LegalBlock[] {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      return lines.every((l) => l.startsWith('- '))
        ? lines.map((l) => l.slice(2).trim())
        : lines.join(' ');
    });
}

export const blocksToText = (blocks: LegalBlock[]): string =>
  blocks.map((b) => (typeof b === 'string' ? b : b.map((i) => `- ${i}`).join('\n'))).join('\n\n');
