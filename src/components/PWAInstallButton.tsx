import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition cursor-pointer"
      >
        <Download className="w-4 h-4" />
        Install Aplikasi
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-xl border border-teal-200 dark:border-teal-800 px-4 py-2 text-xs font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950 transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Install di iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Install di iPhone / iPad</h3>
                <button onClick={() => setShowIOSGuide(false)} className="cursor-pointer text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5"/>
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                1. Tap tombol <strong>Share</strong> di toolbar Safari.<br />
                2. Scroll ke bawah dan tap <strong>Add to Home Screen</strong>.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
