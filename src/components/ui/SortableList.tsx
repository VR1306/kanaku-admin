'use client';

import { useRef, useState } from 'react';

interface Props<T> {
  items: T[];
  keyOf: (item: T) => string;
  onReorder: (from: number, to: number) => void;
  render: (item: T, index: number) => React.ReactNode;
  className?: string;
}

/** HTML5 drag-and-drop reordering. Callers should also keep up/down buttons for keyboard users. */
export function SortableList<T>({ items, keyOf, onReorder, render, className }: Props<T>) {
  const from = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  return (
    <div className={className}>
      {items.map((item, i) => (
        <div
          key={keyOf(item)}
          draggable
          onDragStart={(e) => {
            from.current = i;
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(i);
          }}
          onDragLeave={() => setOver((o) => (o === i ? null : o))}
          onDrop={(e) => {
            e.preventDefault();
            if (from.current !== null && from.current !== i) onReorder(from.current, i);
            from.current = null;
            setOver(null);
          }}
          onDragEnd={() => {
            from.current = null;
            setOver(null);
          }}
          className={over === i ? 'rounded-xl outline outline-2 outline-brand' : ''}
        >
          {render(item, i)}
        </div>
      ))}
    </div>
  );
}
