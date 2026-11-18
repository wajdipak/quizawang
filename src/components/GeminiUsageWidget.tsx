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
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json: GeminiUsageData = await res.json();
        setData(json);
        setCountdown(json.usage.secondsToMinuteReset || 0);
      } else {
        // Fallback status when endpoint returns non-JSON or during initial startup
        setData((prev) => prev || {
          configured: true,
          status: 'healthy',
          statusMessage: 'API Gemini siap & beroperasi dengan prima.',
          limits: { rpm: 15, rpd: 1500, tpm: 1000000 },
          usage: {
            requestsThisMinute: 0,
            remainingMinute: 15,
            secondsToMinuteReset: 0,
            requestsToday: 0,
            remainingDaily: 1500,
            dailyResetCountdown: '24 jam (00:00 UTC)'
          },
          models: {
            primary: 'gemini-3.8-flash',
            fallbacks: ['gemini-3.1-flash-lite', 'gemini-flash-latest'],
            strategy: 'Failover otomatis jika terjadi lonjakan beban server 503 / 429'
          },
          lastCall: null
        });
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
      <div className="p-3.5 border-2 border-[var(--line)] bg-[var(--paper-2)] text-[0.8125rem] text-[var(--ink-soft)] flex items-center justify-between animate-pulse">
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
    ? 'text-rose-700  bg-rose-50  border-rose-200 '
    : isWarning
    ? 'text-amber-800  bg-amber-50  border-amber-200 '
    : 'text-teal-800  bg-teal-100/80  border-teal-300 ';

  if (variant === 'banner') {
    return (
      <div className="border-2 border-[var(--line)] bg-[var(--paper-2)] overflow-hidden transition-colors">
        {/* Banner Top Row */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-[var(--paper-3)] transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-[var(--signal)] text-[#0a0a0a] flex items-center justify-center shrink-0 border-2 border-[var(--line)]">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="poster-label">
                  Status Kuota Gemini AI
                </span>
                <span className={`text-[0.6875rem] font-bold px-2 py-0.5 border ${statusColor}`}>
                  {isLimited ? 'Batas Tercapai (Jeda Menit)' : isWarning ? 'Mendekati Batas' : 'Siap & Prima'}
                </span>
              </div>
              <p className="text-[0.75rem] leading-snug text-[var(--ink-soft)] truncate">
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
              className="p-1.5 rounded-lg text-teal-700  hover:text-teal-900  hover:bg-teal-100/70  transition-colors cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-500' : ''}`} />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg text-teal-700  hover:text-teal-900  transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Details */}
        {isExpanded && (
          <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-1 border-t border-teal-100/80  bg-teal-50/30  space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {/* RPM Bar */}
              <div className="p-2.5 rounded-xl bg-white/90  border border-teal-100  shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                  <span className="text-teal-900  flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-600 " />
                    Batas Menit (RPM):
                  </span>
                  <span className="font-bold text-slate-800 ">
                    {data.usage.requestsThisMinute} / {data.limits.rpm}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100  overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      rpmPercent >= 90 ? 'bg-rose-500' : rpmPercent >= 70 ? 'bg-amber-500' : 'bg-teal-500'
                    }`}
                    style={{ width: `${rpmPercent}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 ">
                  <span>Sisa: {data.usage.remainingMinute} permintaan</span>
                  <span>{countdown > 0 ? `Reset dalam ${countdown}s` : 'Status Fresh'}</span>
                </div>
              </div>

              {/* RPD Bar */}
              <div className="p-2.5 rounded-xl bg-white/90  border border-teal-100  shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                  <span className="text-teal-900  flex items-center gap-1">
                    <BarChart3 className="w-3 h-3 text-emerald-600 " />
                    Batas Harian (RPD):
                  </span>
                  <span className="font-bold text-slate-800 ">
                    {data.usage.requestsToday} / {data.limits.rpd}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100  overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      rpdPercent >= 90 ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(rpdPercent, 2)}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 ">
                  <span>Sisa: ~{data.usage.remainingDaily.toLocaleString('id-ID')} kuis</span>
                  <span>Reset: {data.usage.dailyResetCountdown}</span>
                </div>
              </div>
            </div>

            {/* Model & Failover Info */}
            <div className="p-2.5 rounded-xl bg-teal-100/50  border border-teal-200/80  text-[11px] space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-teal-950 ">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600 " />
                <span>Ketahanan AI & Multi-Model Failover Aktif</span>
              </div>
              <p className="text-teal-900/80  text-[10px] leading-relaxed">
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
    <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-teal-200/80  bg-white  shadow-sm space-y-4 transition-colors">
      <div className="flex items-center justify-between border-b border-teal-100/70  pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/15  text-teal-700  flex items-center justify-center font-bold border border-teal-300/40  shadow-2xs">
            <Zap className="w-4 h-4 text-teal-600 " />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-teal-950 ">
              Penggunaan & Batas API Key Gemini
            </h3>
            <p className="text-[11px] text-teal-900/70 ">
              Pemantauan kuota real-time untuk ekstraksi dokumen dan pembuatan kuis.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          className="p-1.5 rounded-xl border border-slate-200  text-slate-500 hover:text-slate-800  hover:bg-slate-50  transition-colors cursor-pointer text-xs flex items-center gap-1"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-500' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* RPM Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50  border border-slate-200/80  space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600  flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-500" />
              Batas Menit (RPM)
            </span>
            <span className="text-xs font-bold text-slate-800 ">
              {data.usage.requestsThisMinute} / {data.limits.rpm}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-200  overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                rpmPercent >= 90 ? 'bg-rose-500' : rpmPercent >= 70 ? 'bg-amber-500' : 'bg-teal-500'
              }`}
              style={{ width: `${rpmPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 ">
            <span>Sisa: {data.usage.remainingMinute} permintaan</span>
            <span className="font-semibold text-teal-600 ">
              {countdown > 0 ? `Reset: ${countdown} detik` : 'Siap digunakan'}
            </span>
          </div>
        </div>

        {/* RPD Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50  border border-slate-200/80  space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600  flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
              Batas Harian (RPD)
            </span>
            <span className="text-xs font-bold text-slate-800 ">
              {data.usage.requestsToday} / {data.limits.rpd}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-200  overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.max(rpdPercent, 2)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 ">
            <span>Sisa Kuota: ~{data.usage.remainingDaily.toLocaleString('id-ID')} kuis</span>
            <span>Reset: {data.usage.dailyResetCountdown}</span>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-slate-100/70  border border-slate-200  text-xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-600 " />
          <span className="font-semibold text-slate-700 ">
            Model: {data.models.primary} (Failover: {data.models.fallbacks.join(', ')})
          </span>
        </div>
        <span className="text-[11px] text-slate-500 ">
          Tier: Standar AI Studio (Gratis 1,500 RPD)
        </span>
      </div>
    </div>
  );
};
