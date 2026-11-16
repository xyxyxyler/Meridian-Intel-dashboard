import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Loader2,
  Monitor,
  Moon,
  Plus,
  RefreshCw,
  Rss,
  Server,
  SlidersHorizontal,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import type {
  DashboardSettings,
  IntelligenceItem,
  NewsSourceEndpoint,
  Region,
  Sector,
  ThemeMode,
  Timeframe,
} from '../types/intelligence.ts';

interface ControlDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DashboardSettings;
  onUpdateSettings: (next: DashboardSettings) => void;
  onResetSettings: () => void;
  filteredItems: IntelligenceItem[];
  onIngestLiveRss: (region?: Region | 'All') => Promise<void>;
  isIngesting: boolean;
  themeMode?: ThemeMode;
  onSelectThemeMode?: (mode: ThemeMode) => void;
  resolvedTheme?: 'dark' | 'light';
}

type DrawerTab = 'settings' | 'feeds' | 'endpoints';

const REGIONS: Region[] = [
  'North America',
  'Europe',
  'Asia-Pacific',
  'Oceania',
  'Middle East',
  'Latin America',
  'Africa',
];

const SECTORS: Sector[] = ['Banking', 'FinTech', 'AI'];

const API_ENDPOINT_DOCS = [
  {
    method: 'GET',
    path: '/api/intelligence',
    description: 'Returns all indexed and live-ingested intelligence items sorted by recency.',
    testable: true,
  },
  {
    method: 'GET',
    path: '/api/intelligence/region/Africa',
    description: 'Returns regional signals and local RSS endpoints for a specific continent.',
    testable: true,
  },
  {
    method: 'GET',
    path: '/api/sources',
    description: 'Lists all configured local, regional, and global RSS news endpoints.',
    testable: true,
  },
  {
    method: 'POST',
    path: '/api/sources',
    description: 'Validates and registers a custom RSS/Atom news endpoint.',
    testable: false,
  },
  {
    method: 'POST',
    path: '/api/intelligence/ingest',
    description: 'Polls active regional feeds with balanced continental sampling and Gemini enrichment.',
    testable: false,
  },
  {
    method: 'POST',
    path: '/api/intelligence/briefing',
    description: 'Synthesizes an executive thesis, key inflection signals, and watchlist via Gemini.',
    testable: false,
  },
  {
    method: 'GET',
    path: '/api/health',
    description: 'Returns server readiness and total indexed intelligence signal count.',
    testable: true,
  },
];

export function ControlDrawer({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings,
  filteredItems,
  onIngestLiveRss,
  isIngesting,
  themeMode = 'system',
  onSelectThemeMode,
  resolvedTheme = 'dark',
}: ControlDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('settings');
  const [sources, setSources] = useState<NewsSourceEndpoint[]>([]);
  const [sourceRegionFilter, setSourceRegionFilter] = useState<Region | 'All'>('All');
  const [isLoadingSources, setIsLoadingSources] = useState(false);

  // Add custom RSS endpoint form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newRegion, setNewRegion] = useState<Region>('North America');
  const [newScope, setNewScope] = useState<'Local' | 'Regional' | 'Global'>('Local');
  const [newSector, setNewSector] = useState<Sector>('FinTech');
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  // Endpoint tester state
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [testOutput, setTestOutput] = useState<{ path: string; body: string } | null>(null);
  const [isTestingPath, setIsTestingPath] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingSources(true);
    fetch('/api/sources')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { sources?: NewsSourceEndpoint[] } | null) => {
        if (data?.sources) setSources(data.sources);
      })
      .finally(() => setIsLoadingSources(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredSources = useMemo(() => {
    if (sourceRegionFilter === 'All') return sources;
    return sources.filter((s) => s.region === sourceRegionFilter);
  }, [sources, sourceRegionFilter]);

  if (!isOpen) return null;

  const handleToggleSource = async (source: NewsSourceEndpoint) => {
    try {
      const res = await fetch(`/api/sources/${encodeURIComponent(source.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: source.enabled === false }),
      });
      const data = (await res.json()) as { sources?: NewsSourceEndpoint[] };
      if (res.ok && data.sources) {
        setSources(data.sources);
      }
    } catch {
      // Ignore transient network error
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSourceError(null);
    setIsAddingSource(true);
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          url: newUrl,
          region: newRegion,
          scope: newScope,
          defaultSector: newSector,
        }),
      });
      const data = (await res.json()) as { sources?: NewsSourceEndpoint[]; error?: string };
      if (!res.ok || !data.sources) {
        throw new Error(data.error || 'Failed to register RSS endpoint.');
      }
      setSources(data.sources);
      setNewName('');
      setNewUrl('');
      setShowAddForm(false);
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : 'Unable to add RSS endpoint.');
    } finally {
      setIsAddingSource(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      const res = await fetch(`/api/sources/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = (await res.json()) as { sources?: NewsSourceEndpoint[] };
      if (res.ok && data.sources) {
        setSources(data.sources);
      }
    } catch {
      // Ignore
    }
  };

  const handleExport = (format: 'json' | 'csv') => {
    const timestamp = new Date().toISOString().slice(0, 10);
    let content = '';
    let mime = 'application/json';
    let filename = `meridian-intel-${timestamp}.json`;

    if (format === 'json') {
      content = JSON.stringify(filteredItems, null, 2);
    } else {
      mime = 'text/csv;charset=utf-8;';
      filename = `meridian-intel-${timestamp}.csv`;
      const header = [
        'ID',
        'PublishedAt',
        'Sector',
        'EventType',
        'Region',
        'Country',
        'HubCity',
        'Source',
        'Headline',
        'ExecutiveSummary',
        'URL',
      ].join(',');
      const escapeCsv = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
      const rows = filteredItems.map((i) =>
        [
          i.id,
          i.publishedAt,
          i.sector,
          i.eventType,
          i.region,
          i.country,
          i.hubCity,
          i.source,
          i.headline,
          i.executiveSummary,
          i.url,
        ]
          .map(escapeCsv)
          .join(',')
      );
      content = [header, ...rows].join('\n');
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard?.writeText(`${window.location.origin}${path}`);
    setCopiedPath(path);
    window.setTimeout(() => setCopiedPath(null), 1800);
  };

  const handleTestEndpoint = async (path: string) => {
    setIsTestingPath(path);
    try {
      const res = await fetch(path);
      const text = await res.text();
      let formatted = text;
      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // Keep raw text
      }
      setTestOutput({ path, body: formatted.slice(0, 1400) });
    } catch (err) {
      setTestOutput({
        path,
        body: err instanceof Error ? err.message : 'Request failed.',
      });
    } finally {
      setIsTestingPath(null);
    }
  };

  const enabledCount = sources.filter((s) => s.enabled !== false).length;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-start bg-black/65 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Dashboard Settings and API Management"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-xl bg-[#11161E] border-r border-slate-800 h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-100 tracking-tight">
              Control Center
            </h2>
            <p className="text-xs text-slate-400">
              Display preferences, news source endpoints, and API directory
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close control drawer"
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="px-6 pt-3 border-b border-slate-800 flex items-center gap-6 text-xs font-medium shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-3 inline-flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'text-amber-300 border-amber-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Display Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feeds')}
            className={`pb-3 inline-flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'feeds'
                ? 'text-amber-300 border-amber-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Rss className="w-3.5 h-3.5" />
            <span>News Feeds ({enabledCount}/{sources.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('endpoints')}
            className={`pb-3 inline-flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'endpoints'
                ? 'text-amber-300 border-amber-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>API Endpoints</span>
          </button>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 intel-scroll">
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Theme & Color Scheme */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-300">
                    Theme & Color Scheme
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Active: {resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </div>

                <div className="bg-[#090C10] border border-slate-800/80 rounded-xl p-3">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectThemeMode?.('light')}
                      className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        themeMode === 'light'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-sm'
                          : 'bg-[#11161E] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                      <span className="text-xs font-medium">Light</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectThemeMode?.('dark')}
                      className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        themeMode === 'dark'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-sm'
                          : 'bg-[#11161E] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                      <span className="text-xs font-medium">Dark</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectThemeMode?.('system')}
                      className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        themeMode === 'system'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-sm'
                          : 'bg-[#11161E] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <Monitor className="w-4 h-4" />
                      <span className="text-xs font-medium">System</span>
                    </button>
                  </div>
                  <p className="mt-2.5 text-[11px] text-slate-400 text-center">
                    {themeMode === 'system'
                      ? `Syncing with OS preference (currently ${resolvedTheme})`
                      : `Pinned to ${themeMode} mode`}
                  </p>
                </div>
              </section>

              {/* Wallboard Rotation */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-300">
                  Wallboard Display & Rotation
                </h3>

                <div className="bg-[#090C10] border border-slate-800/80 rounded-xl divide-y divide-slate-800/70">
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        Auto-Cycle Intelligence Feed
                      </div>
                      <div className="text-xs text-slate-400">
                        Automatically rotate feed pages for unattended display monitors
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.autoCycleFeed}
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          autoCycleFeed: !settings.autoCycleFeed,
                        })
                      }
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
                        settings.autoCycleFeed
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {settings.autoCycleFeed ? 'Enabled' : 'Paused'}
                    </button>
                  </div>

                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        Page Rotation Interval
                      </div>
                      <div className="text-xs text-slate-400">
                        Dwell duration per 3-card intelligence page
                      </div>
                    </div>
                    <div className="flex items-center p-0.5 bg-[#11161E] border border-slate-800 rounded-lg shrink-0">
                      {([8, 12, 20, 30] as const).map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() =>
                            onUpdateSettings({ ...settings, cycleIntervalSec: sec })
                          }
                          className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                            settings.cycleIntervalSec === sec
                              ? 'bg-slate-800 text-amber-300'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        Live Wire Ticker Ribbon
                      </div>
                      <div className="text-xs text-slate-400">
                        Show scrolling headline ticker across top of dashboard
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.showTicker}
                      onClick={() =>
                        onUpdateSettings({ ...settings, showTicker: !settings.showTicker })
                      }
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
                        settings.showTicker
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {settings.showTicker ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                </div>
              </section>

              {/* Default Views & Sync */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-300">
                  Defaults & Background Sync
                </h3>

                <div className="bg-[#090C10] border border-slate-800/80 rounded-xl divide-y divide-slate-800/70">
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        Default Map Layer
                      </div>
                      <div className="text-xs text-slate-400">
                        Choose between hotspot density halos or country choropleth
                      </div>
                    </div>
                    <div className="flex items-center p-0.5 bg-[#11161E] border border-slate-800 rounded-lg shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSettings({ ...settings, defaultMapMode: 'hotspots' })
                        }
                        className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                          settings.defaultMapMode === 'hotspots'
                            ? 'bg-slate-800 text-slate-100'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Hotspots
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSettings({ ...settings, defaultMapMode: 'choropleth' })
                        }
                        className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                          settings.defaultMapMode === 'choropleth'
                            ? 'bg-slate-800 text-slate-100'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Countries
                      </button>
                    </div>
                  </div>

                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        Default Timeframe Window
                      </div>
                      <div className="text-xs text-slate-400">
                        Time horizon applied when resetting filters
                      </div>
                    </div>
                    <select
                      aria-label="Default Timeframe"
                      value={settings.defaultTimeframe}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          defaultTimeframe: e.target.value as Timeframe,
                        })
                      }
                      className="px-3 py-1.5 text-xs font-medium bg-[#11161E] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="24h">Live / 24h</option>
                      <option value="7d">7 Days</option>
                      <option value="30d">30 Days</option>
                    </select>
                  </div>

                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        Auto-Sync RSS Interval
                      </div>
                      <div className="text-xs text-slate-400">
                        Periodic background polling across enabled continental feeds
                      </div>
                    </div>
                    <select
                      aria-label="Auto-Sync Interval"
                      value={settings.autoRefreshMin}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          autoRefreshMin: Number(e.target.value) as 0 | 5 | 15 | 30,
                        })
                      }
                      className="px-3 py-1.5 text-xs font-medium bg-[#11161E] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value={0}>Manual Only</option>
                      <option value={5}>Every 5 min</option>
                      <option value={15}>Every 15 min</option>
                      <option value={30}>Every 30 min</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Export & Reset */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-300">
                  Intelligence Export & Reset
                </h3>
                <div className="bg-[#090C10] border border-slate-800/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExport('csv')}
                      disabled={filteredItems.length === 0}
                      className="px-3.5 py-2 text-xs font-medium bg-slate-800 text-slate-100 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV ({filteredItems.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('json')}
                      disabled={filteredItems.length === 0}
                      className="px-3.5 py-2 text-xs font-medium bg-slate-800 text-slate-100 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export JSON</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={onResetSettings}
                    className="text-xs font-medium text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    Restore Defaults
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'feeds' && (
            <div className="space-y-4">
              {/* Top Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <select
                  aria-label="Filter feeds by continent"
                  value={sourceRegionFilter}
                  onChange={(e) => setSourceRegionFilter(e.target.value as Region | 'All')}
                  className="px-3 py-1.5 text-xs font-medium bg-[#090C10] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="All">All Continents ({sources.length})</option>
                  {REGIONS.map((reg) => (
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm((prev) => !prev)}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-slate-100 rounded-lg hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Feed Endpoint</span>
                  </button>

                  <button
                    type="button"
                    disabled={isIngesting}
                    onClick={() => onIngestLiveRss(sourceRegionFilter)}
                    className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isIngesting ? 'animate-spin' : ''}`} />
                    <span>{isIngesting ? 'Syncing...' : 'Sync Active'}</span>
                  </button>
                </div>
              </div>

              {/* Add Custom RSS Endpoint Form */}
              {showAddForm && (
                <form
                  onSubmit={handleAddSource}
                  className="bg-[#090C10] border border-amber-500/40 rounded-xl p-4 space-y-3"
                >
                  <div className="text-xs font-semibold text-amber-300">
                    Register Custom Local or Regional RSS/Atom Feed
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Source Name (e.g. Nikkei FinTech)"
                      className="px-3 py-2 text-xs bg-[#11161E] border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="url"
                      required
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="https://example.com/rss.xml"
                      className="px-3 py-2 text-xs bg-[#11161E] border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <select
                      aria-label="Continent"
                      value={newRegion}
                      onChange={(e) => setNewRegion(e.target.value as Region)}
                      className="px-2.5 py-2 text-xs bg-[#11161E] border border-slate-800 rounded-lg text-slate-200 cursor-pointer"
                    >
                      {REGIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Scope"
                      value={newScope}
                      onChange={(e) =>
                        setNewScope(e.target.value as 'Local' | 'Regional' | 'Global')
                      }
                      className="px-2.5 py-2 text-xs bg-[#11161E] border border-slate-800 rounded-lg text-slate-200 cursor-pointer"
                    >
                      <option value="Local">Local</option>
                      <option value="Regional">Regional</option>
                      <option value="Global">Global</option>
                    </select>

                    <select
                      aria-label="Default Sector"
                      value={newSector}
                      onChange={(e) => setNewSector(e.target.value as Sector)}
                      className="px-2.5 py-2 text-xs bg-[#11161E] border border-slate-800 rounded-lg text-slate-200 cursor-pointer"
                    >
                      {SECTORS.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                    </select>
                  </div>

                  {sourceError && (
                    <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200">
                      {sourceError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setSourceError(null);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingSource}
                      className="px-3.5 py-1.5 text-xs font-medium bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {isAddingSource && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Validate & Add</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Sources List */}
              {isLoadingSources ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Loading configured news endpoints...
                </div>
              ) : (
                <div className="bg-[#090C10] border border-slate-800/80 rounded-xl divide-y divide-slate-800/70">
                  {filteredSources.map((src) => {
                    const isEnabled = src.enabled !== false;
                    return (
                      <div
                        key={src.id}
                        className="p-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-medium text-slate-200 truncate">
                              {src.name}
                            </span>
                            <span className="text-slate-500 shrink-0">
                              {src.region} · {src.scope} · {src.defaultSector}
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 truncate mt-0.5">
                            {src.url}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {src.custom && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSource(src.id)}
                              aria-label={`Remove ${src.name}`}
                              className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isEnabled}
                            onClick={() => handleToggleSource(src)}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                              isEnabled
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isEnabled ? 'Active' : 'Paused'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'endpoints' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Internal full-stack REST endpoints powering Meridian Intel. Click{' '}
                <span className="text-slate-200 font-medium">Test</span> on any GET route to
                inspect live JSON payloads directly from the server.
              </p>

              <div className="bg-[#090C10] border border-slate-800/80 rounded-xl divide-y divide-slate-800/70">
                {API_ENDPOINT_DOCS.map((ep) => (
                  <div key={`${ep.method}-${ep.path}`} className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`font-mono text-[11px] font-semibold ${
                            ep.method === 'GET' ? 'text-sky-400' : 'text-amber-400'
                          }`}
                        >
                          {ep.method}
                        </span>
                        <code className="font-mono text-xs text-slate-200 truncate">
                          {ep.path}
                        </code>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyPath(ep.path)}
                          className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Copy full URL"
                        >
                          {copiedPath === ep.path ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {ep.testable && (
                          <button
                            type="button"
                            onClick={() => handleTestEndpoint(ep.path)}
                            disabled={isTestingPath === ep.path}
                            className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 text-slate-200 rounded hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            {isTestingPath === ep.path ? 'Testing...' : 'Test'}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {ep.description}
                    </p>
                  </div>
                ))}
              </div>

              {testOutput && (
                <div className="bg-[#090C10] border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-amber-300">Response · {testOutput.path}</span>
                    <button
                      type="button"
                      onClick={() => setTestOutput(null)}
                      className="text-slate-500 hover:text-slate-200 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-slate-300 max-h-52 overflow-auto intel-scroll whitespace-pre-wrap break-words">
                    {testOutput.body}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
