import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link2, MousePointer2, X } from 'lucide-react';
import { MatchingPair } from '../types/quiz.js';

interface MatchingAnswerBoardProps {
  pairs: MatchingPair[];
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  disabled?: boolean;
  /** Ganti nilai ini (mis. id soal) supaya pilihan & tarikan lama dibersihkan. */
  resetKey?: string | number;
}

type Side = 'left' | 'right';

interface Dot {
  side: Side;
  text: string;
}

interface DragPress {
  side: Side;
  text: string;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
}

interface DotLine {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  dashed?: boolean;
  opacity?: number;
}

// Warna mengikuti konsep aplikasi (teal / cyan / emerald / sky / indigo / amber).
const PALETTE = [
  {
    card: 'border-teal-300 bg-teal-50',
    chip: 'bg-teal-600 text-white',
    dotOn: 'border-teal-700 bg-teal-600',
    line: '#0d9488'
  },
  {
    card: 'border-cyan-300 bg-cyan-50',
    chip: 'bg-cyan-600 text-white',
    dotOn: 'border-cyan-700 bg-cyan-600',
    line: '#0891b2'
  },
  {
    card: 'border-emerald-300 bg-emerald-50',
    chip: 'bg-emerald-600 text-white',
    dotOn: 'border-emerald-700 bg-emerald-600',
    line: '#059669'
  },
  {
    card: 'border-sky-300 bg-sky-50',
    chip: 'bg-sky-600 text-white',
    dotOn: 'border-sky-700 bg-sky-600',
    line: '#0284c7'
  },
  {
    card: 'border-indigo-300 bg-indigo-50',
    chip: 'bg-indigo-600 text-white',
    dotOn: 'border-indigo-700 bg-indigo-600',
    line: '#4f46e5'
  },
  {
    card: 'border-amber-300 bg-amber-50',
    chip: 'bg-amber-500 text-white',
    dotOn: 'border-amber-600 bg-amber-500',
    line: '#d97706'
  }
];

const paletteFor = (index: number) => PALETTE[Math.max(index, 0) % PALETTE.length];

// Jarak magnet dari titik tujuan, dalam px. Sentuhan butuh area lebih lebar.
const MAGNET_MOUSE = 30;
const MAGNET_TOUCH = 56;

const dotKey = (dot: Dot) => `${dot.side}:${dot.text}`;

const parseDotKey = (key: string): Dot => {
  const sep = key.indexOf(':');
  return { side: key.slice(0, sep) as Side, text: key.slice(sep + 1) };
};

/** Satu pilihan kanan hanya boleh dipakai satu butir kiri. */
const applyConnection = (current: Record<string, string>, leftText: string, rightText: string) => {
  const next: Record<string, string> = { ...current };
  Object.keys(next).forEach((key) => {
    if (key !== leftText && next[key] === rightText) delete next[key];
  });
  next[leftText] = rightText;
  return next;
};

function hashString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shuffleItems<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = seed || 1;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}

/**
 * Papan menjodohkan gaya "tarik garis": butir soal di kolom kiri, pilihan di
 * kolom kanan (diacak), lalu siswa menghubungkan titik-titiknya.
 */
export const MatchingAnswerBoard: React.FC<MatchingAnswerBoardProps> = ({
  pairs,
  value,
  onChange,
  disabled = false,
  resetKey
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dotRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dragRef = useRef<DragPress | null>(null);
  const selectedRef = useRef<Dot | null>(null);

  const [selected, setSelectedState] = useState<Dot | null>(null);
  const [drag, setDrag] = useState<Dot | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [magnet, setMagnet] = useState<Dot | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [lines, setLines] = useState<DotLine[]>([]);
  const [previewLine, setPreviewLine] = useState<DotLine | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);

  const selectDot = (next: Dot | null) => {
    selectedRef.current = next;
    setSelectedState(next);
  };

  const rightItems = useMemo(() => {
    const unique = Array.from(new Set(pairs.map((pair) => pair.right)));
    const shuffled = shuffleItems(unique, hashString(unique.join('|')));

    // Jangan biarkan urutan kanan sama persis dengan urutan kiri.
    if (shuffled.length > 1 && shuffled.every((item, idx) => item === unique[idx])) {
      return [...shuffled.slice(1), shuffled[0]];
    }
    return shuffled;
  }, [pairs]);

  const totalPairs = pairs.length;
  const connectedCount = pairs.filter((pair) => Boolean(value[pair.left])).length;
  const allConnected = totalPairs > 0 && connectedCount === totalPairs;

  const leftIndexOf = (leftText: string) => pairs.findIndex((pair) => pair.left === leftText);

  const latestRef = useRef({ value, onChange, pairs, disabled });
  useEffect(() => {
    latestRef.current = { value, onChange, pairs, disabled };
  }, [value, onChange, pairs, disabled]);

  const pairSignature = useMemo(
    () => pairs.map((pair) => `${pair.left}\u0000${pair.right}`).join('\u0001'),
    [pairs]
  );

  // Saat soal berganti, buang pilihan, tarikan, dan garis sementara yang tertinggal.
  useEffect(() => {
    dragRef.current = null;
    selectedRef.current = null;
    setSelectedState(null);
    setDrag(null);
    setCursor(null);
    setMagnet(null);
    setHoverKey(null);
    setPreviewLine(null);
  }, [resetKey, pairSignature]);

  const toLocal = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const box = svg.getBoundingClientRect();
    return { x: clientX - box.left, y: clientY - box.top };
  };

  // Titik terdekat di sisi seberang: dipakai untuk magnet saat melepas jari.
  const nearestDot = (clientX: number, clientY: number, from: Side, radius: number): Dot | null => {
    if (radius <= 0) return null;

    let best: Dot | null = null;
    let bestDistance = radius;

    for (const [key, el] of Object.entries(dotRefs.current)) {
      if (!el) continue;
      const dot = parseDotKey(key);
      if (dot.side === from) continue;

      const box = el.getBoundingClientRect();
      const distance = Math.hypot(
        clientX - (box.left + box.width / 2),
        clientY - (box.top + box.height / 2)
      );

      if (distance <= bestDistance) {
        bestDistance = distance;
        best = dot;
      }
    }

    return best;
  };

  const connect = (leftText: string, rightText: string) => {
    onChange(applyConnection(value, leftText, rightText));
  };

  const disconnect = (leftText: string) => {
    const next: Record<string, string> = { ...value };
    delete next[leftText];
    onChange(next);
  };

  // Ukur posisi titik lalu gambar garis penghubung (relatif ke kotak SVG).
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const box = svg.getBoundingClientRect();
    const measured: DotLine[] = [];

    pairs.forEach((pair, index) => {
      const rightText = value[pair.left];
      if (!rightText) return;

      const leftEl = dotRefs.current[`left:${pair.left}`];
      const rightEl = dotRefs.current[`right:${rightText}`];
      if (!leftEl || !rightEl) return;

      const leftBox = leftEl.getBoundingClientRect();
      const rightBox = rightEl.getBoundingClientRect();

      measured.push({
        key: pair.left,
        x1: leftBox.left + leftBox.width / 2 - box.left,
        y1: leftBox.top + leftBox.height / 2 - box.top,
        x2: rightBox.left + rightBox.width / 2 - box.left,
        y2: rightBox.top + rightBox.height / 2 - box.top,
        color: paletteFor(index).line
      });
    });

    setLines(measured);
  }, [pairs, value, layoutTick, rightItems]);

  // Garis putus-putus sementara saat siswa menarik (menempel ke titik magnet).
  useLayoutEffect(() => {
    if (!drag || disabled) {
      setPreviewLine(null);
      return;
    }

    const svg = svgRef.current;
    const sourceEl = dotRefs.current[dotKey(drag)];
    if (!svg || !sourceEl) {
      setPreviewLine(null);
      return;
    }

    const box = svg.getBoundingClientRect();
    const sourceBox = sourceEl.getBoundingClientRect();
    const index =
      drag.side === 'left'
        ? leftIndexOf(drag.text)
        : pairs.findIndex((pair) => pair.right === drag.text);

    const targetEl = magnet ? dotRefs.current[dotKey(magnet)] : null;
    let x2: number;
    let y2: number;

    if (targetEl) {
      const targetBox = targetEl.getBoundingClientRect();
      x2 = targetBox.left + targetBox.width / 2 - box.left;
      y2 = targetBox.top + targetBox.height / 2 - box.top;
    } else if (cursor) {
      x2 = cursor.x;
      y2 = cursor.y;
    } else {
      setPreviewLine(null);
      return;
    }

    setPreviewLine({
      key: 'preview',
      x1: sourceBox.left + sourceBox.width / 2 - box.left,
      y1: sourceBox.top + sourceBox.height / 2 - box.top,
      x2,
      y2,
      color: paletteFor(index).line,
      dashed: true,
      opacity: 0.6
    });
  }, [drag, cursor, magnet, disabled, layoutTick, pairs]);

  // Ukur ulang saat ukuran papan, tiap kartu, atau font berubah.
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;

    const bump = () => setLayoutTick((tick) => tick + 1);
    const observer = new ResizeObserver(bump);

    if (containerRef.current) observer.observe(containerRef.current);
    Object.values(dotRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    window.addEventListener('resize', bump);

    let cancelled = false;
    document.fonts?.ready
      .then(() => {
        if (!cancelled) bump();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener('resize', bump);
    };
  }, [pairs, rightItems]);

  useEffect(() => {
    if (!drag) return;

    const handleMove = (event: PointerEvent) => {
      const press = dragRef.current;
      if (!press || event.pointerId !== press.pointerId) return;

      if (Math.hypot(event.clientX - press.startX, event.clientY - press.startY) > 5) {
        press.moved = true;
      }

      setCursor(toLocal(event.clientX, event.clientY));

      const radius = event.pointerType === 'touch' ? MAGNET_TOUCH : MAGNET_MOUSE;
      const target = nearestDot(event.clientX, event.clientY, press.side, radius);
      setMagnet(target);
      setHoverKey(target ? dotKey(target) : dotKey(press));
    };

    const handleEnd = (event: PointerEvent) => {
      const press = dragRef.current;
      if (!press || event.pointerId !== press.pointerId) return;

      dragRef.current = null;
      setDrag(null);
      setCursor(null);
      setMagnet(null);
      setHoverKey(null);

      const { value: currentValue, onChange: commit } = latestRef.current;
      const releaseRadius = event.pointerType === 'touch' ? MAGNET_TOUCH + 12 : MAGNET_MOUSE;
      const target = press.moved
        ? nearestDot(event.clientX, event.clientY, press.side, releaseRadius)
        : null;

      // Tarik garis: sambungkan ke titik yang menempel.
      if (target) {
        const leftText = press.side === 'left' ? press.text : target.text;
        const rightText = press.side === 'left' ? target.text : press.text;
        commit(applyConnection(currentValue, leftText, rightText));
        selectDot(null);
        return;
      }

      if (press.moved) return;

      // Ketuk tanpa geser: titik kiri lalu titik kanan.
      const tapped: Dot = { side: press.side, text: press.text };
      const previous = selectedRef.current;

      if (!previous) {
        selectDot(tapped);
        return;
      }

      if (previous.side === press.side) {
        selectDot(previous.text === press.text ? null : tapped);
        return;
      }

      const leftText = press.side === 'left' ? press.text : previous.text;
      const rightText = press.side === 'left' ? previous.text : press.text;
      commit(applyConnection(currentValue, leftText, rightText));
      selectDot(null);
    };

    const handleCancel = () => {
      dragRef.current = null;
      setDrag(null);
      setCursor(null);
      setMagnet(null);
      setHoverKey(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleCancel);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleCancel);
    };
  }, [drag, disabled, pairs]);

  if (totalPairs === 0) return null;

  const handleDotPointerDown = (side: Side, text: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || dragRef.current) return;
    event.preventDefault();

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* pointer capture opsional */
    }

    dragRef.current = {
      side,
      text,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };

    setCursor(toLocal(event.clientX, event.clientY));
    setMagnet(null);
    setDrag({ side, text });
    setHoverKey(`${side}:${text}`);
  };

  // Pelepasan jari ditangani di level window (lihat efek pointer di atas), sebab
  // pada layar sentuh pointerup tetap milik titik asal, bukan titik tujuan.
  const handleDotClick = (side: Side, text: string) => (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || event.detail !== 0) return; // hanya aktivasi keyboard

    const tapped: Dot = { side, text };
    const previous = selectedRef.current;

    if (!previous) {
      selectDot(tapped);
      return;
    }

    if (previous.side === side) {
      selectDot(previous.text === text ? null : tapped);
      return;
    }

    const leftText = side === 'left' ? text : previous.text;
    const rightText = side === 'left' ? previous.text : text;
    connect(leftText, rightText);
    selectDot(null);
  };

  const isSource = (side: Side, text: string) =>
    (selected !== null && selected.side === side && selected.text === text) ||
    (drag !== null && drag.side === side && drag.text === text);

  const isMagnet = (side: Side, text: string) =>
    magnet !== null && magnet.side === side && magnet.text === text;

  const rowCount = Math.max(pairs.length, rightItems.length);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start gap-1.5 text-[11px] font-semibold text-slate-600">
          <MousePointer2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
          <span>
            Tarik garis dari titik kiri ke titik kanan; garis akan menempel ke titik terdekat. Bisa juga
            ketuk titik kiri lalu titik kanan.
          </span>
        </div>

        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
            allConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          {connectedCount}/{totalPairs} terhubung
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-4"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.14) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      >
        <svg
          ref={svgRef}
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {lines.map((line) => (
            <line
              key={line.key}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.color}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.9}
            />
          ))}

          {previewLine && (
            <line
              x1={previewLine.x1}
              y1={previewLine.y1}
              x2={previewLine.x2}
              y2={previewLine.y2}
              stroke={previewLine.color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray="7 6"
              opacity={previewLine.opacity ?? 0.6}
            />
          )}
        </svg>

        <div className="relative z-10 grid grid-cols-2 gap-x-9 gap-y-2 sm:gap-x-16 sm:gap-y-2.5">
          {Array.from({ length: rowCount }).map((_, rowIdx) => {
            const pair = pairs[rowIdx];
            const leftText = pair?.left;
            const leftPalette = paletteFor(rowIdx);
            const isLeftConnected = Boolean(leftText && value[leftText]);
            const leftActive = Boolean(leftText) && isSource('left', leftText as string);

            const rightText = rightItems[rowIdx];
            const matchedLeft = rightText
              ? Object.keys(value).find((key) => value[key] === rightText) || null
              : null;
            const rightPalette = paletteFor(matchedLeft ? leftIndexOf(matchedLeft) : 0);
            const rightActive = Boolean(rightText) && isSource('right', rightText as string);
            const rightHovered = Boolean(rightText) && hoverKey === `right:${rightText}`;
            const leftHovered = Boolean(leftText) && hoverKey === `left:${leftText}`;

            return (
              <React.Fragment key={rowIdx}>
                {leftText ? (
                  <div
                    className={`relative flex items-stretch h-full min-h-[46px] sm:min-h-[56px] rounded-xl sm:rounded-2xl border-2 transition-all duration-150 ${
                      isLeftConnected ? leftPalette.card : 'border-slate-200 bg-slate-50'
                    } ${
                      leftActive
                        ? 'ring-2 ring-teal-400 ring-offset-1'
                        : leftHovered
                        ? 'ring-2 ring-teal-300 ring-offset-1'
                        : ''
                    }`}
                  >
                    <span
                      className={`w-7 sm:w-9 shrink-0 flex items-center justify-center rounded-l-[9px] sm:rounded-l-[13px] font-black text-[10px] sm:text-xs tracking-tight ${
                        isLeftConnected ? leftPalette.chip : 'bg-slate-300 text-slate-700'
                      }`}
                    >
                      {String(rowIdx + 1).padStart(2, '0')}
                    </span>

                    <span className="flex-1 min-w-0 self-center py-2 pl-1.5 pr-3 sm:pr-4 text-[11px] sm:text-[13px] font-bold leading-snug text-slate-800">
                      {leftText}
                    </span>

                    {isLeftConnected && !disabled && (
                      <button
                        type="button"
                        onClick={() => disconnect(leftText)}
                        className="absolute -top-2 -right-2 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                        title="Putuskan pasangan ini"
                        aria-label={`Putuskan pasangan ${leftText}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}

                    <button
                      type="button"
                      ref={(el) => {
                        dotRefs.current[`left:${leftText}`] = el;
                      }}
                      onPointerDown={handleDotPointerDown('left', leftText)}
                      onClick={handleDotClick('left', leftText)}
                      onPointerEnter={() => setHoverKey(`left:${leftText}`)}
                      onPointerLeave={() => setHoverKey(null)}
                      disabled={disabled}
                      aria-label={`Titik hubung ${leftText}`}
                      className={`absolute top-1/2 right-0 z-10 h-4 w-4 sm:h-4 sm:w-4 -translate-y-1/2 translate-x-1/2 touch-none rounded-full border-2 shadow-sm transition-transform cursor-pointer before:absolute before:-inset-2.5 before:content-[''] before:rounded-full ${
                        isLeftConnected ? leftPalette.dotOn : 'border-slate-400 bg-white hover:border-teal-500'
                      } ${isSource('left', leftText) ? 'scale-125 ring-4 ring-teal-300/60' : ''} ${
                        isMagnet('left', leftText) ? 'scale-150 ring-4 ring-teal-400/70 shadow-teal-500/40' : ''
                      }`}
                    />
                  </div>
                ) : (
                  <div />
                )}

                {rightText ? (
                  <div
                    className={`relative flex items-stretch h-full min-h-[46px] sm:min-h-[56px] rounded-xl sm:rounded-2xl border-2 transition-all duration-150 ${
                      matchedLeft ? rightPalette.card : 'border-slate-200 bg-white'
                    } ${
                      rightActive
                        ? 'ring-2 ring-teal-400 ring-offset-1'
                        : rightHovered
                        ? 'ring-2 ring-teal-300 ring-offset-1'
                        : ''
                    }`}
                  >
                    <button
                      type="button"
                      ref={(el) => {
                        dotRefs.current[`right:${rightText}`] = el;
                      }}
                      onPointerDown={handleDotPointerDown('right', rightText)}
                      onClick={handleDotClick('right', rightText)}
                      onPointerEnter={() => setHoverKey(`right:${rightText}`)}
                      onPointerLeave={() => setHoverKey(null)}
                      disabled={disabled}
                      aria-label={`Titik hubung ${rightText}`}
                      className={`absolute top-1/2 left-0 z-10 h-4 w-4 sm:h-4 sm:w-4 -translate-y-1/2 -translate-x-1/2 touch-none rounded-full border-2 shadow-sm transition-transform cursor-pointer before:absolute before:-inset-2.5 before:content-[''] before:rounded-full ${
                        matchedLeft ? rightPalette.dotOn : 'border-slate-400 bg-white hover:bg-teal-50'
                      } ${isSource('right', rightText) ? 'scale-125 ring-4 ring-teal-300/60' : ''} ${
                        isMagnet('right', rightText) ? 'scale-150 ring-4 ring-teal-400/70 shadow-teal-500/40' : ''
                      }`}
                    />

                    <span className="flex-1 min-w-0 self-center py-2 pl-3.5 pr-1.5 text-[11px] sm:text-[13px] font-bold leading-snug text-slate-800">
                      {rightText}
                    </span>

                    {matchedLeft && (
                      <span className="self-center pr-2 text-slate-400" title="Sudah dihubungkan">
                        <Link2 className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                ) : (
                  <div />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
