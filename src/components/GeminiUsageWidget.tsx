import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Clock,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  BarChart3,
  HelpCircle,
  Layers
} from 'lucide-react';

export interface GeminiUsageData {
  configured: boolean;
  status: 'healthy' | 'warning' | 'rate_limited';
  statusMessage: string;
  limits: {
    rpm: number;
    rpd: number;
    tpm: number;
  };
  usage: {
    requestsThisMinute: number;
    remainingMinute: number;
    secondsToMinuteReset: number;
    requestsToday: number;
    remainingDaily: number;
    dailyResetCountdown: string;
  };
  models: {
    primary: string;
    fallbacks: string[];
    strategy: string;
  };
  lastCall?: {
    model: string;
    action: string;
    status: string;
    time: string;
  } | null;
}

interface Props {
  variant?: 'banner' | 'card';
  compact?: boolean;
  onRefresh?: () => void;
}

export const GeminiUsageWidget: React.FC<Props> = ({
  variant = 'banner',
  compact = false,
  onRefresh
}) => {
  const [data, setData] = useState<GeminiUsageData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/gemini-usage');
      if (res.ok) {
        const json: GeminiUsageData = await res.json();
        setData(json);
        setCountdown(json.usage.secondsToMinuteReset || 0);
      }
    } catch (err) {
      console.warn('Gagal memuat status kuota Gemini:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
    // Poll every 12 seconds
    const interval = setInterval(fetchUsage, 12000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  // Local ticker for second-by-second countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleManualRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchUsage();
    if (onRefresh) onRefresh();
  };

  if (!data && loading) {
    return (
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center justify-between animate-pulse">
        <span className="flex items-center gap-2">
          <RotateCw className="w-3.5 h-3.5 animate-spin text-teal-500" />
          Memeriksa kuota & batas penggunaan Gemini API...
        </span>
      </div>
    );
  }

  if (!data) return null;

  const rpmPercent = Math.min(100, Math.round((data.usage.requestsThisMinute / data.limits.rpm) * 100));
  const rpdPercent = Math.min(100, Math.round((data.usage.requestsToday / data.limits.rpd) * 100));

  const isHealthy = data.status === 'healthy';
  const isWarning = data.status === 'warning';
  const isLimited = data.status === 'rate_limited';

  const statusColor = isLimited
    ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800'
    : isWarning
    ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800'
    : 'text-teal-800 dark:text-teal-200 bg-teal-100/80 dark:bg-teal-900/50 border-teal-300 dark:border-teal-700';

  if (variant === 'banner') {
    return (
      <div className="rounded-2xl border border-teal-200/80 dark:border-teal-900/60 bg-gradient-to-r from-teal-50/90 via-cyan-50/50 to-emerald-50/80 dark:from-slate-900 dark:via-teal-950/30 dark:to-slate-900 shadow-xs overflow-hidden transition-all text-slate-800 dark:text-slate-100">
        {/* Banner Top Row */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-teal-100/40 dark:hover:bg-teal-950/40 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 dark:bg-teal-400/15 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold shrink-0 border border-teal-300/40 dark:border-teal-700/40 shadow-2xs">
              <Zap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs flex items-center gap-1.5 text-teal-950 dark:text-teal-100">
                  Status Kuota Gemini AI:
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${statusColor}`}>
                  {isLimited ? 'Batas Tercapai (Jeda Menit)' : isWarning ? 'Mendekati Batas' : 'Siap & Prima'}
                </span>
              </div>
              <p className="text-[11px] text-teal-900/70 dark:text-slate-300 truncate">
                {countdown > 0
                  ? `Jeda pulih dalam ${countdown} dtk • Sisa menit ini: ${data.usage.remainingMinute}/${data.limits.rpm} req`
                  : `Tersedia ${data.usage.remainingMinute}/${data.limits.rpm} req/mnt • Sisa kuota hari ini: ${data.usage.remainingDaily.toLocaleString('id-ID')} kuis`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleManualRefresh}
              title="Perbarui status kuota"
              className="p-1.5 rounded-lg text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-100 hover:bg-teal-100/70 dark:hover:bg-teal-900/60 transition-colors cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-500' : ''}`} />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-100 transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Details */}
        {isExpanded && (
          <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-1 border-t border-teal-100/80 dark:border-teal-900/50 bg-teal-50/30 dark:bg-slate-950/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {/* RPM Bar */}
              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-teal-100 dark:border-teal-900/50 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                  <span className="text-teal-900 dark:text-teal-200 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                    Batas Menit (RPM):
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {data.usage.requestsThisMinute} / {data.limits.rpm}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      rpmPercent >= 90 ? 'bg-rose-500' : rpmPercent >= 70 ? 'bg-amber-500' : 'bg-teal-500'
                    }`}
                    style={{ width: `${rpmPercent}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>Sisa: {data.usage.remainingMinute} permintaan</span>
                  <span>{countdown > 0 ? `Reset dalam ${countdown}s` : 'Status Fresh'}</span>
                </div>
              </div>

              {/* RPD Bar */}
              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-teal-100 dark:border-teal-900/50 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                  <span className="text-teal-900 dark:text-teal-200 flex items-center gap-1">
                    <BarChart3 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Batas Harian (RPD):
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {data.usage.requestsToday} / {data.limits.rpd}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      rpdPercent >= 90 ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(rpdPercent, 2)}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>Sisa: ~{data.usage.remainingDaily.toLocaleString('id-ID')} kuis</span>
                  <span>Reset: {data.usage.dailyResetCountdown}</span>
                </div>
              </div>
            </div>

            {/* Model & Failover Info */}
            <div className="p-2.5 rounded-xl bg-teal-100/50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800/80 text-[11px] space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-teal-950 dark:text-teal-200">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Ketahanan AI & Multi-Model Failover Aktif</span>
              </div>
              <p className="text-teal-900/80 dark:text-teal-300 text-[10px] leading-relaxed">
                Aplikasi menggunakan model <strong>{data.models.primary}</strong>. Apabila server Gemini pusat mengalami antrean (error 503 high demand), sistem otomatis beralih mulus ke <strong>{data.models.fallbacks.join(' & ')}</strong> sehingga kuis tetap dapat dibuat tanpa terputus.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Card Variant
  return (
    <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-teal-200/80 dark:border-teal-900/60 bg-white dark:bg-slate-900 shadow-sm space-y-4 transition-colors">
      <div className="flex items-center justify-between border-b border-teal-100/70 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/15 dark:bg-teal-400/15 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold border border-teal-300/40 dark:border-teal-700/40 shadow-2xs">
            <Zap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-teal-950 dark:text-teal-100">
              Penggunaan & Batas API Key Gemini
            </h3>
            <p className="text-[11px] text-teal-900/70 dark:text-slate-400">
              Pemantauan kuota real-time untuk ekstraksi dokumen dan pembuatan kuis.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs flex items-center gap-1"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-500' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* RPM Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-500" />
              Batas Menit (RPM)
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {data.usage.requestsThisMinute} / {data.limits.rpm}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                rpmPercent >= 90 ? 'bg-rose-500' : rpmPercent >= 70 ? 'bg-amber-500' : 'bg-teal-500'
              }`}
              style={{ width: `${rpmPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Sisa: {data.usage.remainingMinute} permintaan</span>
            <span className="font-semibold text-teal-600 dark:text-teal-400">
              {countdown > 0 ? `Reset: ${countdown} detik` : 'Siap digunakan'}
            </span>
          </div>
        </div>

        {/* RPD Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
              Batas Harian (RPD)
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {data.usage.requestsToday} / {data.limits.rpd}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.max(rpdPercent, 2)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Sisa Kuota: ~{data.usage.remainingDaily.toLocaleString('id-ID')} kuis</span>
            <span>Reset: {data.usage.dailyResetCountdown}</span>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            Model: {data.models.primary} (Failover: {data.models.fallbacks.join(', ')})
          </span>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Tier: Standar AI Studio (Gratis 1,500 RPD)
        </span>
      </div>
    </div>
  );
};
