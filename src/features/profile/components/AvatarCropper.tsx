'use client';

/* eslint-disable @next/next/no-img-element -- a local preview of the chosen file */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

const VIEW = 280; // size of the crop circle on screen, in px
const MAX_ZOOM = 3;
const KEY_STEP = 12;
const AVATAR_SIZE = 256;
const AVATAR_MAX_CHARS = 200_000;

interface Props {
  /** The chosen photo; the drawer is open while this is set. */
  file: File | null;
  /** Receives the cropped JPEG as a data URL. */
  onSave: (dataUrl: string) => Promise<void>;
  onClose: () => void;
}

/** Lets the admin position and zoom a photo inside a circle (drag, arrow keys, slider) — same interaction as the user app. */
export function AvatarCropper({ file, onSave, onClose }: Props) {
  return (
    <Modal
      open={file !== null}
      variant="drawer"
      title="Crop your photo"
      subtitle="Drag to position, use the slider to zoom. The circle is what people will see."
      onClose={onClose}
    >
      {file && (
        <Cropper key={file.name + file.size} file={file} onSave={onSave} onClose={onClose} />
      )}
    </Modal>
  );
}

function Cropper({
  file,
  onSave,
  onClose,
}: {
  file: File;
  onSave: Props['onSave'];
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string>();
  const [size, setSize] = useState<{ w: number; h: number }>();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setUrl(String(reader.result));
    reader.onerror = () => setError("Couldn't read that file.");
    reader.readAsDataURL(file);
    return () => {
      reader.onload = null;
      reader.onerror = null;
    };
  }, [file]);

  // Scale at which the photo just covers the circle, times the zoom.
  const scale = size ? (VIEW / Math.min(size.w, size.h)) * zoom : 1;
  const clamp = (o: { x: number; y: number }, s = scale) => {
    if (!size) return o;
    const mx = Math.max(0, (size.w * s - VIEW) / 2);
    const my = Math.max(0, (size.h * s - VIEW) / 2);
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
  };
  function changeZoom(next: number) {
    if (!size) return;
    setZoom(next);
    setOffset((o) => clamp(o, (VIEW / Math.min(size.w, size.h)) * next));
  }
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current)
      setOffset(
        clamp({
          x: drag.current.ox + e.clientX - drag.current.x,
          y: drag.current.oy + e.clientY - drag.current.y,
        }),
      );
  };
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const d = (
      {
        ArrowLeft: [KEY_STEP, 0],
        ArrowRight: [-KEY_STEP, 0],
        ArrowUp: [0, KEY_STEP],
        ArrowDown: [0, -KEY_STEP],
      } as Record<string, number[]>
    )[e.key];
    if (!d) return;
    e.preventDefault();
    setOffset((o) => clamp({ x: o.x + d[0], y: o.y + d[1] }));
  }

  async function save() {
    if (!size || !imgRef.current) return;
    setSaving(true);
    setError(undefined);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = AVATAR_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Your browser couldn't process that photo.");
      // The circle covers [0, VIEW] on screen; find the matching square in the photo.
      const sx = (size.w * scale) / 2 - VIEW / 2 - offset.x;
      const sy = (size.h * scale) / 2 - VIEW / 2 - offset.y;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
      ctx.drawImage(
        imgRef.current,
        sx / scale,
        sy / scale,
        VIEW / scale,
        VIEW / scale,
        0,
        0,
        AVATAR_SIZE,
        AVATAR_SIZE,
      );
      let dataUrl = '';
      for (const q of [0.85, 0.7, 0.5]) {
        dataUrl = canvas.toDataURL('image/jpeg', q);
        if (dataUrl.length <= AVATAR_MAX_CHARS) break;
      }
      if (dataUrl.length > AVATAR_MAX_CHARS) throw new Error('That photo is too large.');
      await onSave(dataUrl);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that photo.");
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col items-center gap-6">
      <div
        role="application"
        aria-label="Photo position. Drag, or use the arrow keys, to move the photo."
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={onKeyDown}
        style={{ width: VIEW, height: VIEW }}
        className="relative shrink-0 cursor-grab touch-none overflow-hidden rounded-full bg-canvas ring-[3px] ring-cyan select-none focus-visible:outline-2 focus-visible:outline-offset-4 active:cursor-grabbing"
      >
        {url && (
          <img
            ref={imgRef}
            src={url}
            alt=""
            draggable={false}
            onLoad={(e) =>
              setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
            }
            style={
              size
                ? {
                    width: size.w * scale,
                    height: size.h * scale,
                    maxWidth: 'none',
                    left: VIEW / 2 + offset.x - (size.w * scale) / 2,
                    top: VIEW / 2 + offset.y - (size.h * scale) / 2,
                  }
                : { visibility: 'hidden' }
            }
            className="pointer-events-none absolute"
          />
        )}
      </div>
      <div className="flex w-full max-w-[320px] items-center gap-3">
        <span className="text-sm text-muted" aria-hidden="true">
          −
        </span>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          disabled={!size}
          onChange={(e) => changeZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="h-2 flex-1 accent-brand"
        />
        <span className="text-sm text-muted" aria-hidden="true">
          +
        </span>
      </div>
      <button
        type="button"
        onClick={() => {
          setZoom(1);
          setOffset({ x: 0, y: 0 });
        }}
        className="text-sm font-semibold text-link hover:underline"
      >
        Reset
      </button>
      {error && (
        <p role="alert" className="w-full rounded-control bg-bad-soft px-4 py-3 text-sm text-bad">
          {error}
        </p>
      )}
      <div className="mt-auto grid w-full grid-cols-2 gap-3 pt-4">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={() => void save()} loading={saving} disabled={!size}>
          Save photo
        </Button>
      </div>
    </div>
  );
}
