import React, { useState, useEffect, useRef } from 'react';
import { 
  Sun, 
  Moon, 
  Type, 
  RotateCcw, 
  X, 
  Check, 
  Eye, 
  Minus, 
  Plus,
  Sliders
} from 'lucide-react';

export const AccessibilityFloatingWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('awanglong_theme');
      if (savedTheme) return savedTheme === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [fontScale, setFontScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedScale = localStorage.getItem('awanglong_font_size');
      if (savedScale) {
        const parsed = parseInt(savedScale, 10);
        if (!isNaN(parsed) && parsed >= 80 && parsed <= 140) {
          return parsed;
        }
      }
    }
    return 100;
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('awanglong_high_contrast') === 'true';
    }
    return false;
  });

  // Drag and Docking states
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDocked, setIsDocked] = useState(true); // Default docked in corner for clean look
  const [dockCorner, setDockCorner] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right');
  
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number }>({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasDraggedRef = useRef(false);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Auto hide back to corner after 3 seconds if undocked and panel closed
  useEffect(() => {
    if (!isDocked && !isOpen && !isDragging) {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = setTimeout(() => {
        setIsDocked(true);
      }, 3000);
    }
    return () => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, [isDocked, isOpen, isDragging]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('awanglong_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('awanglong_theme', 'light');
    }
  }, [isDark]);

  // Apply font scale
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${fontScale}%`;
    localStorage.setItem('awanglong_font_size', fontScale.toString());
  }, [fontScale]);

  // Apply high contrast
  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add('high-contrast');
      localStorage.setItem('awanglong_high_contrast', 'true');
    } else {
      root.classList.remove('high-contrast');
      localStorage.setItem('awanglong_high_contrast', 'false');
    }
  }, [highContrast]);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Drag handlers
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    hasDraggedRef.current = false;
    setIsDragging(true);
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);

    dragStartRef.current = {
      x: clientX,
      y: clientY,
      posX: pos?.x ?? rect.left,
      posY: pos?.y ?? rect.top
    };
  };

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasDraggedRef.current = true;
        if (isDocked) setIsDocked(false);
      }

      const newX = Math.max(10, Math.min(window.innerWidth - 60, dragStartRef.current.posX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 60, dragStartRef.current.posY + dy));

      setPos({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      if (!isDragging) return;
      setIsDragging(false);

      if (pos) {
        const threshold = 120;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        let corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right';
        let shouldDock = false;

        if (pos.x < threshold && pos.y < threshold) {
          corner = 'top-left';
          shouldDock = true;
        } else if (pos.x > screenW - threshold - 60 && pos.y < threshold) {
          corner = 'top-right';
          shouldDock = true;
        } else if (pos.x < threshold && pos.y > screenH - threshold - 60) {
          corner = 'bottom-left';
          shouldDock = true;
        } else if (pos.x > screenW - threshold - 60 && pos.y > screenH - threshold - 60) {
          corner = 'bottom-right';
          shouldDock = true;
        }

        if (shouldDock) {
          setIsDocked(true);
          setDockCorner(corner);
          setPos(null);
          setIsOpen(false);
        }
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove);
      window.addEventListener('touchend', handlePointerUp);
    }

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, pos, isDocked]);

  const handleButtonClick = () => {
    if (hasDraggedRef.current) return; // Ignore click if we just finished dragging

    if (isDocked) {
      setIsDocked(false);
      // Un-tuck and float near the corner
      if (dockCorner === 'bottom-right') setPos({ x: window.innerWidth - 80, y: window.innerHeight - 150 });
      else if (dockCorner === 'bottom-left') setPos({ x: 20, y: window.innerHeight - 150 });
      else if (dockCorner === 'top-right') setPos({ x: window.innerWidth - 80, y: 20 });
      else setPos({ x: 20, y: 20 });
      setIsOpen(true);
    } else {
      setIsOpen((prev) => !prev);
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    }
  };

  const handleReset = () => {
    setIsDark(false);
    setFontScale(100);
    setHighContrast(false);
  };

  const getFontScaleLabel = (scale: number) => {
    if (scale <= 85) return 'Kecil (85%)';
    if (scale <= 95) return 'Sedikit Kecil (90%)';
    if (scale === 100) return 'Standar (100%)';
    if (scale <= 110) return 'Sedang (110%)';
    if (scale <= 120) return 'Besar (120%)';
    if (scale <= 130) return 'Ekstra Besar (130%)';
    return 'Maksimal (140%)';
  };

  // Determine container positioning classes / styles
  let containerClassName = "fixed z-50 transition-all duration-300";
  let style: React.CSSProperties = {};

  if (isDocked) {
    switch (dockCorner) {
      case 'bottom-right':
        containerClassName += " bottom-4 right-4 translate-x-2 translate-y-2 opacity-50 hover:opacity-100";
        break;
      case 'bottom-left':
        containerClassName += " bottom-4 left-4 -translate-x-2 translate-y-2 opacity-50 hover:opacity-100";
        break;
      case 'top-right':
        containerClassName += " top-4 right-4 translate-x-2 -translate-y-2 opacity-50 hover:opacity-100";
        break;
      case 'top-left':
        containerClassName += " top-4 left-4 -translate-x-2 -translate-y-2 opacity-50 hover:opacity-100";
        break;
    }
  } else if (pos) {
    style = { left: `${pos.x}px`, top: `${pos.y}px` };
  } else {
    // Default floating position (above bottom navbar on mobile)
    containerClassName += " bottom-28 right-4 sm:bottom-6 sm:right-6";
  }

  return (
    <aside aria-label="Menu Aksesibilitas dan Tampilan" className={containerClassName} style={style}>
      {/* Floating & Draggable Trigger Button - Icon Only */}
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onClick={handleButtonClick}
        aria-expanded={isOpen}
        aria-controls="accessibility-panel"
        aria-label="Buka Pengaturan Aksesibilitas dan Ukuran Font"
        className="group relative flex items-center justify-center p-3.5 rounded-full bg-gradient-to-r from-teal-700 via-teal-800 to-cyan-900 text-white shadow-xl hover:shadow-teal-500/25 hover:scale-110 active:scale-95 transition-transform duration-200 border border-teal-400/40 focus:outline-none focus:ring-4 focus:ring-teal-400/40 cursor-grab active:cursor-grabbing select-none"
        title="Geser atau Klik untuk Aksesibilitas"
      >
        <span className="relative flex items-center justify-center w-5 h-5 pointer-events-none">
          {isDark ? (
            <Moon className="w-5 h-5 text-amber-300 transition-transform group-hover:rotate-12" />
          ) : (
            <Sliders className="w-5 h-5 text-emerald-300 transition-transform group-hover:rotate-45" />
          )}
          {/* Active indicator dot */}
          {(isDark || fontScale !== 100 || highContrast) && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-teal-900" title="Pengaturan Aktif" />
          )}
        </span>
      </button>

      {/* Centered Modal Popover Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            ref={panelRef}
            id="accessibility-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="acc-panel-title"
            className="w-full max-w-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200"
          >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 id="acc-panel-title" className="font-bold text-sm sm:text-base leading-tight">
                  Aksesibilitas & Tampilan
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sesuaikan kenyamanan visual dan ukuran teks
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Tutup menu aksesibilitas"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section 1: Dark Mode / Light Mode Switch */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Tema Tampilan:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsDark(false)}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  !isDark
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs ring-1 ring-amber-400/50'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Sun className={`w-4 h-4 ${!isDark ? 'text-amber-600 animate-spin-slow' : 'text-slate-400'}`} />
                <span>Mode Terang</span>
                {!isDark && <Check className="w-3.5 h-3.5 text-amber-600 ml-auto" />}
              </button>

              <button
                type="button"
                onClick={() => setIsDark(true)}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-indigo-950/80 border-indigo-700 text-indigo-200 shadow-xs ring-1 ring-indigo-500/50'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Moon className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>Mode Gelap</span>
                {isDark && <Check className="w-3.5 h-3.5 text-indigo-400 ml-auto" />}
              </button>
            </div>
          </div>

          {/* Section 2: Font Size Slider */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <label htmlFor="font-size-slider" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Ukuran Seluruh Font:</span>
              </label>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {getFontScaleLabel(fontScale)}
              </span>
            </div>

            {/* Slider with step buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFontScale((prev) => Math.max(80, prev - 5))}
                disabled={fontScale <= 80}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                aria-label="Perkecil ukuran font"
                title="Perkecil font (A-)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <div className="flex-1 px-1">
                <input
                  id="font-size-slider"
                  type="range"
                  min="80"
                  max="140"
                  step="5"
                  value={fontScale}
                  onChange={(e) => setFontScale(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600 dark:accent-teal-400 focus:outline-none"
                  aria-label="Slider ukuran font aplikasi"
                />
                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  <span>80%</span>
                  <span className="font-semibold text-teal-600 dark:text-teal-400">100% (Normal)</span>
                  <span>140%</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFontScale((prev) => Math.min(140, prev + 5))}
                disabled={fontScale >= 140}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                aria-label="Perbesar ukuran font"
                title="Perbesar font (A+)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick preset buttons */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { label: 'Kecil', val: 85 },
                { label: 'Normal', val: 100 },
                { label: 'Besar', val: 115 },
                { label: 'Ekstra', val: 130 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setFontScale(preset.val)}
                  className={`py-1 px-2 rounded-lg text-[11px] font-medium border text-center transition-all cursor-pointer ${
                    fontScale === preset.val
                      ? 'bg-teal-600 text-white border-teal-600 font-bold shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Live font preview card */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
                Pratinjau Teks:
              </span>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-snug">
                Soal Kuis: &quot;Berapakah hasil dari 15 × 8?&quot;
              </p>
            </div>
          </div>

          {/* Section 3: High Contrast Option */}
          <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <div>
                  <span className="text-xs font-semibold block">Kontras Tajam</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Tingkatkan kontras warna teks</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
              />
            </label>
          </div>

          {/* Footer Reset */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Standar (100%)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Terapkan
            </button>
          </div>
          </div>
        </div>
      )}
    </aside>
  );
};
