import type {
  EventType,
  IntelligenceItem,
  Region,
  Sector,
  Timeframe,
} from '../types/intelligence.ts';

export interface DashboardFilters {
  sector: Sector | 'All';
  eventType: EventType | 'All';
  timeframe: Timeframe;
  region: Region | 'All';
  country: string | null;
  hubCity: string | null;
  searchQuery: string;
}

export interface HubSummary {
  hubCity: string;
  country: string;
  countryNameMatch: string;
  region: Region;
  lat: number;
  lng: number;
  count: number;
  totalImpact: number;
  avgImpact: number;
  dominantSector: Sector;
  latestItem: IntelligenceItem;
}

export interface TrendMetrics {
  totalCount: number;
  last24hCount: number;
  fastestHub: {
    hubCity: string;
    country: string;
    count: number;
    dominantSector: Sector;
  } | null;
  topTechnology: {
    tag: string;
    count: number;
    sector: Sector;
  } | null;
  constructivePct: number;
  sentimentLabel: string;
  dominantEventType: EventType | 'Mixed';
}

export const SECTOR_COLORS: Record<Sector, { hex: string; text: string; bar: string; dot: string }> = {
  Banking: {
    hex: '#10B981',
    text: 'text-emerald-400',
    bar: 'bg-emerald-500',
    dot: '#10B981',
  },
  FinTech: {
    hex: '#38BDF8',
    text: 'text-sky-400',
    bar: 'bg-sky-400',
    dot: '#38BDF8',
  },
  AI: {
    hex: '#818CF8',
    text: 'text-indigo-400',
    bar: 'bg-indigo-400',
    dot: '#818CF8',
  },
};

export function getTimeframeCutoffMs(timeframe: Timeframe): number {
  const now = Date.now();
  if (timeframe === '24h') return now - 24 * 60 * 60 * 1000;
  if (timeframe === '7d') return now - 7 * 24 * 60 * 60 * 1000;
  if (timeframe === '30d') return now - 30 * 24 * 60 * 60 * 1000;
  return 0;
}

export function filterIntelligenceItems(
  items: IntelligenceItem[],
  filters: DashboardFilters
): IntelligenceItem[] {
  const cutoff = getTimeframeCutoffMs(filters.timeframe);
  const q = filters.searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    const publishedMs = new Date(item.publishedAt).getTime();
    if (publishedMs < cutoff) return false;
    if (filters.sector !== 'All' && item.sector !== filters.sector) return false;
    if (filters.eventType !== 'All' && item.eventType !== filters.eventType) return false;
    if (filters.region !== 'All' && item.region !== filters.region) return false;
    if (
      filters.country &&
      item.country.toLowerCase() !== filters.country.toLowerCase() &&
      item.countryNameMatch.toLowerCase() !== filters.country.toLowerCase()
    ) {
      return false;
    }
    if (filters.hubCity && item.hubCity.toLowerCase() !== filters.hubCity.toLowerCase()) {
      return false;
    }
    if (q) {
      const haystack = [
        item.headline,
        item.executiveSummary,
        item.source,
        item.hubCity,
        item.country,
        item.technologyTag,
        ...item.entities,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function aggregateByHub(items: IntelligenceItem[]): HubSummary[] {
  const map = new Map<string, IntelligenceItem[]>();

  for (const item of items) {
    const key = `${item.hubCity}::${item.country}`;
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }

  const summaries: HubSummary[] = [];
  for (const [, list] of map) {
    const sorted = [...list].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    const totalImpact = list.reduce((acc, i) => acc + i.impactWeight, 0);
    const sectorCounts = new Map<Sector, number>();
    for (const item of list) {
      sectorCounts.set(item.sector, (sectorCounts.get(item.sector) || 0) + 1);
    }
    let dominantSector: Sector = sorted[0].sector;
    let maxSectorCount = 0;
    for (const [sec, cnt] of sectorCounts) {
      if (cnt > maxSectorCount) {
        maxSectorCount = cnt;
        dominantSector = sec;
      }
    }

    summaries.push({
      hubCity: sorted[0].hubCity,
      country: sorted[0].country,
      countryNameMatch: sorted[0].countryNameMatch,
      region: sorted[0].region,
      lat: sorted[0].lat,
      lng: sorted[0].lng,
      count: list.length,
      totalImpact,
      avgImpact: totalImpact / list.length,
      dominantSector,
      latestItem: sorted[0],
    });
  }

  return summaries.sort((a, b) => b.totalImpact - a.totalImpact);
}

export function computeTrendMetrics(items: IntelligenceItem[]): TrendMetrics {
  const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
  const last24hCount = items.filter((i) => new Date(i.publishedAt).getTime() >= cutoff24h).length;

  const hubs = aggregateByHub(items);
  const fastestHub = hubs[0]
    ? {
        hubCity: hubs[0].hubCity,
        country: hubs[0].country,
        count: hubs[0].count,
        dominantSector: hubs[0].dominantSector,
      }
    : null;

  const techMap = new Map<string, { count: number; sector: Sector; impact: number }>();
  for (const item of items) {
    const existing = techMap.get(item.technologyTag);
    if (existing) {
      existing.count += 1;
      existing.impact += item.impactWeight;
    } else {
      techMap.set(item.technologyTag, { count: 1, sector: item.sector, impact: item.impactWeight });
    }
  }

  let topTechnology: TrendMetrics['topTechnology'] = null;
  let bestTechScore = -1;
  for (const [tag, info] of techMap) {
    const score = info.count * 10 + info.impact;
    if (score > bestTechScore) {
      bestTechScore = score;
      topTechnology = { tag, count: info.count, sector: info.sector };
    }
  }

  const constructiveCount = items.filter((i) => i.sentiment === 'Constructive').length;
  const constructivePct = items.length > 0 ? Math.round((constructiveCount / items.length) * 100) : 0;

  let sentimentLabel = 'Balanced';
  if (items.length === 0) sentimentLabel = 'No Signals';
  else if (constructivePct >= 75) sentimentLabel = 'Strong Expansion';
  else if (constructivePct >= 55) sentimentLabel = 'Constructive Bias';
  else sentimentLabel = 'Regulatory Caution';

  const eventCounts = new Map<EventType, number>();
  for (const item of items) {
    eventCounts.set(item.eventType, (eventCounts.get(item.eventType) || 0) + 1);
  }
  let dominantEventType: EventType | 'Mixed' = 'Mixed';
  let maxEvent = 0;
  for (const [evt, cnt] of eventCounts) {
    if (cnt > maxEvent) {
      maxEvent = cnt;
      dominantEventType = evt;
    }
  }

  return {
    totalCount: items.length,
    last24hCount,
    fastestHub,
    topTechnology,
    constructivePct,
    sentimentLabel,
    dominantEventType,
  };
}

export function formatRelativeTime(isoString: string): string {
  const published = new Date(isoString);
  const diffMs = Date.now() - published.getTime();

  if (diffMs < 60000) return 'Just now';

  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  // For older articles, return actual formatted publication date (e.g. Feb 5, 2025)
  return published.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: published.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export function buildScopeLabel(filters: DashboardFilters): string {
  const parts: string[] = [];
  parts.push(filters.sector === 'All' ? 'All Verticals' : filters.sector);
  if (filters.eventType !== 'All') parts.push(filters.eventType);
  if (filters.hubCity) parts.push(filters.hubCity);
  else if (filters.country) parts.push(filters.country);
  else if (filters.region !== 'All') parts.push(filters.region);
  else parts.push('Global');
  parts.push(filters.timeframe === 'all' ? 'ALL TIME' : filters.timeframe.toUpperCase());
  return parts.join(' · ');
}

export function resolveSourceUrl(item: { url: string; headline: string; source: string }): string {
  const { url, headline, source } = item;
  const cleanHeadline = (headline || '').trim();
  const cleanSource = (source || '').trim();

  // Build a resilient Google Search fallback query if no valid URL exists
  const headlineWords = cleanHeadline
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const query = cleanSource && !headlineWords.toLowerCase().includes(cleanSource.toLowerCase())
    ? `${cleanSource} ${headlineWords}`
    : headlineWords;

  // Use general Google web search as fallback to guarantee results (news.google.com returns zero items for niche queries)
  const searchFallback = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  if (!url || url.trim() === '') {
    return searchFallback;
  }

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;

    // Check if the URL is just a bare domain homepage
    const isBareRoot =
      pathname === '' ||
      pathname === '/' ||
      pathname === '/index.html' ||
      pathname === '/index.htm';

    // Only match actual feed endpoints — do NOT match Google News article redirects like /rss/articles/...
    const isFeed =
      pathname.endsWith('/feed') ||
      pathname.endsWith('/feed/') ||
      pathname === '/rss' ||
      pathname === '/rss/' ||
      pathname.endsWith('.xml') ||
      pathname.endsWith('.rss');

    // If it's a real article URL or article redirect, use it directly
    if (!isBareRoot && !isFeed) {
      return url;
    }

    return searchFallback;
  } catch {
    return searchFallback;
  }
}
