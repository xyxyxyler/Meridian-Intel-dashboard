import { useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { EventType, ExecutiveBriefing, IntelligenceItem, Sector } from '../types/intelligence.ts';
import { aggregateByHub, SECTOR_COLORS } from '../utils/intelligenceHelpers.ts';

const SECTORS: Sector[] = ['Banking', 'FinTech', 'AI'];
const EVENT_TYPES: EventType[] = [
  'Product Launch',
  'M&A/Funding',
  'Tech Breakthrough',
  'Regulation',
];

interface HubLeaderboardCardProps {
  items: IntelligenceItem[];
  selectedHub: string | null;
  onSelectHub: (hubCity: string | null, country: string | null) => void;
}

export function HubLeaderboardCard({
  items,
  selectedHub,
  onSelectHub,
}: HubLeaderboardCardProps) {
  const hubs = useMemo(() => aggregateByHub(items).slice(0, 5), [items]);

  return (
    <div className="bg-[#11161E] border border-slate-800/80 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between gap-1.5 h-full min-h-[190px]">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <h2 className="font-display text-sm font-semibold text-slate-100">
          Regional Hub Activity
        </h2>
        {selectedHub ? (
          <button
            type="button"
            onClick={() => onSelectHub(null, null)}
            className="text-[11px] font-medium text-amber-400 hover:text-amber-300 cursor-pointer"
          >
            Show All
          </button>
        ) : (
          <span className="text-[11px] text-slate-500">Top 5 hubs</span>
        )}
      </div>

      <div className="flex-1 min-h-[125px] overflow-y-auto overflow-x-auto intel-scroll">
        <table className="w-full text-left border-collapse min-w-[270px]">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-medium text-slate-400">
              <th className="py-1 pr-1.5 font-medium">Hub</th>
              <th className="py-1 px-1.5 font-medium">Lead</th>
              <th className="py-1 px-1.5 text-right font-medium">Signals</th>
              <th className="py-1 pl-1.5 text-right font-medium">Impact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {hubs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-500 text-xs">
                  No active hubs in current filter
                </td>
              </tr>
            ) : (
              hubs.map((hub) => {
                const isActive =
                  selectedHub && selectedHub.toLowerCase() === hub.hubCity.toLowerCase();
                return (
                  <tr
                    key={`${hub.hubCity}-${hub.country}`}
                    onClick={() =>
                      isActive
                        ? onSelectHub(null, null)
                        : onSelectHub(hub.hubCity, hub.country)
                    }
                    className={`h-6 sm:h-6.5 cursor-pointer transition-colors ${
                      isActive ? 'bg-amber-500/10' : 'hover:bg-slate-800/35'
                    }`}
                  >
                    <td className="py-0.5 sm:py-1 pr-1.5 font-medium text-slate-200 whitespace-nowrap truncate max-w-[95px] sm:max-w-[130px] text-xs">
                      {hub.hubCity}
                      <span className="text-slate-500 font-normal ml-1 text-[11px]">{hub.country}</span>
                    </td>
                    <td
                      className={`py-0.5 sm:py-1 px-1.5 whitespace-nowrap text-[10px] sm:text-[11px] ${
                        SECTOR_COLORS[hub.dominantSector].text
                      }`}
                    >
                      {hub.dominantSector}
                    </td>
                    <td className="py-0.5 sm:py-1 px-1.5 text-right font-mono text-[10px] sm:text-[11px] text-slate-300 tabular-nums">
                      {hub.count}
                    </td>
                    <td className="py-0.5 sm:py-1 pl-1.5 text-right font-mono text-[10px] sm:text-[11px] text-amber-400 tabular-nums">
                      {hub.totalImpact.toFixed(1)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SectorMixCardProps {
  items: IntelligenceItem[];
}

export function SectorMixCard({ items }: SectorMixCardProps) {
  const sectorBreakdown = useMemo(() => {
    const total = Math.max(1, items.length);
    return SECTORS.map((sec) => {
      const count = items.filter((i) => i.sector === sec).length;
      return {
        sector: sec,
        count,
        pct: Math.round((count / total) * 100),
      };
    });
  }, [items]);

  const eventBreakdown = useMemo(() => {
    return EVENT_TYPES.map((evt) => ({
      eventType: evt,
      count: items.filter((i) => i.eventType === evt).length,
    }));
  }, [items]);

  return (
    <div className="bg-[#11161E] border border-slate-800/80 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between gap-2 h-full min-h-[190px]">
      <div className="space-y-2">
        <h2 className="font-display text-sm font-semibold text-slate-100">
          Sector & Catalyst Mix
        </h2>
        <div className="space-y-1.5">
          {sectorBreakdown.map((row) => (
            <div key={row.sector} className="space-y-0.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className={`font-medium ${SECTOR_COLORS[row.sector].text}`}>
                  {row.sector}
                </span>
                <span className="font-mono text-slate-300 tabular-nums">
                  {row.count} ({row.pct}%)
                </span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${SECTOR_COLORS[row.sector].bar} transition-all duration-300`}
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        {eventBreakdown.map((row) => (
          <div key={row.eventType} className="flex items-center justify-between gap-1 min-w-0">
            <span className="text-slate-400 truncate">{row.eventType}</span>
            <span className="font-mono text-slate-200 tabular-nums shrink-0">{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ExecutiveSynthesisCardProps {
  items: IntelligenceItem[];
  activeScopeLabel: string;
}

export function ExecutiveSynthesisCard({
  items,
  activeScopeLabel,
}: ExecutiveSynthesisCardProps) {
  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  const handleGenerateBriefing = async () => {
    setIsLoadingBriefing(true);
    setBriefingError(null);
    try {
      const res = await fetch('/api/intelligence/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scopeLabel: activeScopeLabel,
          items: items.slice(0, 12).map((i) => ({
            headline: i.headline,
            sector: i.sector,
            eventType: i.eventType,
            hubCity: i.hubCity,
            country: i.country,
            executiveSummary: i.executiveSummary,
          })),
        }),
      });
      const data = (await res.json()) as { briefing?: ExecutiveBriefing; error?: string };
      if (!res.ok || !data.briefing) {
        throw new Error(data.error || 'Failed to synthesize executive briefing.');
      }
      setBriefing(data.briefing);
    } catch (err) {
      setBriefingError(err instanceof Error ? err.message : 'Unable to generate briefing.');
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  return (
    <div className="bg-[#11161E] border border-slate-800/80 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between gap-1.5 sm:gap-2 h-full min-h-[160px]">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <h2 className="font-display text-sm font-semibold text-slate-100">
            AI Executive Synthesis
          </h2>
          <p className="text-[11px] text-slate-400 truncate" title={activeScopeLabel}>
            Scope: {activeScopeLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerateBriefing}
          disabled={isLoadingBriefing || items.length === 0}
          className="px-3 py-1.5 text-[11px] font-medium bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isLoadingBriefing ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="hidden sm:inline">Synthesizing...</span>
              <span className="inline sm:hidden">AI...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" />
              <span className="hidden sm:inline">Synthesize Briefing</span>
              <span className="inline sm:hidden">Synthesize</span>
            </>
          )}
        </button>
      </div>

      {briefingError && (
        <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/60 text-[11px] text-rose-200">
          {briefingError}
        </div>
      )}

      {briefing ? (
        <div className="flex-1 min-h-0 overflow-y-auto intel-scroll space-y-2 text-xs leading-snug pr-1">
          <p className="text-slate-200">
            <span className="font-semibold text-amber-300">Thesis: </span>
            {briefing.strategicThesis}
          </p>
          <ul className="space-y-0.5 text-[11px] text-slate-300 list-disc pl-4">
            {briefing.keySignals.slice(0, 3).map((sig, i) => (
              <li key={i}>{sig}</li>
            ))}
          </ul>
          <div className="text-[11px] text-slate-400">
            Watchlist: {briefing.priorityWatchlist.join(' · ')}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center text-xs text-slate-400 space-y-1.5">
          <p className="text-slate-300 leading-relaxed">
            Synthesize a real-time strategic briefing with Gemini across the {items.length}{' '}
            filtered signals in {activeScopeLabel}.
          </p>
          <p className="text-[11px] text-slate-500">
            Select any region or vertical to tailor capital allocation and regulatory insights.
          </p>
        </div>
      )}
    </div>
  );
}
