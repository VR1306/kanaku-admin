import { describe, expect, it } from 'vitest';
import { legalContentSchema } from '@/features/legal/schemas/legal';
import { blocksToText, textToBlocks } from '@/features/legal/text';
import { hasDb, useTestDb } from '@/test/db';
import { getPublished, getState, publish, saveDraft } from './legal';

const doc = (title: string) => ({
  title,
  summary: 's',
  sections: [{ id: 'a', title: 'A', blocks: ['Para', ['one', 'two']] }],
});

describe('legal text editor format', () => {
  it('round-trips paragraphs and bullet lists', () => {
    const blocks = [
      'First paragraph.',
      ['item one', 'item two'],
      'Last paragraph, wrapped\nonto two lines.',
    ];
    expect(textToBlocks(blocksToText(blocks))).toEqual([
      'First paragraph.',
      ['item one', 'item two'],
      'Last paragraph, wrapped onto two lines.',
    ]);
    expect(textToBlocks('  \n\n ')).toEqual([]);
  });
  it('validates: needs sections with text and unique ids', () => {
    expect(legalContentSchema.safeParse(doc('T')).success).toBe(true);
    expect(legalContentSchema.safeParse({ ...doc('T'), sections: [] }).success).toBe(false);
    const dup = doc('T');
    dup.sections.push({ ...dup.sections[0] });
    expect(legalContentSchema.safeParse(dup).success).toBe(false);
    expect(legalContentSchema.safeParse({ ...doc(''), title: '' }).success).toBe(false);
  });
});

describe.skipIf(!hasDb)('legal documents', () => {
  useTestDb();
  it('only the published version is public; drafts stay private; versions increment', async () => {
    expect(await getPublished('privacy')).toBeNull();
    await saveDraft('privacy', doc('Privacy v1'));
    expect(await getPublished('privacy')).toBeNull(); // a saved draft is not live
    expect((await getState('privacy')).draftDirty).toBe(true);
    expect((await publish('privacy', 'a@x.com')).version).toBe(1);
    await saveDraft('privacy', doc('Privacy v2 draft'));
    expect((await getPublished('privacy'))?.content.title).toBe('Privacy v1'); // still the old text
    expect((await publish('privacy', 'a@x.com')).version).toBe(2);
    expect((await getPublished('privacy'))?.content.title).toBe('Privacy v2 draft');
    expect(await getPublished('terms')).toBeNull(); // documents are independent
  });
});
