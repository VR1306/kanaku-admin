export const LEGAL_SLUGS = ['privacy', 'terms'] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];
export const LEGAL_LABEL: Record<LegalSlug, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms & Conditions',
};

/** A paragraph (string) or a bulleted list (string[]). */
export type LegalBlock = string | string[];
export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}
export interface LegalContent {
  title: string;
  summary: string;
  sections: LegalSection[];
}
export interface LegalVersion {
  version: number;
  publishedAt: string;
  by: string;
  content: LegalContent;
}
export interface LegalState {
  slug: LegalSlug;
  draft: LegalContent;
  draftDirty: boolean;
  published: LegalVersion | null;
}
