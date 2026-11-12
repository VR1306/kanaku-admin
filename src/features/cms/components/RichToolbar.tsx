'use client';

import { Button } from '@/components/ui/Button';

/** Inserts the restricted markup (**bold**, [label](url), "- " list) around the textarea selection. */
export function RichToolbar({
  target,
  value,
  onChange,
}: {
  target: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const apply = (fn: (sel: string) => string) => {
    const el = document.getElementById(target) as HTMLTextAreaElement | null;
    const [a, b] = el ? [el.selectionStart, el.selectionEnd] : [value.length, value.length];
    onChange(value.slice(0, a) + fn(value.slice(a, b)) + value.slice(b));
  };
  return (
    <div className="flex gap-1.5" role="toolbar" aria-label="Formatting">
      <Button
        type="button"
        variant="outline"
        className="h-8 px-3"
        aria-label="Bold"
        onClick={() => apply((s) => `**${s || 'bold'}**`)}
      >
        <b>B</b>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-8 px-3"
        aria-label="Link"
        onClick={() => apply((s) => `[${s || 'link text'}](https://)`)}
      >
        Link
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-8 px-3"
        aria-label="List"
        onClick={() => apply((s) => `\n- ${s || 'item'}`)}
      >
        • List
      </Button>
    </div>
  );
}
