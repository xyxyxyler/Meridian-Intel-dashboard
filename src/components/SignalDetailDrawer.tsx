import { ExternalLink, Globe2, X } from 'lucide-react';
import type { IntelligenceItem } from '../types/intelligence.ts';
import { formatRelativeTime, resolveSourceUrl, SECTOR_COLORS } from '../utils/intelligenceHelpers.ts';

interface SignalDetailDrawerProps {
  item: IntelligenceItem | null;
  onClose: () => void;
  onFilterByHub: (hubCity: string, country: string) => void;
}

export function SignalDetailDrawer({
  item,
  onClose,
  onFilterByHub,
}: SignalDetailDrawerProps) {
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-headline"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#11161E] border-l border-slate-800 h-full overflow-y-auto p-4 sm:p-6 flex flex-col justify-between gap-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className={`font-semibold ${SECTOR_COLORS[item.sector].text}`}>
                {item.sector}
              </span>
              <span aria-hidden="true">·</span>
              <span>{item.eventType}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{formatRelativeTime(item.publishedAt)}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close executive brief"
              className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h2
            id="drawer-headline"
            className="font-display text-xl font-semibold text-slate-100 leading-snug"
          >
            {item.headline}
          </h2>

          <div className="space-y-2">
            <div className="text-xs font-medium text-amber-400">Executive Summary — Why It Matters</div>
            <p className="text-sm text-slate-200 leading-relaxed">{item.executiveSummary}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800/80 text-xs">
            <div>
              <div className="text-slate-500 mb-1">Primary Hub</div>
              <div className="text-slate-200 font-medium">
                {item.hubCity}, {item.country}
              </div>
              <div className="font-mono text-[11px] text-slate-500 tabular-nums mt-0.5">
                {item.lat.toFixed(2)}°, {item.lng.toFixed(2)}°
              </div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Scale / Capital Signal</div>
              <div className="text-amber-300 font-mono font-medium tabular-nums">
                {item.capitalOrScaleLabel}
              </div>
              <div className="text-slate-400 mt-0.5">Sentiment: {item.sentiment}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Core Technology</div>
              <div className="text-slate-200 font-medium">{item.technologyTag}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Source Attribution</div>
              <div className="text-slate-200 font-medium">{item.source}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Publication Date</div>
              <div className="text-slate-200 font-medium">
                {new Date(item.publishedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <div className="font-mono text-[11px] text-slate-500 tabular-nums mt-0.5">
                {new Date(item.publishedAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short',
                })} ({formatRelativeTime(item.publishedAt)})
              </div>
            </div>
          </div>

          {item.entities.length > 0 && (
            <div className="pt-3 border-t border-slate-800/80">
              <div className="text-xs text-slate-500 mb-1.5">Extracted Entities</div>
              <div className="text-sm text-slate-200 font-medium">
                {item.entities.join(' · ')}
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => {
              onFilterByHub(item.hubCity, item.country);
              onClose();
            }}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-medium bg-slate-800 text-slate-100 rounded-lg hover:bg-slate-700 transition-colors inline-flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer"
          >
            <Globe2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Filter Dashboard to {item.hubCity}</span>
          </button>

          <a
            href={resolveSourceUrl(item)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors inline-flex items-center justify-center gap-1.5 min-h-[40px]"
          >
            <span>Read Original Source</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
