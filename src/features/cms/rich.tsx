import { Fragment } from 'react';

/**
 * Restricted rich text for FAQ answers: **bold**, [label](https://link or /path) and "- " bullet lists.
 * Rendered as React nodes (never innerHTML), and only https:// or relative links are allowed, so stored content can't inject markup.
 */
const SAFE = /^(https:\/\/|\/|#)/;

function inline(text: string, key: string) {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0,
    m: RegExpExecArray | null,
    i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={`${key}-${i++}`}>{m[1]}</strong>);
    else if (SAFE.test(m[3]))
      parts.push(
        <a key={`${key}-${i++}`} href={m[3]} rel="noopener noreferrer" className="underline">
          {m[2]}
        </a>,
      );
    else parts.push(m[0]);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = (k: number) => {
    if (list.length) {
      out.push(
        <ul key={`u${k}`} className="ml-5 list-disc">
          {list.map((l, i) => (
            <li key={i}>{inline(l, `l${k}${i}`)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  lines.forEach((line, k) => {
    if (/^- /.test(line)) list.push(line.slice(2));
    else {
      flush(k);
      if (line.trim()) out.push(<p key={`p${k}`}>{inline(line, `p${k}`)}</p>);
    }
  });
  flush(lines.length);
  return <Fragment>{out}</Fragment>;
}
