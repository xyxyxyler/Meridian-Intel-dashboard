import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Globe2,
  LayoutGrid,
  Menu,
  Moon,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { BASELINE_INTELLIGENCE } from './data/baselineIntelligence.ts';
import type {
  DashboardSettings,
  EventType,
  IntelligenceFeedResponse,
  IntelligenceItem,
  Region,
  Sector,
  Timeframe,
} from './types/intelligence.ts';
import {
  buildScopeLabel,
  computeTrendMetrics,
  filterIntelligenceItems,
  type DashboardFilters,
} from './utils/intelligenceHelpers.ts';
import { useTheme } from './utils/theme.ts';
import { LiveHeadlineTicker } from './components/LiveHeadlineTicker.tsx';
import { TrendMomentumStrip } from './components/TrendMomentumStrip.tsx';
import { GlobalHeatmap } from './components/GlobalHeatmap.tsx';
import { IntelligenceFeed } from './components/IntelligenceFeed.tsx';
import {
  ExecutiveSynthesisCard,
  HubLeaderboardCard,
  SectorMixCard,
} from './components/SectorAnalyticsRow.tsx';
import { SignalDetailDrawer } from './components/SignalDetailDrawer.tsx';
import { SignalSubmitModal } from './components/SignalSubmitModal.tsx';
import { ControlDrawer } from './components/ControlDrawer.tsx';

const SETTINGS_STORAGE_KEY = 'meridian_intel_settings_v1';

const DEFAULT_SETTINGS: DashboardSettings = {
  autoCycleFeed: true,
  cycleIntervalSec: 12,
  showTicker: true,
  defaultMapMode: 'hotspots',
  defaultTimeframe: '30d',
  autoRefreshMin: 15,
};

function loadInitialSettings(): DashboardSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<DashboardSettings>;
    const autoRefreshMin =
      parsed.autoRefreshMin === 0 || parsed.autoRefreshMin === undefined
        ? 15
        : parsed.autoRefreshMin;
    const defaultTimeframe: Timeframe =
      parsed.defaultTimeframe === '24h' ||
      parsed.defaultTimeframe === '7d' ||
      parsed.defaultTimeframe === '30d'
        ? parsed.defaultTimeframe
        : '30d';
    return { ...DEFAULT_SETTINGS, ...parsed, autoRefreshMin, defaultTimeframe };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const SECTORS: Array<Sector | 'All'> = ['All', 'Banking', 'FinTech', 'AI'];
const EVENT_TYPES: Array<EventType | 'All'> = [
  'All',
  'Product Launch',
  'M&A/Funding',
  'Tech Breakthrough',
  'Regulation',
];
const TIMEFRAMES: Array<{ label: string; value: Timeframe }> = [
  { label: 'Live / 24h', value: '24h' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
];

export default function App() {
  const { themeMode, resolvedTheme, isDark, setThemeMode, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<DashboardSettings>(loadInitialSettings);
  const [items, setItems] = useState<IntelligenceItem[]>(BASELINE_INTELLIGENCE);
  const [lastIngestedAt, setLastIngestedAt] = useState<string>(new Date().toISOString());
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestFeedback, setIngestFeedback] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(() => ({
    sector: 'All',
    eventType: 'All',
    timeframe: loadInitialSettings().defaultTimeframe,
    region: 'All',
    country: null,
    hubCity: null,
    searchQuery: '',
  }));
  const [selectedItem, setSelectedItem] = useState<IntelligenceItem | null>(null);
  const [mobileView, setMobileView] = useState<'feed' | 'map' | 'analytics' | 'all'>('feed');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isControlDrawerOpen, setIsControlDrawerOpen] = useState(false);

  const handleUpdateSettings = (next: DashboardSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  };

  const handleResetSettings = () => {
    handleUpdateSettings(DEFAULT_SETTINGS);
  };

  const loadIntelligence = useCallback(async () => {
    try {
      const res = await fetch('/api/intelligence');
      if (!res.ok) return;
      const data = (await res.json()) as IntelligenceFeedResponse;
      if (Array.isArray(data.items) && data.items.length > 0) {
        setItems(data.items);
        setLastIngestedAt(data.lastIngestedAt);
      }
    } catch {
      // Retain baseline verified dataset if offline
    }
  }, []);

  useEffect(() => {
    loadIntelligence();
    const interval = setInterval(() => {
      loadIntelligence();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [loadIntelligence]);

  const handleIngestLiveRss = useCallback(async (targetRegion: Region | 'All' = 'All') => {
    setIsIngesting(true);
    setIngestFeedback(null);
    try {
      const res = await fetch('/api/intelligence/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region: targetRegion }),
      });
      const data = (await res.json()) as {
        items?: IntelligenceItem[];
        added?: number;
        region?: string;
        rssFeedsActive?: number;
        lastIngestedAt?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Live feed synchronization failed.');
      }
      if (data.items) setItems(data.items);
      if (data.lastIngestedAt) setLastIngestedAt(data.lastIngestedAt);
      const scopeDesc = targetRegion === 'All' ? 'all continents' : targetRegion;
      setIngestFeedback(
        data.added && data.added > 0
          ? `Ingested ${data.added} new Gemini-enriched signals across ${scopeDesc} (${data.rssFeedsActive || 0} active feeds).`
          : `Checked ${data.rssFeedsActive || 0} active feeds across ${scopeDesc}. Latest regional signals are already indexed.`
      );
    } catch (err) {
      setIngestFeedback(err instanceof Error ? err.message : 'Unable to sync live RSS feeds.');
    } finally {
      setIsIngesting(false);
    }
  }, []);

  useEffect(() => {
    if (settings.autoRefreshMin <= 0) return;
    const intervalMs = settings.autoRefreshMin * 60 * 1000;
    const timer = window.setInterval(() => {
      handleIngestLiveRss('All');
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [settings.autoRefreshMin, handleIngestLiveRss]);

  const filteredItems = useMemo(() => filterIntelligenceItems(items, filters), [items, filters]);
  const trendMetrics = useMemo(() => computeTrendMetrics(filteredItems), [filteredItems]);
  const activeScopeLabel = useMemo(() => buildScopeLabel(filters), [filters]);

  const handleResetFilters = () => {
    setFilters({
      sector: 'All',
      eventType: 'All',
      timeframe: settings.defaultTimeframe,
      region: 'All',
      country: null,
      hubCity: null,
      searchQuery: '',
    });
  };

  const hasActiveFilters =
    filters.sector !== 'All' ||
    filters.eventType !== 'All' ||
    filters.timeframe !== settings.defaultTimeframe ||
    filters.region !== 'All' ||
    filters.country !== null ||
    filters.hubCity !== null ||
    filters.searchQuery.trim() !== '';

  return (
    <div className="min-h-screen md:min-h-screen xl:h-screen xl:overflow-hidden bg-[#090C10] text-slate-100 flex flex-col">
      {/* Clean Executive Wallboard Top Bar */}
      <header className="border-b border-slate-800/80 bg-[#090C10]/95 backdrop-blur-sm shrink-0 z-30">
        <div className="max-w-[1840px] mx-auto px-3 sm:px-6 h-12 flex items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsControlDrawerOpen(true)}
              aria-label="Open settings and API control center"
              title="Settings & API Management"
              className="p-1.5 -ml-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <Menu className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="font-display text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Meridian Intel
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Dark/Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 rounded-lg border border-slate-800 transition-all inline-flex items-center justify-center cursor-pointer min-h-[36px] min-w-[36px]"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 transition-transform duration-200 hover:-rotate-12" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ingest Signal</span>
              <span className="inline sm:hidden">Ingest</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport — Zero-Scroll Display Layout on Large Screens */}
      <main className="flex-1 min-h-0 max-w-[1840px] w-full mx-auto px-3 sm:px-6 py-2 sm:py-2.5 pb-[max(1rem,env(safe-area-inset-bottom,0px))] flex flex-col gap-2 sm:gap-2.5">
        {/* Live Wire Ticker */}
        {settings.showTicker && (
          <LiveHeadlineTicker
            items={filteredItems.length > 0 ? filteredItems : items}
            onSelectItem={(item) => setSelectedItem(item)}
            lastIngestedAt={lastIngestedAt}
            autoRefreshMin={settings.autoRefreshMin}
          />
        )}

        {/* Compact Filter & Categorization Strip */}
        <section
          aria-label="Dashboard Filters"
          className="bg-[#11161E] border border-slate-800/80 rounded-xl p-2.5 sm:px-3.5 sm:py-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shrink-0"
        >
          {/* Horizontal Swipe Rail for Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full lg:w-auto">
            {/* Vertical Filter */}
            <div
              role="group"
              aria-label="Industry Vertical"
              className="flex items-center p-0.5 bg-[#090C10] border border-slate-800 rounded-lg shrink-0"
            >
              {SECTORS.map((sector) => (
                <button
                  key={sector}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, sector }))}
                  className={`px-2 sm:px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filters.sector === sector
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sector === 'All' ? 'All Verticals' : sector}
                </button>
              ))}
            </div>

            {/* Event Type Filter */}
            <select
              aria-label="Event Type Filter"
              value={filters.eventType}
              onChange={(e) =>
                setFilters((f) => ({ ...f, eventType: e.target.value as EventType | 'All' }))
              }
              className="px-2.5 py-1.5 text-xs font-medium bg-[#090C10] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer shrink-0"
            >
              {EVENT_TYPES.map((evt) => (
                <option key={evt} value={evt}>
                  {evt === 'All' ? 'All Events' : evt}
                </option>
              ))}
            </select>

            {/* Timeframe Filter */}
            <div
              role="group"
              aria-label="Timeframe"
              className="flex items-center p-0.5 bg-[#090C10] border border-slate-800 rounded-lg shrink-0"
            >
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, timeframe: tf.value }))}
                  className={`px-2 sm:px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filters.timeframe === tf.value
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Sync Controls */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            <div className="relative flex-1 lg:w-52">
              <Search
                className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={filters.searchQuery}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, searchQuery: e.target.value }))
                }
                placeholder="Filter entities, hubs, tech..."
                aria-label="Search intelligence feed"
                className="w-full pl-8 pr-2.5 py-1.5 lg:py-1 text-xs bg-[#090C10] border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="button"
              onClick={() => handleIngestLiveRss(filters.region)}
              disabled={isIngesting}
              className="px-2.5 py-1.5 lg:py-1 text-xs font-medium bg-[#090C10] border border-slate-800 text-slate-300 rounded-lg hover:text-slate-100 hover:border-slate-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isIngesting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isIngesting
                  ? 'Syncing...'
                  : filters.region === 'All'
                  ? 'Sync Global RSS'
                  : `Sync ${filters.region}`}
              </span>
              <span className="inline sm:hidden">
                {isIngesting ? 'Syncing...' : 'Sync'}
              </span>
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2 py-1.5 lg:py-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </section>

        {/* Optional RSS Sync Notice */}
        {ingestFeedback && (
          <div className="bg-[#11161E] border border-slate-800 rounded-lg px-3.5 py-1.5 flex items-center justify-between gap-3 text-xs text-slate-300 shrink-0">
            <span className="truncate">{ingestFeedback}</span>
            <button
              type="button"
              onClick={() => setIngestFeedback(null)}
              className="text-slate-500 hover:text-slate-200 cursor-pointer shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Mobile Adaptive View Switcher (Hidden on md+ tablet/desktop) */}
        <div className="md:hidden flex items-center p-1 bg-[#11161E] border border-slate-800/90 rounded-xl gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMobileView('feed')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mobileView === 'feed'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Feed ({filteredItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileView('map')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mobileView === 'map'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileView('analytics')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mobileView === 'analytics'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileView('all')}
            className={`flex-none flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mobileView === 'all'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">All</span>
          </button>
        </div>

        {/* 4-Column Trend & Momentum KPI Strip */}
        <div
          className={
            mobileView === 'feed' || mobileView === 'map'
              ? 'hidden md:block'
              : 'block'
          }
        >
          <TrendMomentumStrip
            metrics={trendMetrics}
            activeScopeLabel={activeScopeLabel}
          />
        </div>

        {/* Zero-Scroll Full-Viewport Neo-Bento Wallboard Grid */}
        <section
          aria-label="Global Intelligence Wallboard"
          className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-2.5"
        >
          {/* Left Column (5 Cols on md+): Global Heatmap + Bottom Hub/Sector Strip */}
          <div
            className={`md:col-span-5 flex flex-col gap-2 sm:gap-2.5 min-h-0 ${
              mobileView === 'feed' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div
              className={`flex-1 min-h-[260px] md:min-h-0 ${
                mobileView === 'analytics' ? 'hidden md:block' : 'block'
              }`}
            >
              <GlobalHeatmap
                items={filteredItems}
                selectedRegion={filters.region}
                selectedCountry={filters.country}
                selectedHub={filters.hubCity}
                defaultMapMode={settings.defaultMapMode}
                isDark={isDark}
                onSelectRegion={(region: Region | 'All') =>
                  setFilters((f) => ({ ...f, region, country: null, hubCity: null }))
                }
                onSelectCountry={(country) =>
                  setFilters((f) => ({ ...f, country, hubCity: null }))
                }
                onSelectHub={(hubCity, country) =>
                  setFilters((f) => ({ ...f, hubCity, country }))
                }
              />
            </div>

            <div
              className={`min-h-[175px] md:h-[180px] xl:h-[190px] shrink-0 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-2.5 ${
                mobileView === 'feed' ? 'hidden md:grid' : 'grid'
              }`}
            >
              <div
                className={`${
                  mobileView === 'map' ? 'col-span-full' : 'sm:col-span-7'
                } min-h-[175px] h-full`}
              >
                <HubLeaderboardCard
                  items={filteredItems}
                  selectedHub={filters.hubCity}
                  onSelectHub={(hubCity, country) =>
                    setFilters((f) => ({ ...f, hubCity, country }))
                  }
                />
              </div>
              <div
                className={`sm:col-span-5 min-h-[175px] h-full ${
                  mobileView === 'map' ? 'hidden md:block' : 'block'
                }`}
              >
                <SectorMixCard items={filteredItems} />
              </div>
            </div>
          </div>

          {/* Right Column (7 Cols on md+): Auto-Rotating Executive Feed + Gemini Synthesis */}
          <div
            className={`md:col-span-7 flex flex-col gap-2 sm:gap-2.5 min-h-0 ${
              mobileView === 'map' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div
              className={`flex-1 min-h-0 ${
                mobileView === 'analytics' ? 'hidden md:block' : 'block'
              }`}
            >
              <IntelligenceFeed
                items={filteredItems}
                selectedItemId={selectedItem?.id || null}
                onSelectItem={(item) => setSelectedItem(item)}
                onResetFilters={handleResetFilters}
                isIngesting={isIngesting}
                autoCycleEnabled={settings.autoCycleFeed}
                cycleIntervalSec={settings.cycleIntervalSec}
              />
            </div>

            <div
              className={`min-h-[105px] md:h-[110px] xl:h-[120px] shrink-0 ${
                mobileView === 'map' ? 'hidden md:block' : 'block'
              }`}
            >
              <ExecutiveSynthesisCard
                items={filteredItems}
                activeScopeLabel={activeScopeLabel}
              />
            </div>
          </div>
        </section>
      </main>

      {/* Top-Left Hamburger Control Center Drawer */}
      <ControlDrawer
        isOpen={isControlDrawerOpen}
        onClose={() => setIsControlDrawerOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetSettings={handleResetSettings}
        filteredItems={filteredItems}
        onIngestLiveRss={handleIngestLiveRss}
        isIngesting={isIngesting}
        themeMode={themeMode}
        onSelectThemeMode={setThemeMode}
        resolvedTheme={resolvedTheme}
      />

      {/* Executive Brief Slide-Over Drawer */}
      <SignalDetailDrawer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onFilterByHub={(hubCity, country) =>
          setFilters((f) => ({ ...f, hubCity, country }))
        }
      />

      {/* Live RSS & Custom Signal Analysis Modal */}
      <SignalSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onIngestLiveRss={handleIngestLiveRss}
        onSignalAnalyzed={(updatedItems, newItem) => {
          setItems(updatedItems);
          setSelectedItem(newItem);
          setIngestFeedback(`Analyzed and plotted "${newItem.headline}" in ${newItem.hubCity}.`);
        }}
        isIngesting={isIngesting}
        lastIngestedAt={lastIngestedAt}
      />
    </div>
  );
}
