'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { FadeSwitch } from '@/components/motion/presence';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { api, ApiError } from '@/lib/api-client';
import type { CmsResponse, SiteConfig } from '@/types/cms';
import { siteConfigSchema } from '../schemas/site';
import { FaqForm } from './FaqForm';
import { FeaturesForm } from './FeaturesForm';
import { HeroForm } from './HeroForm';
import { HeroVisualForm } from './HeroVisualForm';
import { NavbarForm } from './NavbarForm';
import { PreviewScreen } from './PreviewScreen';
import { PricingForm } from './PricingForm';
import { SECTIONS, SectionNav, type SectionId } from './SectionNav';
import { FooterForm, ThemeForm } from './ThemeForm';
import { LegalForm } from '@/features/legal/components/LegalForm';
import { StructureForm } from './StructureForm';
import { VersionsPanel } from './VersionsPanel';

export function CmsEditor() {
  const { toast } = useToast();
  const { data, error, loading, reload } = useApi<CmsResponse>('/api/cms');
  // Local edits override the server draft until saved/restored (no effect-based syncing).
  const [local, setLocal] = useState<SiteConfig | null>(null);
  const cfg = local ?? data?.draft ?? null;
  const dirty = local !== null;
  const [section, setSection] = useState<SectionId>('Hero');
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const edit = (next: SiteConfig) => setLocal(next);
  const parsed = cfg ? siteConfigSchema.safeParse(cfg) : null;
  const problem = parsed && !parsed.success ? parsed.error.issues[0]?.message : '';

  async function run(fn: () => Promise<unknown>, ok: string, afterSave = false) {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      if (afterSave) setLocal(null);
      reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }
  const save = () => api('/api/cms/draft', { method: 'PUT', body: cfg });
  // Publish saves the current edits as the draft first, then promotes the draft to a new version.
  const publish = async () => {
    await save();
    await api('/api/cms/publish', { body: {} });
  };
  const restore = async (version: number) => {
    await api('/api/cms/restore', { body: { version } });
    setLocal(null);
  };

  if (loading && !data)
    return (
      <div className="space-y-6">
        <Skeleton className="h-16" />
        <Skeleton className="h-[28rem] rounded-[24px]" />
      </div>
    );
  if (error || !cfg || !data)
    return (
      <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm text-bad">
        {error ?? 'Could not load'}
      </p>
    );
  const meta = SECTIONS.find((s) => s.id === section)!;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Website content</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            Edit kanaku.com without touching code · changes go live when you publish
            {data.published && <Badge tone="green">Live · v{data.published.version}</Badge>}
            {dirty ? (
              <Badge tone="amber">Unsaved changes</Badge>
            ) : data.draftDirty ? (
              <Badge tone="blue">Draft ahead of live</Badge>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/site"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-[52px] items-center gap-2 rounded-control border border-line-strong bg-surface px-5 text-[15px] font-bold text-link transition-colors hover:bg-canvas"
          >
            <Icon name="external" size={16} />
            Preview site
          </a>
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Icon name="desktop" size={16} />
            Preview
          </Button>
          <Button
            variant="outline"
            disabled={!dirty || !!problem}
            loading={busy}
            onClick={() => run(save, 'Draft saved', true)}
          >
            Save draft
          </Button>
          <Button
            disabled={!!problem}
            loading={busy}
            onClick={() => run(publish, 'Published — the website is updated', true)}
          >
            Publish
          </Button>
        </div>
      </header>
      {problem && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-2xl bg-warn-soft px-5 py-3 text-sm font-semibold text-warn"
        >
          <Icon name="warning" size={18} />
          {problem}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
        <SectionNav value={section} onChange={setSection} />
        <div className="min-w-0 space-y-6">
          <section
            className="min-w-0 rounded-[24px] border border-line bg-surface p-6 sm:p-8"
            aria-labelledby="cms-section-title"
          >
            <div className="mb-6 border-b border-line-soft pb-5">
              <h2 id="cms-section-title" className="font-display text-[26px] font-bold">
                {meta.id}
              </h2>
              <p className="text-sm text-muted">{meta.hint}</p>
            </div>
            <FadeSwitch id={section}>
              {section === 'Hero' && (
                <div className="space-y-10">
                  <NavbarForm navbar={cfg.navbar} onChange={(navbar) => edit({ ...cfg, navbar })} />
                  <HeroForm hero={cfg.hero} onChange={(hero) => edit({ ...cfg, hero })} />
                  <HeroVisualForm hero={cfg.hero} onChange={(hero) => edit({ ...cfg, hero })} />
                </div>
              )}
              {section === 'Features' && (
                <FeaturesForm
                  features={cfg.features}
                  onChange={(features) => edit({ ...cfg, features })}
                />
              )}
              {section === 'Pricing' && (
                <PricingForm
                  pricing={cfg.pricing}
                  plans={data.plans}
                  onChange={(pricing) => edit({ ...cfg, pricing })}
                />
              )}
              {section === 'FAQ' && (
                <FaqForm faq={cfg.faq} onChange={(faq) => edit({ ...cfg, faq })} />
              )}
              {section === 'Theme' && (
                <ThemeForm theme={cfg.theme} onChange={(theme) => edit({ ...cfg, theme })} />
              )}
              {section === 'Footer' && (
                <FooterForm footer={cfg.footer} onChange={(footer) => edit({ ...cfg, footer })} />
              )}
              {section === 'Structure' && <StructureForm />}
              {section === 'Legal' && <LegalForm />}
              {section === 'Versions' && (
                <VersionsPanel
                  data={data}
                  busy={busy}
                  onRestore={(v) =>
                    run(() => restore(v), `v${v} loaded into your draft — publish to make it live`)
                  }
                />
              )}
            </FadeSwitch>
          </section>
        </div>
      </div>
      {previewOpen && (
        <PreviewScreen
          config={cfg}
          plans={data.plans}
          dirty={dirty}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
