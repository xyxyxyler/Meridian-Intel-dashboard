import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Parser from 'rss-parser';
import { GoogleGenAI, Type } from '@google/genai';
import { BASELINE_INTELLIGENCE } from './src/data/baselineIntelligence.ts';
import type {
  ExecutiveBriefing,
  IntelligenceItem,
  NewsSourceEndpoint,
  Region,
  Sector,
  EventType,
  Sentiment,
} from './src/types/intelligence.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const GEMINI_MODEL = 'gemini-2.5-flash';
const GNEWS_API_KEY = process.env.GNEWS_API_KEY || 'c3049c9303733daed020e32a21c9a77e';

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        apiVersion: 'v1beta',
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const rssParser = new Parser({
  timeout: 4500,
  headers: {
    'User-Agent': 'MeridianIntel/1.0 (+Executive Intelligence Aggregator)',
  },
  customFields: {
    item: ['source', ['dc:creator', 'creator']],
  },
});

const BASE_RSS_SOURCES: NewsSourceEndpoint[] = [
  // North America (Local US & Canada)
  {
    id: 'us-banking-dive',
    name: 'Banking Dive (US)',
    region: 'North America',
    scope: 'Local',
    url: 'https://www.bankingdive.com/feeds/news/',
    defaultSector: 'Banking',
  },
  {
    id: 'ca-betakit',
    name: 'BetaKit (Canada)',
    region: 'North America',
    scope: 'Local',
    url: 'https://betakit.com/feed/',
    defaultSector: 'AI',
  },
  {
    id: 'us-tc-fintech',
    name: 'TechCrunch FinTech',
    region: 'North America',
    scope: 'Regional',
    url: 'https://techcrunch.com/category/fintech/feed/',
    defaultSector: 'FinTech',
  },
  {
    id: 'us-tc-ai',
    name: 'TechCrunch AI',
    region: 'North America',
    scope: 'Global',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    defaultSector: 'AI',
  },
  {
    id: 'us-gnews-local',
    name: 'US Banking & AI Wire',
    region: 'North America',
    scope: 'Local',
    url: 'https://news.google.com/rss/search?q=fintech+OR+banking+AI+US&hl=en-US&gl=US&ceid=US:en',
    defaultSector: 'Banking',
  },
  // Europe
  {
    id: 'eu-sifted',
    name: 'Sifted (Europe)',
    region: 'Europe',
    scope: 'Regional',
    url: 'https://sifted.eu/feed/',
    defaultSector: 'FinTech',
  },
  {
    id: 'eu-gnews-local',
    name: 'UK & EU Banking Wire',
    region: 'Europe',
    scope: 'Local',
    url: 'https://news.google.com/rss/search?q=fintech+OR+banking+AI+London+OR+Frankfurt+OR+Paris&hl=en-GB&gl=GB&ceid=GB:en',
    defaultSector: 'Banking',
  },
  // Asia-Pacific
  {
    id: 'apac-fintech-sg',
    name: 'Fintech News Singapore',
    region: 'Asia-Pacific',
    scope: 'Local',
    url: 'https://fintechnews.sg/feed/',
    defaultSector: 'FinTech',
  },
  {
    id: 'apac-gnews',
    name: 'APAC Finance & AI Wire',
    region: 'Asia-Pacific',
    scope: 'Regional',
    url: 'https://news.google.com/rss/search?q=fintech+OR+banking+AI+Singapore+OR+Tokyo+OR+India&hl=en-AU&gl=AU&ceid=AU:en',
    defaultSector: 'AI',
  },
  // Oceania
  {
    id: 'oceania-startup-daily',
    name: 'Startup Daily (Australia/NZ)',
    region: 'Oceania',
    scope: 'Local',
    url: 'https://www.startupdaily.net/feed/',
    defaultSector: 'AI',
  },
  // Middle East
  {
    id: 'mena-fintech-ae',
    name: 'Fintech News Middle East',
    region: 'Middle East',
    scope: 'Local',
    url: 'https://fintechnews.ae/feed/',
    defaultSector: 'FinTech',
  },
  {
    id: 'mena-gnews',
    name: 'MENA Banking & AI Wire',
    region: 'Middle East',
    scope: 'Regional',
    url: 'https://news.google.com/rss/search?q=fintech+OR+banking+AI+Dubai+OR+Riyadh&hl=en-US&gl=US&ceid=US:en',
    defaultSector: 'Banking',
  },
  // Latin America
  {
    id: 'latam-list',
    name: 'LatamList',
    region: 'Latin America',
    scope: 'Regional',
    url: 'https://latamlist.com/feed/',
    defaultSector: 'FinTech',
  },
  {
    id: 'latam-gnews',
    name: 'LatAm FinTech & Banking Wire',
    region: 'Latin America',
    scope: 'Local',
    url: 'https://news.google.com/rss/search?q=fintech+OR+banking+AI+Brazil+OR+Mexico+OR+Colombia&hl=en-US&gl=US&ceid=US:en',
    defaultSector: 'FinTech',
  },
  // Africa
  {
    id: 'africa-techcabal',
    name: 'TechCabal (Pan-Africa)',
    region: 'Africa',
    scope: 'Local',
    url: 'https://techcabal.com/feed/',
    defaultSector: 'FinTech',
  },
  {
    id: 'africa-disrupt',
    name: 'Disrupt Africa',
    region: 'Africa',
    scope: 'Regional',
    url: 'https://disrupt-africa.com/feed/',
    defaultSector: 'FinTech',
  },
  {
    id: 'africa-gnews',
    name: 'Africa Banking & AI Wire',
    region: 'Africa',
    scope: 'Local',
    url: 'https://news.google.com/rss/search?q=fintech+OR+banking+AI+Africa+OR+Nigeria+OR+Kenya&hl=en-US&gl=US&ceid=US:en',
    defaultSector: 'Banking',
  },
  {
    id: 'ke-fintech-wire',
    name: 'Kenya & East Africa Banking Wire',
    region: 'Africa',
    scope: 'Local',
    url: 'https://news.google.com/rss/search?q=Kenya+(fintech+OR+banking+OR+Safaricom+OR+%22Central+Bank%22+OR+%22M-Pesa%22)&hl=en-US&gl=US&ceid=US:en',
    defaultSector: 'FinTech',
  },
  {
    id: 'sa-banking-fintech',
    name: 'South Africa FinTech & Banking Wire',
    region: 'Africa',
    scope: 'Local',
    url: 'https://news.google.com/rss/search?q=%22South+Africa%22+(fintech+OR+banking+OR+Capitec+OR+TymeBank+OR+SARB+OR+Absa)&hl=en-US&gl=US&ceid=US:en',
    defaultSector: 'Banking',
  },
  {
    id: 'eg-fintech-wire',
    name: 'Egypt & North Africa FinTech Wire',
    region: 'Africa',
    scope: 'Local',
    url: 'https://news.google.com/rss/search?q=Egypt+(fintech+OR+banking+OR+Fawry+OR+Paymob+OR+%22Central+Bank%22)&hl=en-US&gl=US&ceid=US:en',
    defaultSector: 'FinTech',
  },
  {
    id: 'rw-kifc-wire',
    name: 'Rwanda & KIFC Financial Innovation Wire',
    region: 'Africa',
    scope: 'Local',
    url: 'https://news.google.com/rss/search?q=Rwanda+(fintech+OR+banking+OR+KIFC+OR+%22National+Bank+of+Rwanda%22)&hl=en-US&gl=US&ceid=US:en',
    defaultSector: 'FinTech',
  },
  {
    id: 'tz-ug-eastafrica-wire',
    name: 'Tanzania & Uganda Banking Wire',
    region: 'Africa',
    scope: 'Regional',
    url: 'https://news.google.com/rss/search?q=(Tanzania+OR+Uganda)+(fintech+OR+banking+OR+%22Bank+of+Tanzania%22+OR+%22mobile+money%22)&hl=en-US&gl=US&ceid=US:en',
    defaultSector: 'Banking',
  },
  {
    id: 'francophone-africa-wire',
    name: 'Francophone Africa (Senegal / Côte d\'Ivoire) Wire',
    region: 'Africa',
    scope: 'Regional',
    url: 'https://news.google.com/rss/search?q=(Senegal+OR+%22Ivory+Coast%22+OR+BCEAO+OR+Abidjan)+(fintech+OR+banking+OR+Wave)&hl=en-US&gl=US&ceid=US:en',
    defaultSector: 'FinTech',
  },
  // Dedicated Ghana FinTech, Banking & Technology Endpoints
  {
    id: 'gh-business-wire',
    name: 'Ghana Business & Financial Times (B&FT)',
    region: 'Africa',
    scope: 'Local',
    url: 'https://news.google.com/rss/search?q=site:thebftonline.com+(banking+OR+fintech+OR+%22mobile+money%22+OR+%22Bank+of+Ghana%22)&hl=en-US&gl=US&ceid=US:en',
    defaultSector: 'Banking',
  },
  {
    id: 'gh-citi-business',
    name: 'Citi Business News (Ghana)',
    region: 'Africa',
    scope: 'Local',
    url: 'https://news.google.com/rss/search?q=site:citinewsroom.com+(fintech+OR+%22mobile+money%22+OR+%22commercial+bank%22+OR+%22digital+banking%22+OR+%22e-cedi%22)&hl=en-US&gl=US&ceid=US:en',
    defaultSector: 'FinTech',
  },
  {
    id: 'gh-joy-business-tech',
    name: 'MyJoyOnline Business & Tech (Ghana)',
    region: 'Africa',
    scope: 'Local',
    url: 'https://news.google.com/rss/search?q=site:myjoyonline.com+(fintech+OR+%22commercial+bank%22+OR+%22mobile+money%22+OR+%22digital+banking%22+OR+%22artificial+intelligence%22)&hl=en-US&gl=US&ceid=US:en',
    defaultSector: 'AI',
  },
  {
    id: 'gh-fintech-bog',
    name: 'Ghana FinTech & Bank of Ghana Wire',
    region: 'Africa',
    scope: 'Local',
    url: 'https://news.google.com/rss/search?q=Ghana+(fintech+OR+%22mobile+money%22+OR+%22eCedi%22+OR+%22e-cedi%22+OR+%22GhIPSS%22+OR+(%22Bank+of+Ghana%22+AND+(fintech+OR+banking+OR+payments)))&hl=en-US&gl=US&ceid=US:en',
    defaultSector: 'FinTech',
  },
];

let rssSources: NewsSourceEndpoint[] = BASE_RSS_SOURCES.map((source) => ({
  ...source,
  enabled: true,
  custom: false,
}));

// In-memory intelligence store (initialized with verified baseline, enriched by live RSS + Gemini)
let intelligenceStore: IntelligenceItem[] = BASELINE_INTELLIGENCE.filter((item) =>
  isExecutiveRelevant(item.headline, item.executiveSummary)
);
let lastIngestedAt = new Date().toISOString();
let liveFeedCount = 0;
let activeRssFeedCount = 0;

interface RawRssArticle {
  headline: string;
  source: string;
  url: string;
  publishedAt: string;
  snippet: string;
  defaultSector: Sector;
  sourceRegion: Region;
}

function normalizeHeadline(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64);
}

function extractSourceAndCleanHeadline(
  rawHeadline: string,
  entrySource?: unknown,
  feedName?: string
): { cleanHeadline: string; sourcePublisher: string } {
  let cleanHeadline = (rawHeadline || '').trim();
  let sourcePublisher = '';

  // 1. Check entrySource from RSS item (could be string or object with _ or title)
  if (typeof entrySource === 'string' && entrySource.trim()) {
    sourcePublisher = entrySource.trim().replace(/\.com$/i, '').replace(/^www\./i, '');
  } else if (entrySource && typeof entrySource === 'object') {
    const obj = entrySource as Record<string, unknown>;
    const textVal = String(obj._ || obj['#text'] || obj.title || obj.name || '');
    if (textVal.trim()) {
      sourcePublisher = textVal.trim().replace(/\.com$/i, '').replace(/^www\./i, '');
    }
  }

  // 2. Google News & aggregator standard format: "Headline Text - Publisher Name"
  const trailingDashMatch = cleanHeadline.match(/^(.*?)\s+[-–—]\s+([^-–—]+)$/);
  if (trailingDashMatch) {
    const trailingPublisher = trailingDashMatch[2].trim();
    if (!sourcePublisher || sourcePublisher === feedName) {
      sourcePublisher = trailingPublisher.replace(/\.com$/i, '').replace(/^www\./i, '');
    }
    cleanHeadline = trailingDashMatch[1].trim();
  }

  // 3. Fallback to clean feedName if no publisher found (remove parenthetical scopes e.g. "TechCabal (Pan-Africa)" -> "TechCabal")
  if (!sourcePublisher && feedName) {
    sourcePublisher = feedName.replace(/\s*\([^)]*\)/g, '').trim();
  }

  cleanHeadline = cleanHeadline.replace(/\s+-\s+.*$/, '').trim();

  return { cleanHeadline, sourcePublisher: sourcePublisher || 'Institutional Wire' };
}

function isExecutiveRelevant(headline: string, snippet: string = ''): boolean {
  const text = `${headline} ${snippet}`.toLowerCase();

  // 1. Negative exclusion filter: drop non-financial/off-topic domains immediately
  const negativeRegex =
    /\b(cocoa|crop|crops|harvest|farming|farmer|farmers|livestock|fertilizer|fertilizers|food prices|food inflation|el ni[ñn]o|tomato|tomatoes|onion|maize|poultry|grain|cassava|showbiz|celebrity|celebrities|gossip|affair|mistress|spy|parliamentary|aspirant|aspirants|constituency|elections?|presidential candidate|ndc|npp|ballot|campaign rally|running mate|party chairman|football|soccer|premier league|black stars|afcon|fifa|stadium|coach|gas power plant|oil drilling|crude oil|bauxite mining|refinery|fuel prices|transport fares|cement prices|founder summit|doors open at|summit agenda|homework|school students|k-12|tutor|tutors|kindergarten|fashion week|movie review|horoscope|volkswagen|car manufacturing)\b/i;
  if (negativeRegex.test(text)) {
    return false;
  }

  // 2. Banknote cosmetic/portrait controversy or general consumer complaints
  if (
    /\b(portrait|banknote designs?|reverse designs?|quite shameful|mc yaa|heritage series banknotes?|numismatic)\b/i.test(
      text
    )
  ) {
    return false;
  }

  // 3. Positive inclusion criteria: must meaningfully relate to FinTech, Banking, or AI
  const fintechRegex =
    /\b(fintech|payments?|wallets?|remittances?|cross-border|settlements?|stablecoins?|crypto|tokeniz|defi|neobanks?|paystack|flutterwave|stripe|m-pesa|mobile money|momo|wave|qr code|pos terminal|open banking|digital lending|underwriting|credit card|interswitch|ghipss|e-?cedi|cbdc|clearinghouse|venture capital|fintech fund|investors?|exits?|venture|liquidity facility)\b/i;
  const bankingRegex =
    /\b(banks?|banking|banker|lenders?|central banks?|reserve banks?|monetary policy|liquidity|treasury|interest rates?|deposits?|loans?|credit access|capital adequacy|basel|m&a|merger|acquisition|takeover|sarb|cbk|cbe|cbn|bog|bceao|fca|sec|ecb|fdic|occ|revolut|barclays|absa|standard chartered|standard bank|capitec|tymebank|kifc|crdb|nmb|goldman|jpmorgan|citi|difc|private wealth|wealth management|sovereign wealth)\b/i;
  const aiRegex =
    /\b(ai|artificial intelligence|generative ai|agentic|llms?|neural|machine learning|deep learning|copilots?|chatgpt|openai|anthropic|nvidia|compute|chips? export|semiconductors?|foundation models?|model weights|autonomous agents?)\b/i;

  return fintechRegex.test(text) || bankingRegex.test(text) || aiRegex.test(text);
}

function inferTechnologyTag(text: string, sector: Sector): string {
  if (/\b(agentic|ai agent|autonomous agent|copilot)\b/i.test(text)) return 'Agentic AI';
  if (/\b(generative ai|llm|foundation model|chatgpt|openai|claude|gemini)\b/i.test(text)) return 'Generative AI';
  if (/\b(chip|semiconductor|gpu|compute|datacenter|nvidia)\b/i.test(text)) return 'Compute Infrastructure';
  if (/\b(underwriting|credit scoring|algorithmic underwriting|risk model)\b/i.test(text)) return 'Predictive Underwriting';
  if (/\b(stablecoin|crypto|tokeniz|dlt|blockchain|cbdc|e-?cedi|bakong|bitcoin|ethereum)\b/i.test(text)) return 'Digital Assets & DLT';
  if (/\b(cross-border|remittance|instant payment|real-time payment|payment rail|m-pesa|mobile money|momo|wave|switch|ghipss|clearing|settlement|visa|mastercard|pos terminal)\b/i.test(text)) return 'Payment Rails';
  if (/\b(cybersecurity|fraud|phishing|aml|kyc|identity|biometric)\b/i.test(text)) return 'Cybersecurity & Fraud';
  if (/\b(central bank|regulat|monetary policy|interest rate|guidance|compliance|licens|reserve bank|basel)\b/i.test(text)) return 'Prudential Regulation';
  if (/\b(m&a|merger|acquisition|takeover|debt facility|equity|capital raise|series [a-z]|valuation)\b/i.test(text)) return 'M&A & Capital Markets';
  if (/\b(core banking|modernization|digital banking|cloud banking|neobank)\b/i.test(text)) return 'Core Modernization';

  if (sector === 'AI') return 'Enterprise AI';
  if (sector === 'Banking') return 'Commercial Banking';
  return 'Financial Infrastructure';
}

async function fetchGNewsPanAfricaArticles(): Promise<RawRssArticle[]> {
  if (!GNEWS_API_KEY) return [];

  const queries = [
    'Kenya (fintech OR banking OR Safaricom OR M-Pesa)',
    '"South Africa" (fintech OR banking OR Capitec OR TymeBank OR SARB)',
    'Egypt (fintech OR banking OR "Central Bank" OR Fawry)',
    'Ghana ("Bank of Ghana" OR fintech OR "mobile money" OR "e-cedi")',
    'Rwanda ("KIFC" OR fintech OR banking)',
  ];

  const results: RawRssArticle[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  for (const query of queries) {
    try {
      const endpoint = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=8&apikey=${GNEWS_API_KEY}`;
      const response = await fetch(endpoint, {
        headers: { 'User-Agent': 'MeridianIntel/1.0 (+Executive Aggregator)' },
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as {
        articles?: Array<{
          title: string;
          description?: string;
          content?: string;
          url: string;
          publishedAt: string;
          source?: { name: string; url?: string };
        }>;
      };

      for (const article of data.articles || []) {
        if (!article.title || !article.url) continue;
        const normUrl = article.url.trim().toLowerCase();
        const normTitle = normalizeHeadline(article.title);
        if (seenUrls.has(normUrl) || seenTitles.has(normTitle)) continue;

        const snippet = (article.description || article.content || article.title).replace(/\s+/g, ' ').trim().slice(0, 480);
        const { cleanHeadline, sourcePublisher } = extractSourceAndCleanHeadline(
          article.title,
          article.source?.name,
          'Pan-Africa Financial Wire'
        );

        if (!isExecutiveRelevant(cleanHeadline, snippet)) continue;

        seenUrls.add(normUrl);
        seenTitles.add(normTitle);

        results.push({
          headline: cleanHeadline,
          source: sourcePublisher,
          url: article.url.trim(),
          publishedAt: article.publishedAt || new Date().toISOString(),
          snippet,
          defaultSector: 'FinTech',
          sourceRegion: 'Africa',
        });
      }
    } catch (err) {
      console.warn('[GNews API] Fetch error:', err instanceof Error ? err.message : err);
    }
  }

  return results;
}

async function fetchRssArticles(
  targetRegion?: Region | 'All'
): Promise<{ articles: RawRssArticle[]; activeFeeds: number }> {
  const enabledSources = rssSources.filter((s) => s.enabled !== false);
  const feedsToPoll =
    targetRegion && targetRegion !== 'All'
      ? enabledSources.filter((s) => s.region === targetRegion)
      : enabledSources;

  const results = await Promise.allSettled(
    feedsToPoll.map(async (feed) => {
      const parsed = await rssParser.parseURL(feed.url);
      const items = (parsed.items || []).slice(0, 4).map((entry) => {
        const rawHeadline = (entry.title || '').trim();
        const { cleanHeadline, sourcePublisher } = extractSourceAndCleanHeadline(
          rawHeadline,
          (entry as Record<string, unknown>).source,
          feed.name
        );
        let rawLink = (entry.link || '').trim();
        if (!rawLink || rawLink.endsWith('/feed/') || rawLink.endsWith('/feed')) {
          rawLink = `https://www.google.com/search?q=${encodeURIComponent(`${sourcePublisher} ${cleanHeadline}`)}`;
        }
        const snippet = (entry.contentSnippet || entry.content || '').replace(/\s+/g, ' ').trim().slice(0, 480);
        return {
          headline: cleanHeadline,
          source: sourcePublisher,
          url: rawLink,
          publishedAt: entry.isoDate ? new Date(entry.isoDate).toISOString() : new Date().toISOString(),
          snippet,
          defaultSector: feed.defaultSector,
          sourceRegion: feed.region,
        };
      });
      return items.filter((i) => i.headline.length > 15 && isExecutiveRelevant(i.headline, i.snippet));
    })
  );

  let activeFeeds = 0;
  const collected: RawRssArticle[] = [];

  for (const res of results) {
    if (res.status === 'fulfilled' && res.value.length > 0) {
      activeFeeds += 1;
      collected.push(...res.value);
    }
  }

  return { articles: collected, activeFeeds };
}

async function enrichArticlesWithGemini(articles: RawRssArticle[]): Promise<IntelligenceItem[]> {
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  if (articles.length === 0) return [];

  const promptPayload = articles.map((a, idx) => ({
    index: idx,
    headline: a.headline,
    source: a.source,
    snippet: a.snippet,
  }));

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `Analyze the following real-time news items for an executive intelligence dashboard covering Banking, FinTech, and Artificial Intelligence.
For each item, extract structured classification, geolocation coordinates for the primary corporate/regulatory hub mentioned (defaulting to the organization's global headquarters if not explicitly stated), key entities, and write a crisp 2-3 sentence executive summary explaining why this advancement matters strategically to banking, fintech, or AI executives.

Articles to analyze:
${JSON.stringify(promptPayload)}`,
    config: {
      systemInstruction:
        'You are a senior financial and technology intelligence analyst. Output strictly valid JSON matching the schema. Strict relevance requirement: set relevant to true ONLY if the item directly concerns Banking (commercial, retail, central banking, monetary policy, balance sheets, lending, capital markets), FinTech (digital payments, remittances, mobile money, switches, stablecoins, tokenization, open banking), or Enterprise/Frontier AI (LLMs, autonomous agents, AI compute, chips, credit models). Set relevant to false for off-topic general business or news including agriculture/crops/cocoa/farming, food inflation, weather/climate/El Niño, partisan politics/elections, celebrity gossip/scandals, conference schedules/opening hours, or general automotive/industrial manufacturing. Keep executiveSummary to 2-3 incisive, institutional-grade sentences explaining strategic impact. Classify Australia and New Zealand under region "Oceania". For pan-African developments, accurately assign the proper hub, country, and coordinates: Kenya (Nairobi: lat -1.2921, lng 36.8219), South Africa (Johannesburg: lat -26.2041, lng 28.0473 or Cape Town), Egypt (Cairo: lat 30.0444, lng 31.2357), Rwanda (Kigali: lat -1.9441, lng 30.0619), Senegal (Dakar: lat 14.7167, lng -17.4677), Côte d\'Ivoire (Abidjan: lat 5.3600, lng -4.0083), Tanzania (Dar es Salaam: lat -6.7924, lng 39.2083), Uganda (Kampala: lat 0.3476, lng 32.5825), Morocco (Casablanca: lat 33.5731, lng -7.5898), Nigeria (Lagos: lat 6.5244, lng 3.3792), Ghana (Accra: lat 5.6037, lng -0.1870). Ensure lat/lng accurately correspond to hubCity and countryNameMatch matches standard English country names.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            index: { type: Type.INTEGER },
            relevant: { type: Type.BOOLEAN, description: 'True if meaningfully related to Banking, FinTech, or enterprise/frontier AI.' },
            sector: { type: Type.STRING, description: 'One of: Banking, FinTech, AI' },
            eventType: { type: Type.STRING, description: 'One of: Product Launch, M&A/Funding, Tech Breakthrough, Regulation' },
            region: { type: Type.STRING, description: 'One of: North America, Europe, Asia-Pacific, Oceania, Middle East, Latin America, Africa' },
            country: { type: Type.STRING },
            countryNameMatch: { type: Type.STRING },
            hubCity: { type: Type.STRING },
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            executiveSummary: { type: Type.STRING },
            entities: { type: Type.ARRAY, items: { type: Type.STRING } },
            technologyTag: { type: Type.STRING, description: '2-3 word technology/theme tag' },
            impactWeight: { type: Type.NUMBER, description: 'Materiality weight from 6.0 to 9.8' },
            capitalOrScaleLabel: { type: Type.STRING, description: 'Concise scale or deal label e.g. $120M Series B or Tier-1 Rollout' },
            sentiment: { type: Type.STRING, description: 'One of: Constructive, Neutral, Cautious' },
          },
          required: [
            'index',
            'relevant',
            'sector',
            'eventType',
            'region',
            'country',
            'countryNameMatch',
            'hubCity',
            'lat',
            'lng',
            'executiveSummary',
            'entities',
            'technologyTag',
            'impactWeight',
            'capitalOrScaleLabel',
            'sentiment',
          ],
        },
      },
    },
  });

  const parsedText = (response.text ?? '[]').trim();
  const analyzed = JSON.parse(parsedText) as Array<{
    index: number;
    relevant: boolean;
    sector: string;
    eventType: string;
    region: string;
    country: string;
    countryNameMatch: string;
    hubCity: string;
    lat: number;
    lng: number;
    executiveSummary: string;
    entities: string[];
    technologyTag: string;
    impactWeight: number;
    capitalOrScaleLabel: string;
    sentiment: string;
  }>;

  const validSectors: Sector[] = ['Banking', 'FinTech', 'AI'];
  const validEvents: EventType[] = ['Product Launch', 'M&A/Funding', 'Tech Breakthrough', 'Regulation'];
  const validRegions: Region[] = [
    'North America',
    'Europe',
    'Asia-Pacific',
    'Oceania',
    'Middle East',
    'Latin America',
    'Africa',
  ];
  const validSentiments: Sentiment[] = ['Constructive', 'Neutral', 'Cautious'];

  const enriched: IntelligenceItem[] = [];
  for (const row of analyzed) {
    if (!row.relevant) continue;
    const raw = articles[row.index];
    if (!raw) continue;

    enriched.push({
      id: `live-${Date.now()}-${row.index}`,
      headline: raw.headline,
      source: raw.source,
      url: raw.url,
      publishedAt: raw.publishedAt,
      sector: validSectors.includes(row.sector as Sector) ? (row.sector as Sector) : raw.defaultSector,
      eventType: validEvents.includes(row.eventType as EventType) ? (row.eventType as EventType) : 'Product Launch',
      region: validRegions.includes(row.region as Region) ? (row.region as Region) : raw.sourceRegion,
      country: row.country || 'United States',
      countryNameMatch: row.countryNameMatch || row.country || 'United States of America',
      hubCity: row.hubCity || 'San Francisco',
      lat: typeof row.lat === 'number' && Number.isFinite(row.lat) ? row.lat : 37.7749,
      lng: typeof row.lng === 'number' && Number.isFinite(row.lng) ? row.lng : -122.4194,
      executiveSummary: row.executiveSummary,
      entities: Array.isArray(row.entities) ? row.entities.slice(0, 4) : [],
      technologyTag: row.technologyTag || 'Enterprise AI',
      impactWeight: Math.min(9.9, Math.max(5.5, Number(row.impactWeight) || 7.8)),
      capitalOrScaleLabel: row.capitalOrScaleLabel || 'Verified Signal',
      sentiment: validSentiments.includes(row.sentiment as Sentiment) ? (row.sentiment as Sentiment) : 'Constructive',
      isLiveIngested: true,
    });
  }

  return enriched;
}

function fallbackEnrichArticles(articles: RawRssArticle[]): IntelligenceItem[] {
  const relevantArticles = articles.filter((a) => isExecutiveRelevant(a.headline, a.snippet));
  return relevantArticles.map((raw, idx) => {
    const text = `${raw.headline} ${raw.snippet}`.toLowerCase();

    // Sector detection
    let sector: Sector = raw.defaultSector;
    if (/\b(ai|llm|generative|machine learning|model|synthetic|agent|copilot)\b/i.test(text)) {
      sector = 'AI';
    } else if (/\b(bank|central bank|reserve|deposit|liquidity|treasury|lender|lending)\b/i.test(text)) {
      sector = 'Banking';
    } else if (/\b(fintech|payment|wallet|remittance|stablecoin|crypto|pay|neobank)\b/i.test(text)) {
      sector = 'FinTech';
    }

    // Event type detection
    let eventType: EventType = 'Product Launch';
    if (/\b(funding|raises|raised|seed|series [a-z]|invest|valuation|acquisition|acquire|merger)\b/i.test(text)) {
      eventType = 'M&A/Funding';
    } else if (/\b(regulat|compliance|license|central bank|guidance|framework|ban|sanction|fca|sec|ecb)\b/i.test(text)) {
      eventType = 'Regulation';
    } else if (/\b(breakthrough|benchmark|architecture|patent|algorithm|quantum|deepfake)\b/i.test(text)) {
      eventType = 'Tech Breakthrough';
    }

    // Geolocation defaults based on source / region / keywords
    let country = 'United States';
    let countryNameMatch = 'United States of America';
    let hubCity = 'New York';
    let lat = 40.7128;
    let lng = -74.006;
    let region = raw.sourceRegion;

    if (/\b(kenya|nairobi|safaricom|m-pesa|central bank of kenya|cbk|shilling)\b/i.test(text) || /kenya/i.test(raw.source)) {
      region = 'Africa';
      country = 'Kenya';
      countryNameMatch = 'Kenya';
      hubCity = 'Nairobi';
      lat = -1.2921;
      lng = 36.8219;
    } else if (/\b(south africa|johannesburg|cape town|sarb|capitec|tymebank|absa|standard bank|rand|jse|telkom)\b/i.test(text) || /south africa/i.test(raw.source)) {
      region = 'Africa';
      country = 'South Africa';
      countryNameMatch = 'South Africa';
      hubCity = 'Johannesburg';
      lat = -26.2041;
      lng = 28.0473;
    } else if (/\b(egypt|cairo|fawry|paymob|instapay|central bank of egypt|cbe|egyptian)\b/i.test(text) || /egypt/i.test(raw.source)) {
      region = 'Africa';
      country = 'Egypt';
      countryNameMatch = 'Egypt';
      hubCity = 'Cairo';
      lat = 30.0444;
      lng = 31.2357;
    } else if (/\b(rwanda|kigali|kifc|national bank of rwanda|bnr)\b/i.test(text) || /rwanda/i.test(raw.source)) {
      region = 'Africa';
      country = 'Rwanda';
      countryNameMatch = 'Rwanda';
      hubCity = 'Kigali';
      lat = -1.9441;
      lng = 30.0619;
    } else if (/\b(senegal|dakar|bceao|wave)\b/i.test(text) || /senegal/i.test(raw.source)) {
      region = 'Africa';
      country = 'Senegal';
      countryNameMatch = 'Senegal';
      hubCity = 'Dakar';
      lat = 14.7167;
      lng = -17.4677;
    } else if (/\b(ivory coast|cote d'?ivoire|abidjan)\b/i.test(text)) {
      region = 'Africa';
      country = "Cote d'Ivoire";
      countryNameMatch = "Cote d'Ivoire";
      hubCity = 'Abidjan';
      lat = 5.36;
      lng = -4.0083;
    } else if (/\b(tanzania|dar es salaam|bank of tanzania)\b/i.test(text)) {
      region = 'Africa';
      country = 'Tanzania';
      countryNameMatch = 'Tanzania';
      hubCity = 'Dar es Salaam';
      lat = -6.7924;
      lng = 39.2083;
    } else if (/\b(uganda|kampala|bank of uganda)\b/i.test(text)) {
      region = 'Africa';
      country = 'Uganda';
      countryNameMatch = 'Uganda';
      hubCity = 'Kampala';
      lat = 0.3476;
      lng = 32.5825;
    } else if (/\b(morocco|casablanca|rabat|bank al-maghrib)\b/i.test(text)) {
      region = 'Africa';
      country = 'Morocco';
      countryNameMatch = 'Morocco';
      hubCity = 'Casablanca';
      lat = 33.5731;
      lng = -7.5898;
    } else if (/\b(nigeria|lagos|naira|cbn|paystack|flutterwave|interswitch)\b/i.test(text) || /nigeria/i.test(raw.source)) {
      region = 'Africa';
      country = 'Nigeria';
      countryNameMatch = 'Nigeria';
      hubCity = 'Lagos';
      lat = 6.5244;
      lng = 3.3792;
    } else if (/\b(ghana|accra|cedi|bog|ghipss|telecel)\b/i.test(text) || /ghana/i.test(raw.source)) {
      region = 'Africa';
      country = 'Ghana';
      countryNameMatch = 'Ghana';
      hubCity = 'Accra';
      lat = 5.6037;
      lng = -0.187;
    } else if (/\b(uk|london|britain|fca|boe)\b/i.test(text)) {
      region = 'Europe';
      country = 'United Kingdom';
      countryNameMatch = 'United Kingdom';
      hubCity = 'London';
      lat = 51.5074;
      lng = -0.1278;
    } else if (/\b(germany|berlin|frankfurt|bundesbank)\b/i.test(text)) {
      region = 'Europe';
      country = 'Germany';
      countryNameMatch = 'Germany';
      hubCity = 'Frankfurt';
      lat = 50.1109;
      lng = 8.6821;
    } else if (/\b(france|paris|bnp)\b/i.test(text)) {
      region = 'Europe';
      country = 'France';
      countryNameMatch = 'France';
      hubCity = 'Paris';
      lat = 48.8566;
      lng = 2.3522;
    } else if (/\b(singapore|mas)\b/i.test(text)) {
      region = 'Asia-Pacific';
      country = 'Singapore';
      countryNameMatch = 'Singapore';
      hubCity = 'Singapore';
      lat = 1.3521;
      lng = 103.8198;
    } else if (/\b(japan|tokyo|boj|mufg)\b/i.test(text)) {
      region = 'Asia-Pacific';
      country = 'Japan';
      countryNameMatch = 'Japan';
      hubCity = 'Tokyo';
      lat = 35.6762;
      lng = 139.6503;
    } else if (/\b(canada|toronto|montreal)\b/i.test(text)) {
      region = 'North America';
      country = 'Canada';
      countryNameMatch = 'Canada';
      hubCity = 'Toronto';
      lat = 43.6532;
      lng = -79.3832;
    } else if (/\b(australia|sydney|melbourne|apra|rba)\b/i.test(text)) {
      region = 'Oceania';
      country = 'Australia';
      countryNameMatch = 'Australia';
      hubCity = 'Sydney';
      lat = -33.8688;
      lng = 151.2093;
    } else if (raw.sourceRegion === 'Europe') {
      country = 'United Kingdom';
      countryNameMatch = 'United Kingdom';
      hubCity = 'London';
      lat = 51.5074;
      lng = -0.1278;
    } else if (raw.sourceRegion === 'Asia-Pacific') {
      country = 'Singapore';
      countryNameMatch = 'Singapore';
      hubCity = 'Singapore';
      lat = 1.3521;
      lng = 103.8198;
    } else if (raw.sourceRegion === 'Africa') {
      // Default regional African fallbacks distributed across continental hubs
      const hubs = [
        { country: 'Kenya', match: 'Kenya', city: 'Nairobi', lat: -1.2921, lng: 36.8219 },
        { country: 'South Africa', match: 'South Africa', city: 'Johannesburg', lat: -26.2041, lng: 28.0473 },
        { country: 'Egypt', match: 'Egypt', city: 'Cairo', lat: 30.0444, lng: 31.2357 },
        { country: 'Rwanda', match: 'Rwanda', city: 'Kigali', lat: -1.9441, lng: 30.0619 },
        { country: 'Nigeria', match: 'Nigeria', city: 'Lagos', lat: 6.5244, lng: 3.3792 },
        { country: 'Ghana', match: 'Ghana', city: 'Accra', lat: 5.6037, lng: -0.1870 },
      ];
      const selected = hubs[idx % hubs.length];
      country = selected.country;
      countryNameMatch = selected.match;
      hubCity = selected.city;
      lat = selected.lat;
      lng = selected.lng;
    }

    const cleanSnippet = raw.snippet
      ? raw.snippet.replace(/<[^>]*>/g, '').trim().slice(0, 260)
      : '';
    const executiveSummary = cleanSnippet
      ? `${cleanSnippet}. Monitored institutional signal via ${raw.source}.`
      : `${raw.headline}. Institutional signal registered from ${raw.source} across ${region}.`;

    return {
      id: `live-${Date.now()}-${idx}`,
      headline: raw.headline,
      source: raw.source,
      url: raw.url,
      publishedAt: raw.publishedAt,
      sector,
      eventType,
      region,
      country,
      countryNameMatch,
      hubCity,
      lat,
      lng,
      executiveSummary,
      entities: [raw.source, hubCity],
      technologyTag: inferTechnologyTag(text, sector),
      impactWeight: 8.0,
      capitalOrScaleLabel: 'Live Market Signal',
      sentiment: 'Constructive' as Sentiment,
      isLiveIngested: true,
    };
  });
}

function selectBalancedContinentalBatch(
  candidates: RawRssArticle[],
  maxBatch: number
): RawRssArticle[] {
  const byRegion = new Map<Region, RawRssArticle[]>();
  for (const article of candidates) {
    const bucket = byRegion.get(article.sourceRegion);
    if (bucket) bucket.push(article);
    else byRegion.set(article.sourceRegion, [article]);
  }

  const selected: RawRssArticle[] = [];
  const regionQueues = Array.from(byRegion.values());
  let round = 0;
  while (selected.length < maxBatch) {
    let addedInRound = false;
    for (const queue of regionQueues) {
      if (round < queue.length && selected.length < maxBatch) {
        selected.push(queue[round]);
        addedInRound = true;
      }
    }
    if (!addedInRound) break;
    round += 1;
  }
  return selected;
}

async function runLiveIngestion(
  targetRegion?: Region | 'All'
): Promise<{ added: number; activeFeeds: number }> {
  const { articles: rssArticles, activeFeeds } = await fetchRssArticles(targetRegion);
  activeRssFeedCount = activeFeeds;

  // Poll GNews API for pan-African tech, banking & business signals when Africa or All is synced
  let allArticles = [...rssArticles];
  if (!targetRegion || targetRegion === 'All' || targetRegion === 'Africa') {
    const gnewsArticles = await fetchGNewsPanAfricaArticles();
    if (gnewsArticles.length > 0) {
      allArticles = [...gnewsArticles, ...allArticles];
      activeRssFeedCount += 1;
    }
  }

  const cutoff30d = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentArticles = allArticles.filter((a) => {
    const pubTime = new Date(a.publishedAt).getTime();
    return pubTime >= cutoff30d && isExecutiveRelevant(a.headline, a.snippet);
  });
  const existingKeys = new Set(intelligenceStore.map((item) => normalizeHeadline(item.headline)));
  const unseen = recentArticles.filter((a) => !existingKeys.has(normalizeHeadline(a.headline)));

  const freshCandidates =
    targetRegion && targetRegion !== 'All'
      ? unseen.slice(0, 12)
      : selectBalancedContinentalBatch(unseen, 25);

  if (freshCandidates.length === 0) {
    lastIngestedAt = new Date().toISOString();
    return { added: 0, activeFeeds };
  }

  let enriched: IntelligenceItem[] = [];
  try {
    if (ai) {
      enriched = await enrichArticlesWithGemini(freshCandidates);
    } else {
      enriched = fallbackEnrichArticles(freshCandidates);
    }
  } catch (err) {
    console.warn(
      'Gemini enrichment unavailable or quota exceeded; applying heuristic extraction:',
      err instanceof Error ? err.message : err
    );
    enriched = fallbackEnrichArticles(freshCandidates);
  }

  if (enriched.length > 0) {
    intelligenceStore = [...enriched, ...intelligenceStore]
      .filter(
        (item) =>
          new Date(item.publishedAt).getTime() >= cutoff30d &&
          isExecutiveRelevant(item.headline, item.executiveSummary)
      )
      .slice(0, 100);
    liveFeedCount += enriched.length;
  }

  lastIngestedAt = new Date().toISOString();
  return { added: enriched.length, activeFeeds };
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, geminiConfigured: Boolean(ai), itemsCount: intelligenceStore.length });
  });

  app.get('/api/sources', (_req, res) => {
    res.json({
      sources: rssSources,
      totalSources: rssSources.length,
      enabledSources: rssSources.filter((s) => s.enabled !== false).length,
      continentsCovered: Array.from(new Set(rssSources.map((s) => s.region))),
    });
  });

  app.post('/api/sources', async (req, res) => {
    try {
      const { name, url, region, scope, defaultSector } = req.body as Partial<NewsSourceEndpoint>;
      if (!name || !name.trim() || !url || !url.trim()) {
        res.status(400).json({ error: 'Feed name and valid RSS/Atom URL are required.' });
        return;
      }

      const trimmedUrl = url.trim();
      if (!/^https?:\/\//i.test(trimmedUrl)) {
        res.status(400).json({ error: 'Feed URL must begin with http:// or https://' });
        return;
      }

      // Verify the feed parses cleanly before adding
      await rssParser.parseURL(trimmedUrl);

      const newSource: NewsSourceEndpoint = {
        id: `custom-${Date.now()}`,
        name: name.trim(),
        url: trimmedUrl,
        region: region || 'North America',
        scope: scope || 'Local',
        defaultSector: defaultSector || 'FinTech',
        enabled: true,
        custom: true,
      };

      rssSources = [newSource, ...rssSources];
      res.status(201).json({ source: newSource, sources: rssSources });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to parse RSS feed URL';
      res.status(422).json({ error: `Feed validation failed: ${message}` });
    }
  });

  app.patch('/api/sources/:id', (req, res) => {
    const { id } = req.params;
    const { enabled } = req.body as { enabled?: boolean };
    const idx = rssSources.findIndex((s) => s.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Source endpoint not found.' });
      return;
    }
    rssSources[idx] = {
      ...rssSources[idx],
      enabled: typeof enabled === 'boolean' ? enabled : !rssSources[idx].enabled,
    };
    res.json({ source: rssSources[idx], sources: rssSources });
  });

  app.delete('/api/sources/:id', (req, res) => {
    const { id } = req.params;
    const existing = rssSources.find((s) => s.id === id);
    if (!existing) {
      res.status(404).json({ error: 'Source endpoint not found.' });
      return;
    }
    rssSources = rssSources.filter((s) => s.id !== id);
    res.json({ sources: rssSources });
  });

  app.get('/api/intelligence', (_req, res) => {
    const cutoff30d = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const sorted = intelligenceStore
      .filter((item) => new Date(item.publishedAt).getTime() >= cutoff30d)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    res.json({
      items: sorted,
      lastIngestedAt,
      liveFeedCount,
      rssFeedsActive: activeRssFeedCount,
    });
  });

  app.get('/api/intelligence/region/:region', (req, res) => {
    const cutoff30d = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const regionParam = decodeURIComponent(req.params.region);
    const matching = intelligenceStore
      .filter(
        (item) =>
          item.region.toLowerCase() === regionParam.toLowerCase() &&
          new Date(item.publishedAt).getTime() >= cutoff30d
      )
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    const localSources = rssSources.filter(
      (s) => s.region.toLowerCase() === regionParam.toLowerCase()
    );
    res.json({
      region: regionParam,
      items: matching,
      localSources,
      count: matching.length,
    });
  });

  app.post('/api/intelligence/ingest', async (req, res) => {
    try {
      const { region } = (req.body || {}) as { region?: Region | 'All' };
      const result = await runLiveIngestion(region);
      const cutoff30d = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const sorted = intelligenceStore
        .filter((item) => new Date(item.publishedAt).getTime() >= cutoff30d)
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      res.json({
        items: sorted,
        added: result.added,
        region: region || 'All',
        rssFeedsActive: result.activeFeeds,
        lastIngestedAt,
        liveFeedCount,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Live ingestion failed';
      res.status(502).json({ error: message });
    }
  });

  app.post('/api/intelligence/analyze', async (req, res) => {
    try {
      if (!ai) {
        res.status(503).json({
          error: 'Gemini API key is not available on the server. Check Settings > Secrets.',
        });
        return;
      }

      const { headline, source, notes, url } = req.body as {
        headline?: string;
        source?: string;
        notes?: string;
        url?: string;
      };

      if (!headline || headline.trim().length < 10) {
        res.status(400).json({ error: 'Please provide a headline or signal description (at least 10 characters).' });
        return;
      }

      const validUrl =
        url && (url.trim().startsWith('http://') || url.trim().startsWith('https://'))
          ? url.trim()
          : 'https://news.google.com/search?q=' +
            encodeURIComponent(`${(source || '').trim()} ${headline.trim()}`);

      const rawArticle: RawRssArticle = {
        headline: headline.trim(),
        source: (source || 'Executive Submission').trim(),
        url: validUrl,
        publishedAt: new Date().toISOString(),
        snippet: (notes || headline).trim(),
        defaultSector: 'FinTech',
        sourceRegion: 'North America',
      };

      const enriched = await enrichArticlesWithGemini([rawArticle]);
      if (enriched.length === 0) {
        res.status(422).json({
          error: 'Signal was not classified as relevant to Banking, FinTech, or AI developments.',
        });
        return;
      }

      intelligenceStore = [enriched[0], ...intelligenceStore].slice(0, 80);
      liveFeedCount += 1;
      lastIngestedAt = new Date().toISOString();

      res.json({ item: enriched[0], items: intelligenceStore });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze signal with Gemini';
      res.status(502).json({ error: message });
    }
  });

  app.post('/api/intelligence/briefing', async (req, res) => {
    try {
      if (!ai) {
        res.status(503).json({
          error: 'Gemini API key is not available on the server. Check Settings > Secrets.',
        });
        return;
      }

      const { scopeLabel, items } = req.body as {
        scopeLabel?: string;
        items?: Array<{
          headline: string;
          sector: string;
          eventType: string;
          hubCity: string;
          country: string;
          executiveSummary: string;
        }>;
      };

      const contextItems = (items || []).slice(0, 12);
      if (contextItems.length === 0) {
        res.status(400).json({ error: 'No matching developments in the current filter scope to synthesize.' });
        return;
      }

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Synthesize an institutional executive briefing for the following filtered market intelligence scope: "${scopeLabel || 'Global Banking, FinTech & AI'}".

Developments:
${JSON.stringify(contextItems)}`,
        config: {
          systemInstruction:
            'You are a Chief Strategy Officer advisor producing a crisp, high-signal executive briefing for Banking, FinTech, and AI leaders. Avoid fluff or generic buzzwords. Be concrete, referencing specific hubs, firms, and regulatory/capital mechanics from the provided developments.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strategicThesis: {
                type: Type.STRING,
                description: '2-3 sentence macro thesis summarizing the core shift across these developments.',
              },
              keySignals: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 sharp bullet points identifying concrete breakthroughs or competitive inflections.',
              },
              capitalAndRegulatoryOutlook: {
                type: Type.STRING,
                description: '2 sentences on capital allocation or regulatory risk implications.',
              },
              priorityWatchlist: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 specific entities, technologies, or corridors executives should monitor next.',
              },
            },
            required: [
              'strategicThesis',
              'keySignals',
              'capitalAndRegulatoryOutlook',
              'priorityWatchlist',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as Omit<
        ExecutiveBriefing,
        'scopeLabel' | 'generatedAt'
      >;

      const briefing: ExecutiveBriefing = {
        scopeLabel: scopeLabel || 'Global Banking, FinTech & AI',
        generatedAt: new Date().toISOString(),
        strategicThesis: parsed.strategicThesis || '',
        keySignals: parsed.keySignals || [],
        capitalAndRegulatoryOutlook: parsed.capitalAndRegulatoryOutlook || '',
        priorityWatchlist: parsed.priorityWatchlist || [],
      };

      res.json({ briefing });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Executive briefing generation failed';
      res.status(502).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Meridian Intel server listening on http://0.0.0.0:${PORT}`);
    // Non-blocking background warm RSS check if Gemini key is present
    if (ai) {
      runLiveIngestion().catch((err) => {
        console.warn('Initial background RSS check skipped:', err instanceof Error ? err.message : err);
      });

      // Periodic 15-minute background auto-sync
      const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000;
      setInterval(() => {
        console.log('[Auto-Sync] Running periodic 15-minute intelligence sync across RSS and GNews...');
        runLiveIngestion().catch((err) => {
          console.warn('[Auto-Sync] Background sync error:', err instanceof Error ? err.message : err);
        });
      }, AUTO_SYNC_INTERVAL_MS);
    }
  });
}

createApp();
