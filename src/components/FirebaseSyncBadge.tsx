import React, { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, RefreshCw, AlertCircle, Database, ShieldCheck } from 'lucide-react';
import {
  subscribeToSyncState,
  FirebaseSyncState
} from '../services/firebaseSync.js';
import firebaseConfig from '../../firebase-applet-config.json';

export const FirebaseSyncBadge: React.FC = () => {
  const [syncState, setSyncState] = useState<FirebaseSyncState>({
    isConnected: true,
    isSyncing: false,
    lastSyncedAt: null,
    error: null
  });
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeToSyncState((state) => {
      setSyncState(state);
    });
    return unsub;
  }, []);

  const timeString = syncState.lastSyncedAt
    ? syncState.lastSyncedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Aktif';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setDetailsOpen(!detailsOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border shadow-xs bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 cursor-pointer"
        title="Status Firebase Realtime Memory"
      >
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            syncState.isSyncing ? 'bg-amber-400' : 'bg-emerald-400'
          }`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            syncState.isSyncing ? 'bg-amber-500' : 'bg-emerald-500'
          }`} />
        </span>
        <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="hidden sm:inline">Firebase Live</span>
        {syncState.isSyncing ? (
          <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-600 dark:text-amber-400" />
        ) : (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal hidden lg:inline">
            ({timeString})
          </span>
        )}
      </button>

      {/* Popover Detail Modal */}
      {detailsOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDetailsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 z-50 text-xs animate-in fade-in zoom-in-95 transition-colors">
            <div className="flex items-start justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Firebase Firestore Realtime</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Memori & State Tersinkronisasi Otomatis</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                Online
              </span>
            </div>

            <div className="space-y-2 mb-3 text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70">
                <span className="text-slate-500 dark:text-slate-400">Project ID:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{firebaseConfig.projectId}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70">
                <span className="text-slate-500 dark:text-slate-400">Wilayah / Region:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">asia-southeast1</span>
              </div>
              <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70">
                <span className="text-slate-500 dark:text-slate-400">Sinkronisasi Terakhir:</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">{timeString}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900 text-[11px] text-teal-800 dark:text-teal-300 space-y-1 mb-3">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Koneksi Realtime Aktif:</span>
              </div>
              <p className="text-[10px] text-teal-700 dark:text-teal-400/90 leading-relaxed">
                Setiap naskah kuis guru baru, hasil ekstraksi dokumen AI, dan lembar jawaban siswa yang disubmit akan langsung ter-upload ke Firestore secara instan tanpa perlu refresh manual.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setDetailsOpen(false);
              }}
              className="w-full py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </>
      )}
    </div>
  );
};
