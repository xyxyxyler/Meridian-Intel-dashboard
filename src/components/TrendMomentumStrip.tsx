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
      className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 shrink-0"
    >
      {/* KPI 1: Tracked Developments */}
      <div className="min-w-0 bg-[#11161E] border border-slate-800/80 rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 flex flex-col justify-between gap-1">
        <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] font-medium text-slate-400">
          <span className="truncate">Tracked Signals</span>
          <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
        </div>
        <div className="flex items-baseline justify-between gap-1.5 min-w-0">
          <span className="font-display text-lg sm:text-xl font-semibold tracking-tight text-slate-100 tabular-nums leading-none">
            {metrics.totalCount}
          </span>
          <span className="font-mono text-[10px] sm:text-[11px] text-emerald-400 tabular-nums whitespace-nowrap shrink-0">
            +{metrics.last24hCount} (24h)
          </span>
        </div>
        <p className="text-[10px] sm:text-[11px] text-slate-400 truncate" title={activeScopeLabel}>
          {activeScopeLabel}
        </p>
      </div>

      {/* KPI 2: Fastest-Growing Hub */}
      <div className="min-w-0 bg-[#11161E] border border-slate-800/80 rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 flex flex-col justify-between gap-1">
        <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] font-medium text-slate-400">
          <span className="truncate">Top Hub</span>
          <Globe2 className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
        </div>
        {metrics.fastestHub ? (
          <>
            <div className="flex items-baseline justify-between gap-1.5 min-w-0">
              <span className="font-display text-base sm:text-lg font-semibold tracking-tight text-slate-100 truncate leading-none">
                {metrics.fastestHub.hubCity}
              </span>
              <span className="font-mono text-[10px] sm:text-[11px] text-amber-400 tabular-nums whitespace-nowrap shrink-0">
                {metrics.fastestHub.count} {metrics.fastestHub.count === 1 ? 'sig' : 'sigs'}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 truncate">
              <span className="truncate">{metrics.fastestHub.country}</span>
              <span aria-hidden="true">·</span>
              <span className={`${SECTOR_COLORS[metrics.fastestHub.dominantSector].text} shrink-0`}>
                {metrics.fastestHub.dominantSector}
              </span>
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-500">No active hub</p>
        )}
      </div>

      {/* KPI 3: Top Trending Technology */}
      <div className="min-w-0 bg-[#11161E] border border-slate-800/80 rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 flex flex-col justify-between gap-1">
        <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] font-medium text-slate-400">
          <span className="truncate">Top Theme</span>
          <TrendingUp className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
        </div>
        {metrics.topTechnology ? (
          <>
            <div className="flex items-baseline justify-between gap-1.5 min-w-0">
              <span className="font-display text-sm sm:text-base font-semibold tracking-tight text-slate-100 truncate leading-none">
                {metrics.topTechnology.tag}
              </span>
              <span className="font-mono text-[10px] sm:text-[11px] text-slate-300 tabular-nums shrink-0">
                {metrics.topTechnology.count}x
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 truncate">
              <span className={`${SECTOR_COLORS[metrics.topTechnology.sector].text} shrink-0`}>
                {metrics.topTechnology.sector}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{metrics.dominantEventType}</span>
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-500">No theme detected</p>
        )}
      </div>

      {/* KPI 4: Market Momentum & Sentiment */}
      <div className="min-w-0 bg-[#11161E] border border-slate-800/80 rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 flex flex-col justify-between gap-1">
        <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] font-medium text-slate-400">
          <span className="truncate">Momentum</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
        </div>
        <div className="flex items-baseline justify-between gap-1.5 min-w-0">
          <span className="font-display text-lg sm:text-xl font-semibold tracking-tight text-slate-100 tabular-nums leading-none">
            {metrics.constructivePct}%
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-emerald-400 truncate">
            {metrics.sentimentLabel}
          </span>
        </div>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 transition-all duration-300"
            style={{ width: `${metrics.constructivePct}%` }}
          />
        </div>
      </div>
    </section>
  );
}
