import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import type { IntelligenceItem } from '../types/intelligence.ts';
import { formatRelativeTime, resolveSourceUrl, SECTOR_COLORS } from '../utils/intelligenceHelpers.ts';

interface IntelligenceFeedProps {
  items: IntelligenceItem[];
  selectedItemId: string | null;
  onSelectItem: (item: IntelligenceItem) => void;
  onResetFilters: () => void;
  isIngesting: boolean;
  autoCycleEnabled?: boolean;
  cycleIntervalSec?: number;
}

const ITEMS_PER_PAGE = 3;

export function IntelligenceFeed({
  items,
  selectedItemId,
  onSelectItem,
  onResetFilters,
  isIngesting,
  autoCycleEnabled = true,
  cycleIntervalSec = 12,
}: IntelligenceFeedProps) {
  const [page, setPage] = useState(0);
  const [autoCycle, setAutoCycle] = useState(autoCycleEnabled);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setAutoCycle(autoCycleEnabled);
  }, [autoCycleEnabled]);

  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);

  useEffect(() => {
    setPage(0);
  }, [items.length]);

  useEffect(() => {
    if (!autoCycle || isHovered || totalPages <= 1) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const timer = window.setInterval(() => {
      setPage((prev) => (prev + 1) % totalPages);
    }, cycleIntervalSec * 1000);
    return () => window.clearInterval(timer);
  }, [autoCycle, isHovered, totalPages, cycleIntervalSec]);

  const visibleItems = useMemo(() => {
    const start = safePage * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  }, [items, safePage]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-[#11161E] border border-slate-800/80 rounded-xl p-3 sm:p-3.5 xl:p-4 flex flex-col gap-1.5 sm:gap-2 h-full min-h-0"
    >
      {/* Header + Display Pager */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="font-display text-sm sm:text-base font-semibold text-slate-100 tracking-tight whitespace-nowrap">
            Intelligence Feed
          </h2>
          <span className="font-mono text-[10px] sm:text-[11px] text-slate-400 tabular-nums shrink-0">
            {items.length} signals
          </span>
        </div>

        {items.length > ITEMS_PER_PAGE && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setAutoCycle((prev) => !prev)}
              title={autoCycle ? 'Pause display rotation' : 'Resume display rotation'}
              className={`px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-medium rounded-md border transition-colors inline-flex items-center gap-1 cursor-pointer min-h-[26px] ${autoCycle
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-[#090C10] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
            >
              {autoCycle ? <Pause className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
              <span>Auto</span>
            </button>

            <div className="flex items-center bg-[#090C10] border border-slate-800 rounded-md">
              <button
                type="button"
                onClick={() => setPage((prev) => (prev - 1 + totalPages) % totalPages)}
                aria-label="Previous intelligence page"
                className="p-1 min-w-[26px] min-h-[26px] flex items-center justify-center text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-mono text-[10px] sm:text-[11px] text-slate-300 tabular-nums">
                {safePage + 1}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => (prev + 1) % totalPages)}
                aria-label="Next intelligence page"
                className="p-1 min-w-[26px] min-h-[26px] flex items-center justify-center text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zero-Scroll 3-Card Display Container — Guaranteed 3 Items Visible */}
      <div className="flex-1 min-h-0 flex flex-col justify-between divide-y divide-slate-800/70 overflow-y-auto intel-scroll pr-0.5">
        {isIngesting && items.length === 0 ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((skeleton) => (
              <div key={skeleton} className="py-2 space-y-2 animate-pulse">
                <div className="h-3 w-44 bg-slate-800 rounded" />
                <div className="h-4 w-full bg-slate-800 rounded" />
                <div className="h-3 w-5/6 bg-slate-800/70 rounded" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-6 gap-2.5">
            <p className="font-display text-sm font-medium text-slate-200">
              No developments match this filter combination
            </p>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Expand the timeframe, clear the selected country/hub, or reset vertical filters.
            </p>
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-1 px-3.5 py-1.5 text-xs font-medium bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        ) : (
          visibleItems.map((item) => {
            const isSelected = selectedItemId === item.id;
            return (
              <article
                key={item.id}
                className={`py-2 first:pt-1 last:pb-1 flex-1 min-h-[105px] xl:min-h-[115px] flex flex-col justify-between transition-colors rounded-lg px-2 -mx-1 shrink ${
                  isSelected ? 'bg-slate-800/45' : 'hover:bg-slate-800/25'
                }`}
              >
                {/* Content Block: Metadata + Headline + Summary */}
                <div className="flex-1 min-h-0 flex flex-col justify-start">
                  {/* Unboxed Metadata Row */}
                  <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-400 mb-1 shrink-0">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 min-w-0">
                      <span className={`font-semibold ${SECTOR_COLORS[item.sector].text}`}>
                        {item.sector}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-slate-300 font-medium">{item.eventType}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="inline-flex items-center gap-1 text-slate-400 truncate">
                        <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.hubCity}, {item.country}</span>
                      </span>
                    </div>
                    <span className="font-mono text-[10px] sm:text-[11px] text-slate-500 tabular-nums shrink-0">
                      {formatRelativeTime(item.publishedAt)}
                    </span>
                  </div>

                  {/* Headline */}
                  <button
                    type="button"
                    onClick={() => onSelectItem(item)}
                    className="text-left group w-full cursor-pointer mb-1"
                  >
                    <h3 className="font-display text-xs sm:text-[13px] xl:text-[14.5px] font-semibold text-slate-100 group-hover:text-amber-300 transition-colors leading-snug line-clamp-2">
                      {item.headline}
                    </h3>
                  </button>

                  {/* Executive Summary */}
                  <p className="text-[11px] sm:text-xs text-slate-300/90 leading-relaxed line-clamp-2">
                    {item.executiveSummary}
                  </p>
                </div>

                {/* Attribution & Action Row */}
                <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-400 shrink-0 pt-1.5 border-t border-slate-800/30">
                  <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 min-w-0">
                    <span className="font-medium text-slate-300 truncate max-w-[120px] sm:max-w-[160px]">{item.source}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="font-mono text-amber-400/90 tabular-nums shrink-0">
                      {item.capitalOrScaleLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectItem(item)}
                      className="px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-slate-300 hover:text-amber-300 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800/60 rounded transition-colors inline-flex items-center gap-1 min-h-[24px] sm:min-h-[26px] cursor-pointer"
                    >
                      <span>Brief</span>
                      <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                    <a
                      href={resolveSourceUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-400 hover:text-slate-100 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800/60 rounded transition-colors min-h-[24px] min-w-[24px] sm:min-h-[26px] sm:min-w-[26px] flex items-center justify-center"
                      aria-label={`Open source article from ${item.source}`}
                    >
                      <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
