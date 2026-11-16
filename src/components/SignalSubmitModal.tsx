import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import type { IntelligenceItem, NewsSourceEndpoint, Region } from '../types/intelligence.ts';

interface SignalSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestLiveRss: (region?: Region | 'All') => Promise<void>;
  onSignalAnalyzed: (items: IntelligenceItem[], newItem: IntelligenceItem) => void;
  isIngesting: boolean;
  lastIngestedAt: string;
}

const REGION_OPTIONS: Array<Region | 'All'> = [
  'All',
  'North America',
  'Europe',
  'Asia-Pacific',
  'Oceania',
  'Middle East',
  'Latin America',
  'Africa',
];

export function SignalSubmitModal({
  isOpen,
  onClose,
  onIngestLiveRss,
  onSignalAnalyzed,
  isIngesting,
  lastIngestedAt,
}: SignalSubmitModalProps) {
  const [headline, setHeadline] = useState('');
  const [source, setSource] = useState('Bloomberg');
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');
  const [selectedSyncRegion, setSelectedSyncRegion] = useState<Region | 'All'>('All');
  const [sources, setSources] = useState<NewsSourceEndpoint[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/sources')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { sources?: NewsSourceEndpoint[] } | null) => {
        if (data?.sources) setSources(data.sources);
      })
      .catch(() => {
        // Silent fallback if sources endpoint unreachable
      });
  }, [isOpen]);

  const visibleSources = useMemo(() => {
    if (selectedSyncRegion === 'All') return sources;
    return sources.filter((s) => s.region === selectedSyncRegion);
  }, [sources, selectedSyncRegion]);

  if (!isOpen) return null;

  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/intelligence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline, source, notes, url }),
      });
      const data = (await res.json()) as {
        item?: IntelligenceItem;
        items?: IntelligenceItem[];
        error?: string;
      };
      if (!res.ok || !data.item || !data.items) {
        throw new Error(data.error || 'Failed to analyze signal.');
      }
      onSignalAnalyzed(data.items, data.item);
      setHeadline('');
      setNotes('');
      setUrl('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process signal.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ingest-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#11161E] border border-slate-800 rounded-xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto intel-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 id="ingest-modal-title" className="font-display text-lg font-semibold text-slate-100">
              Ingest & Analyze Market Intelligence
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sync local and continental RSS endpoints across all continents or analyze a custom signal with Gemini.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Option 1: Continental & Local RSS Sync */}
        <div className="bg-[#090C10] border border-slate-800/80 rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-200">
                Local & Continental RSS Pipeline
              </div>
              <div className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
                Last sync: {new Date(lastIngestedAt).toLocaleTimeString()} · {sources.length} endpoints across 7 regions
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="Target continent for RSS sync"
                value={selectedSyncRegion}
                onChange={(e) => setSelectedSyncRegion(e.target.value as Region | 'All')}
                className="px-2.5 py-2 text-xs font-medium bg-[#11161E] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {REGION_OPTIONS.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg === 'All' ? 'All Continents' : reg}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={isIngesting}
                onClick={() => onIngestLiveRss(selectedSyncRegion)}
                className="px-3.5 py-2 text-xs font-medium bg-slate-800 text-slate-100 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isIngesting ? 'animate-spin' : ''}`} />
                <span>{isIngesting ? 'Syncing...' : 'Sync Feeds'}</span>
              </button>
            </div>
          </div>

          {visibleSources.length > 0 && (
            <div className="pt-2 border-t border-slate-800/70 text-[11px] text-slate-400 leading-relaxed">
              <span className="text-slate-500">Active endpoints: </span>
              {visibleSources.map((s, i) => (
                <span key={s.id}>
                  <span className="text-slate-300">{s.name}</span>
                  <span className="text-slate-500"> ({s.scope})</span>
                  {i < visibleSources.length - 1 && <span className="text-slate-600"> · </span>}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Option 2: Custom Signal Analysis */}
        <form onSubmit={handleAnalyzeSubmit} className="space-y-4">
          <div className="text-xs font-medium text-slate-300">
            Or run a custom development through the LLM enrichment pipeline:
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signal-headline" className="block text-xs font-medium text-slate-400">
              Headline or Development Title
            </label>
            <input
              id="signal-headline"
              type="text"
              required
              minLength={10}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g., Goldman Sachs Launches Agentic Treasury Repo Platform in London"
              className="w-full px-3.5 py-2.5 text-sm bg-[#090C10] border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="signal-source" className="block text-xs font-medium text-slate-400">
                Source / Publication
              </label>
              <input
                id="signal-source"
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Financial Times"
                className="w-full px-3.5 py-2 text-sm bg-[#090C10] border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="signal-notes" className="block text-xs font-medium text-slate-400">
                Context / Capital Notes (Optional)
              </label>
              <input
                id="signal-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., $180M Series B, UK FCA pilot"
                className="w-full px-3.5 py-2 text-sm bg-[#090C10] border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signal-url" className="block text-xs font-medium text-slate-400">
              Direct Article / Source URL (Optional)
            </label>
            <input
              id="signal-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.ft.com/... or https://..."
              className="w-full px-3.5 py-2 text-sm bg-[#090C10] border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-500">
              If omitted, Meridian automatically generates a live, targeted Google News query for the exact headline and source.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAnalyzing}
              className="px-4 py-2 text-xs font-medium bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Extracting & Geolocating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyze & Plot on Map</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
