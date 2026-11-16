import type { IntelligenceItem } from '../types/intelligence.ts';
import { formatRelativeTime, SECTOR_COLORS } from '../utils/intelligenceHelpers.ts';

interface LiveHeadlineTickerProps {
  items: IntelligenceItem[];
  onSelectItem: (item: IntelligenceItem) => void;
  lastIngestedAt: string;
  autoRefreshMin?: number;
}

export function LiveHeadlineTicker({
  items,
  onSelectItem,
  lastIngestedAt,
  autoRefreshMin,
}: LiveHeadlineTickerProps) {
  if (items.length === 0) return null;

  const tickerItems = items.slice(0, 10);
  const doubled = [...tickerItems, ...tickerItems];

  return (
    <div
      aria-label="Live market developments ticker"
      className="bg-[#11161E] border border-slate-800/80 rounded-xl px-3.5 py-1.5 flex items-center gap-3 overflow-hidden shrink-0"
    >
      <span className="text-[11px] font-semibold text-amber-400 whitespace-nowrap shrink-0">
        Live Wire
      </span>
      <span className="h-3 w-px bg-slate-800 shrink-0" aria-hidden="true" />
      <div className="ticker-container flex-1 overflow-hidden relative">
        <div className="animate-ticker flex items-center gap-8 w-max">
          {doubled.map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              type="button"
              onClick={() => onSelectItem(item)}
              className="flex items-center gap-2 text-xs text-slate-300 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className={`font-medium ${SECTOR_COLORS[item.sector].text}`}>
                {item.sector}
              </span>
              <span className="text-slate-500" aria-hidden="true">
                ·
              </span>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {item.hubCity}
              </span>
              <span className="text-slate-500" aria-hidden="true">
                ·
              </span>
              <span className="max-w-[300px] truncate">{item.headline}</span>
              <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                ({formatRelativeTime(item.publishedAt)})
              </span>
            </button>
          ))}
        </div>
      </div>
      <span className="h-3 w-px bg-slate-800 shrink-0 hidden sm:inline-block" aria-hidden="true" />
      <div className="font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap shrink-0 hidden sm:flex items-center gap-1.5">
        <span>Synced {new Date(lastIngestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        {autoRefreshMin && autoRefreshMin > 0 ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Auto {autoRefreshMin}m
          </span>
        ) : null}
      </div>
    </div>
  );
}
