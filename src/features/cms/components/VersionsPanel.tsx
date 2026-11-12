import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatIST } from '@/utils/format';
import type { CmsResponse } from '@/types/cms';
import { SubHeading } from './ListRow';

/** Published versions as a timeline. Restore loads a version into the draft — it only goes live when published again. */
export function VersionsPanel({
  data,
  busy,
  onRestore,
}: {
  data: CmsResponse;
  busy: boolean;
  onRestore: (v: number) => void;
}) {
  return (
    <div className="space-y-5">
      <SubHeading
        title="Version history"
        hint="Restoring loads a version into your draft. Publish it to make it live."
      />
      <ol className="relative space-y-4 border-l-2 border-line-soft pl-6">
        {data.history.map((v) => {
          const live = data.published?.version === v.version;
          return (
            <li key={v.version} className="relative">
              <span
                aria-hidden
                className={`absolute top-4 -left-[33px] size-3.5 rounded-full border-2 border-surface ${live ? 'bg-ok' : 'bg-line-strong'}`}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4">
                <div>
                  <p className="flex items-center gap-2 font-display font-bold">
                    Version {v.version} {live && <Badge tone="green">Live</Badge>}
                  </p>
                  <p className="text-[13px] text-muted">
                    {formatIST(v.publishedAt)} · {v.by}
                  </p>
                </div>
                {!live && (
                  <Button
                    variant="outline"
                    className="h-10"
                    disabled={busy}
                    onClick={() => onRestore(v.version)}
                  >
                    Restore to draft
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
