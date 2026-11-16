export type Sector = 'Banking' | 'FinTech' | 'AI';

export type EventType =
  | 'Product Launch'
  | 'M&A/Funding'
  | 'Tech Breakthrough'
  | 'Regulation';

export type Region =
  | 'North America'
  | 'Europe'
  | 'Asia-Pacific'
  | 'Oceania'
  | 'Middle East'
  | 'Latin America'
  | 'Africa';

export type Timeframe = '24h' | '7d' | '30d';

export type Sentiment = 'Constructive' | 'Neutral' | 'Cautious';

export type ThemeMode = 'system' | 'dark' | 'light';

export interface IntelligenceItem {
  id: string;
  headline: string;
  source: string;
  url: string;
  publishedAt: string; // ISO 8601 timestamp
  sector: Sector;
  eventType: EventType;
  region: Region;
  country: string;
  countryNameMatch: string; // Name matching world-atlas TopoJSON
  hubCity: string;
  lat: number;
  lng: number;
  executiveSummary: string;
  entities: string[];
  technologyTag: string;
  impactWeight: number; // 1 to 10 materiality magnitude
  capitalOrScaleLabel: string; // e.g., "$240M Series C" or "Tier-1 Core Rollout"
  sentiment: Sentiment;
  isLiveIngested?: boolean;
}

export interface ExecutiveBriefing {
  scopeLabel: string;
  generatedAt: string;
  strategicThesis: string;
  keySignals: string[];
  capitalAndRegulatoryOutlook: string;
  priorityWatchlist: string[];
}

export interface IntelligenceFeedResponse {
  items: IntelligenceItem[];
  lastIngestedAt: string;
  liveFeedCount: number;
  rssFeedsActive: number;
}

export interface NewsSourceEndpoint {
  id: string;
  name: string;
  region: Region;
  scope: 'Local' | 'Regional' | 'Global';
  url: string;
  defaultSector: Sector;
  enabled?: boolean;
  custom?: boolean;
}

export interface DashboardSettings {
  autoCycleFeed: boolean;
  cycleIntervalSec: 8 | 12 | 20 | 30;
  showTicker: boolean;
  defaultMapMode: 'hotspots' | 'choropleth';
  defaultTimeframe: Timeframe;
  autoRefreshMin: 0 | 5 | 15 | 30;
  themeMode?: ThemeMode;
}
