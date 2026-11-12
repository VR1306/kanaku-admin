# Landing-page CMS

Config-driven: the public page (`/site`, and the editor's live preview) renders **only** from a validated `SiteConfig` (`src/features/cms/schemas/site.ts`) via `LandingPage.tsx`. No marketing copy is hard-coded in JSX.

- **Workflow:** edit → _Save draft_ (validated, audited) → _Publish_ (creates an immutable new version) → _Restore_ loads an old version into the **draft** only; it goes live when published again. Drafts never reach `/site` or `/api/public/site`.
- **Rules enforced in the schema and server:** headline ≤ 60, sub-heading ≤ 200, 1–3 CTA buttons (limit configurable 2 or 3), label ≤ 24, only one primary, features ≥ 3 visible, feature title ≤ 40 / description ≤ 140, FAQ question ≤ 120 / answer ≤ 800, hex colours, https-or-uploaded hero images with alt text.
- **Pricing:** visibility, order, badge, CTA and bullets are stored; **prices are joined from Plans & payments** at render time.
- **Theme:** design tokens → CSS variables scoped to the landing page subtree (`--lp-*`); independent of admin/user themes.
- **FAQ rich text:** restricted markup (`**bold**`, `[label](https://…)`, `- list`) rendered as React nodes — never `innerHTML`; only `https://`, `/` and `#` links.
- **Reordering:** drag-and-drop plus ↑/↓ buttons for keyboard users.
