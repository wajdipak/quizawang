import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link2, MousePointer2, X } from 'lucide-react';
import { MatchingPair } from '../types/quiz.js';

interface MatchingAnswerBoardProps {
  pairs: MatchingPair[];
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  disabled?: boolean;
}

type Side = 'left' | 'right';

interface Dot {
  side: Side;
  text: string;
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
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dotRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [selected, setSelected] = useState<Dot | null>(null);
  const [drag, setDrag] = useState<Dot | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [hoverDot, setHoverDot] = useState<string | null>(null);
  const [lines, setLines] = useState<DotLine[]>([]);
  const [previewLine, setPreviewLine] = useState<DotLine | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);

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

  const connect = (leftText: string, rightText: string) => {
    const next: Record<string, string> = { ...value };
    // Satu pilihan kanan hanya boleh dipakai satu butir kiri.
    Object.keys(next).forEach((key) => {
      if (key !== leftText && next[key] === rightText) delete next[key];
    });
    next[leftText] = rightText;
    onChange(next);
  };

  const disconnect = (leftText: string) => {
    const next: Record<string, string> = { ...value };
    delete next[leftText];
    onChange(next);
  };

  // Ukur posisi titik lalu gambar garis penghubung.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const measured: DotLine[] = [];

    pairs.forEach((pair, index) => {
      const rightText = value[pair.left];
      if (!rightText) return;

      const leftEl = dotRefs.current[`left:${pair.left}`];
      const rightEl = dotRefs.current[`right:${rightText}`];
      if (!leftEl || !rightEl) return;

      const leftRect = leftEl.getBoundingClientRect();
      const rightRect = rightEl.getBoundingClientRect();

      measured.push({
        key: pair.left,
        x1: leftRect.left + leftRect.width / 2 - containerRect.left,
        y1: leftRect.top + leftRect.height / 2 - containerRect.top,
        x2: rightRect.left + rightRect.width / 2 - containerRect.left,
        y2: rightRect.top + rightRect.height / 2 - containerRect.top,
        color: paletteFor(index).line
      });
    });

    setLines(measured);
  }, [pairs, value, layoutTick, rightItems]);

  // Garis putus-putus sementara saat siswa menarik.
  useLayoutEffect(() => {
    if (!drag || !cursor || disabled) {
      setPreviewLine(null);
      return;
    }

    const container = containerRef.current;
    const sourceEl = dotRefs.current[`${drag.side}:${drag.text}`];
    if (!container || !sourceEl) {
      setPreviewLine(null);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const sourceRect = sourceEl.getBoundingClientRect();
    const index =
      drag.side === 'left'
        ? leftIndexOf(drag.text)
        : pairs.findIndex((pair) => pair.right === drag.text);

    setPreviewLine({
      key: 'preview',
      x1: sourceRect.left + sourceRect.width / 2 - containerRect.left,
      y1: sourceRect.top + sourceRect.height / 2 - containerRect.top,
      x2: cursor.x,
      y2: cursor.y,
      color: paletteFor(index).line,
      dashed: true,
      opacity: 0.6
    });
  }, [drag, cursor, disabled, layoutTick, pairs]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => setLayoutTick((tick) => tick + 1));
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!drag) return;

    const handleMove = (event: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setCursor({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    };

    const handleEnd = () => {
      setDrag(null);
      setCursor(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
    };
  }, [drag]);

  if (totalPairs === 0) return null;

  const handleDotPointerDown = (side: Side, text: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      setCursor({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    }
    setDrag({ side, text });
  };

  const handleDotPointerUp = (side: Side, text: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    event.stopPropagation();

    if (drag && drag.side !== side) {
      const leftText = drag.side === 'left' ? drag.text : text;
      const rightText = drag.side === 'left' ? text : drag.text;
      connect(leftText, rightText);
      setSelected(null);
    }

    setDrag(null);
    setCursor(null);
  };

  const handleDotClick = (side: Side, text: string) => () => {
    if (disabled) return;

    if (!selected) {
      setSelected({ side, text });
      return;
    }

    if (selected.side === side) {
      setSelected(selected.text === text ? null : { side, text });
      return;
    }

    const leftText = side === 'left' ? text : selected.text;
    const rightText = side === 'left' ? selected.text : text;
    connect(leftText, rightText);
    setSelected(null);
  };

  const isSource = (side: Side, text: string) =>
    (selected !== null && selected.side === side && selected.text === text) ||
    (drag !== null && drag.side === side && drag.text === text);

  const rowCount = Math.max(pairs.length, rightItems.length);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start gap-1.5 text-[11px] font-semibold text-slate-600">
          <MousePointer2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
          <span>Tarik garis dari titik kiri ke titik kanan. Bisa juga klik titik kiri lalu titik kanan.</span>
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
            const rightHovered = Boolean(rightText) && hoverDot === `right:${rightText}` && drag?.side === 'left';
            const leftHovered = Boolean(leftText) && hoverDot === `left:${leftText}` && drag?.side === 'right';

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
                      onPointerUp={handleDotPointerUp('left', leftText)}
                      onClick={handleDotClick('left', leftText)}
                      onPointerEnter={() => setHoverDot(`left:${leftText}`)}
                      onPointerLeave={() => setHoverDot(null)}
                      disabled={disabled}
                      aria-label={`Titik hubung ${leftText}`}
                      className={`absolute top-1/2 right-0 z-10 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 translate-x-1/2 touch-none rounded-full border-2 shadow-sm transition-transform cursor-pointer ${
                        isLeftConnected ? leftPalette.dotOn : 'border-slate-400 bg-white hover:border-teal-500'
                      } ${isSource('left', leftText) ? 'scale-125 ring-4 ring-teal-300/60' : ''}`}
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
                      onPointerUp={handleDotPointerUp('right', rightText)}
                      onClick={handleDotClick('right', rightText)}
                      onPointerEnter={() => setHoverDot(`right:${rightText}`)}
                      onPointerLeave={() => setHoverDot(null)}
                      disabled={disabled}
                      aria-label={`Titik hubung ${rightText}`}
                      className={`absolute top-1/2 left-0 z-10 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 -translate-x-1/2 touch-none rounded-full border-2 shadow-sm transition-transform cursor-pointer ${
                        matchedLeft ? rightPalette.dotOn : 'border-slate-400 bg-white hover:border-teal-500'
                      } ${isSource('right', rightText) ? 'scale-125 ring-4 ring-teal-300/60' : ''}`}
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
