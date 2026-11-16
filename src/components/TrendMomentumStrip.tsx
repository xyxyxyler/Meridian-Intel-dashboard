import { ArrowUpRight, Globe2, Layers, TrendingUp } from 'lucide-react';
import type { TrendMetrics } from '../utils/intelligenceHelpers.ts';
import { SECTOR_COLORS } from '../utils/intelligenceHelpers.ts';

interface TrendMomentumStripProps {
  metrics: TrendMetrics;
  activeScopeLabel: string;
}

export function TrendMomentumStrip({ metrics, activeScopeLabel }: TrendMomentumStripProps) {
  return (
    <section
      aria-label="Trend and Momentum Indicators"
      className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2 shrink-0"
    >
      {/* KPI 1: Tracked Developments */}
      <div className="min-w-0 bg-[#11161E] border border-slate-800/80 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">Signals</span>
        </div>
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className="font-display text-sm sm:text-base font-semibold tracking-tight text-slate-100 tabular-nums">
            {metrics.totalCount}
          </span>
          <span className="font-mono text-[10px] text-emerald-400 tabular-nums">
            +{metrics.last24hCount} (24h)
          </span>
        </div>
      </div>

      {/* KPI 2: Fastest-Growing Hub */}
      <div className="min-w-0 bg-[#11161E] border border-slate-800/80 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Globe2 className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">Top Hub</span>
        </div>
        {metrics.fastestHub ? (
          <div className="flex items-baseline gap-1.5 shrink-0 min-w-0">
            <span className="font-display text-xs sm:text-sm font-semibold tracking-tight text-slate-100 truncate max-w-[85px] sm:max-w-[110px]">
              {metrics.fastestHub.hubCity}
            </span>
            <span className="font-mono text-[10px] text-amber-400 tabular-nums">
              {metrics.fastestHub.count} sigs
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-500">None</span>
        )}
      </div>

      {/* KPI 3: Top Trending Technology */}
      <div className="min-w-0 bg-[#11161E] border border-slate-800/80 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <TrendingUp className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">Theme</span>
        </div>
        {metrics.topTechnology ? (
          <div className="flex items-baseline gap-1.5 shrink-0 min-w-0">
            <span className="font-display text-xs sm:text-sm font-semibold tracking-tight text-slate-100 truncate max-w-[85px] sm:max-w-[110px]">
              {metrics.topTechnology.tag}
            </span>
            <span className="font-mono text-[10px] text-slate-300 tabular-nums">
              {metrics.topTechnology.count}x
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-500">None</span>
        )}
      </div>

      {/* KPI 4: Market Momentum & Sentiment */}
      <div
        className="min-w-0 bg-[#11161E] border border-slate-800/80 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-1.5 flex items-center justify-between gap-2"
        title="Momentum: Percentage of active intelligence signals categorized as Constructive (expansion, funding, product launches) vs. Cautious (regulatory crackdowns, enforcement, headwinds)."
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">Momentum</span>
        </div>
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className="font-display text-sm sm:text-base font-semibold tracking-tight text-slate-100 tabular-nums">
            {metrics.constructivePct}%
          </span>
          <span className="text-[10px] font-medium text-emerald-400 truncate max-w-[90px]">
            {metrics.sentimentLabel}
          </span>
        </div>
      </div>
    </section>
  );
}
