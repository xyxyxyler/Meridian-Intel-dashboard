import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import { LocateFixed, Minus, Plus, RotateCcw } from 'lucide-react';
import type { IntelligenceItem, Region } from '../types/intelligence.ts';
import type { HubSummary } from '../utils/intelligenceHelpers.ts';
import { aggregateByHub, SECTOR_COLORS } from '../utils/intelligenceHelpers.ts';

interface GlobalHeatmapProps {
  items: IntelligenceItem[];
  selectedRegion: Region | 'All';
  selectedCountry: string | null;
  selectedHub: string | null;
  defaultMapMode?: 'hotspots' | 'choropleth';
  isDark?: boolean;
  onSelectRegion: (region: Region | 'All') => void;
  onSelectCountry: (country: string | null) => void;
  onSelectHub: (hubCity: string | null, country: string | null) => void;
}

interface CountryFeature {
  type: string;
  id?: string;
  properties: {
    name: string;
  };
  geometry: d3.GeoPermissibleObjects;
}

const REGION_PRESETS: Array<{ label: string; value: Region | 'All'; center: [number, number]; scale: number }> = [
  { label: 'Global', value: 'All', center: [10, 15], scale: 1 },
  { label: 'North America', value: 'North America', center: [-98, 39], scale: 2.3 },
  { label: 'Europe', value: 'Europe', center: [10, 51], scale: 3.1 },
  { label: 'Asia-Pacific', value: 'Asia-Pacific', center: [108, 22], scale: 2.2 },
  { label: 'Oceania', value: 'Oceania', center: [145, -28], scale: 2.8 },
  { label: 'Middle East', value: 'Middle East', center: [48, 25], scale: 3.4 },
  { label: 'Latin America', value: 'Latin America', center: [-65, -14], scale: 2.2 },
  { label: 'Africa', value: 'Africa', center: [20, 2], scale: 2.4 },
];

const SVG_WIDTH = 960;
const SVG_HEIGHT = 490;

export function GlobalHeatmap({
  items,
  selectedRegion,
  selectedCountry,
  selectedHub,
  defaultMapMode = 'hotspots',
  isDark = true,
  onSelectRegion,
  onSelectCountry,
  onSelectHub,
}: GlobalHeatmapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [mapMode, setMapMode] = useState<'hotspots' | 'choropleth'>(defaultMapMode);

  useEffect(() => {
    setMapMode(defaultMapMode);
  }, [defaultMapMode]);
  const [hoveredHub, setHoveredHub] = useState<{ hub: HubSummary; x: number; y: number } | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<{
    name: string;
    count: number;
    impact: number;
    x: number;
    y: number;
  } | null>(null);

  const countries = useMemo(() => {
    const fc = feature(
      worldAtlas as unknown as Parameters<typeof feature>[0],
      worldAtlas.objects.countries as unknown as Parameters<typeof feature>[1]
    ) as unknown as { features: CountryFeature[] };
    return fc.features.filter((f) => f.properties?.name !== 'Antarctica');
  }, []);

  const projection = useMemo(() => {
    return d3
      .geoNaturalEarth1()
      .scale(175)
      .translate([SVG_WIDTH / 2, SVG_HEIGHT / 2 + 18]);
  }, []);

  const pathGenerator = useMemo(() => d3.geoPath().projection(projection), [projection]);

  const graticulePath = useMemo(() => {
    return pathGenerator(d3.geoGraticule10()) || '';
  }, [pathGenerator]);

  const hubs = useMemo(() => aggregateByHub(items), [items]);

  const countryStats = useMemo(() => {
    const map = new Map<string, { count: number; totalImpact: number; displayCountry: string }>();
    for (const item of items) {
      const key = item.countryNameMatch.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.totalImpact += item.impactWeight;
      } else {
        map.set(key, {
          count: 1,
          totalImpact: item.impactWeight,
          displayCountry: item.country,
        });
      }
    }
    return map;
  }, [items]);

  const maxCountryImpact = useMemo(() => {
    let maxVal = 10;
    for (const val of countryStats.values()) {
      if (val.totalImpact > maxVal) maxVal = val.totalImpact;
    }
    return maxVal;
  }, [countryStats]);

  const colorScale = useMemo(() => {
    return d3
      .scaleSequential()
      .domain([0, maxCountryImpact])
      .interpolator(
        isDark
          ? d3.interpolateRgb('#18202C', '#B45309')
          : d3.interpolateRgb('#E2E8F0', '#D97706')
      );
  }, [maxCountryImpact, isDark]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 6])
      .translateExtent([
        [-100, -60],
        [SVG_WIDTH + 100, SVG_HEIGHT + 60],
      ])
      .filter((event: MouseEvent | TouchEvent | WheelEvent) => {
        // Allow wheel zoom
        if (event.type === 'wheel') return true;
        // Allow mouse drag (left click)
        if (event.type === 'mousedown') return (event as MouseEvent).button === 0;
        // On touch screens, require pinch-to-zoom (2+ touches) so single finger can scroll the page
        if ('touches' in event) return (event as TouchEvent).touches.length > 1;
        return false;
      })
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        setTransform(event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    return () => {
      svg.on('.zoom', null);
    };
  }, []);

  const focusOnCoordinates = (lngLat: [number, number], targetScale: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    if (targetScale <= 1.05) {
      svg.transition().duration(420).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
      return;
    }
    const projected = projection(lngLat);
    if (!projected) return;
    const tx = SVG_WIDTH / 2 - projected[0] * targetScale;
    const ty = SVG_HEIGHT / 2 - projected[1] * targetScale;
    const nextTransform = d3.zoomIdentity.translate(tx, ty).scale(targetScale);
    svg.transition().duration(450).call(zoomBehaviorRef.current.transform, nextTransform);
  };

  const handleRegionClick = (preset: (typeof REGION_PRESETS)[number]) => {
    onSelectRegion(preset.value);
    focusOnCoordinates(preset.center, preset.scale);
  };

  const handleZoomStep = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(220).call(zoomBehaviorRef.current.scaleBy, factor);
  };

  const handleResetView = () => {
    onSelectRegion('All');
    onSelectCountry(null);
    onSelectHub(null, null);
    focusOnCoordinates([10, 15], 1);
  };

  return (
    <div className="bg-[#11161E] border border-slate-800/80 rounded-xl p-2.5 sm:p-3 xl:p-3.5 flex flex-col gap-1.5 h-full min-h-0">
      {/* Map Header */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="font-display text-xs sm:text-sm font-semibold text-slate-100 tracking-tight whitespace-nowrap">
            Global Innovation Heatmap
          </h2>
          <span className="text-[10px] text-slate-400 truncate hidden 2xl:inline">
            Click hub or country to filter
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Mode Toggle */}
          <div className="flex items-center p-0.5 bg-[#090C10] border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setMapMode('hotspots')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mapMode === 'hotspots'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hotspots
            </button>
            <button
              type="button"
              onClick={() => setMapMode('choropleth')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mapMode === 'choropleth'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Countries
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-[#090C10] border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => handleZoomStep(1.4)}
              aria-label="Zoom in map"
              className="p-1 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleZoomStep(0.72)}
              aria-label="Zoom out map"
              className="p-1 text-slate-400 hover:text-slate-100 border-l border-slate-800 transition-colors cursor-pointer"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              aria-label="Reset map view and clear region filter"
              title="Reset to Global View"
              className="p-1 text-slate-400 hover:text-amber-400 border-l border-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Shrunk Region Quick-Focus Strip */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar intel-scroll shrink-0 py-0.5">
        {REGION_PRESETS.map((preset) => {
          const isActive = selectedRegion === preset.value && !selectedCountry && !selectedHub;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => handleRegionClick(preset)}
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer leading-tight ${
                isActive
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                  : 'bg-[#090C10] text-slate-400 border border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {preset.label}
            </button>
          );
        })}

        {(selectedCountry || selectedHub) && (
          <button
            type="button"
            onClick={() => {
              onSelectCountry(null);
              onSelectHub(null, null);
            }}
            className="ml-auto px-2 py-0.5 text-[10px] font-medium rounded bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer leading-tight"
          >
            <LocateFixed className="w-2.5 h-2.5" />
            <span>Clear {selectedHub || selectedCountry}</span>
          </button>
        )}
      </div>

      {/* Interactive D3 Map Viewport */}
      <div className="relative flex-1 min-h-[180px] md:min-h-0 bg-[#090C10] border border-slate-800/70 rounded-lg overflow-hidden map-canvas-container touch-pan-y">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full select-none cursor-grab active:cursor-grabbing touch-pan-y"
          role="img"
          aria-label="Interactive global innovation heatmap across Banking, FinTech, and AI hubs"
        >
          <defs>
            <radialGradient id="heat-amber" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.58" />
              <stop offset="45%" stopColor="#F59E0B" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="heat-banking" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#10B981" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="heat-fintech" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="heat-ai" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#818CF8" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#818CF8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g transform={transform.toString()}>
            {/* Subtle Graticule Grid */}
            <path
              d={graticulePath}
              fill="none"
              stroke={isDark ? 'rgba(148, 163, 184, 0.06)' : 'rgba(100, 116, 139, 0.15)'}
              strokeWidth={0.6 / transform.k}
            />

            {/* Country Polygons */}
            <g>
              {countries.map((country, idx) => {
                const name = country.properties?.name || `country-${idx}`;
                const stats = countryStats.get(name.toLowerCase());
                const isSelected =
                  selectedCountry &&
                  (selectedCountry.toLowerCase() === name.toLowerCase() ||
                    stats?.displayCountry.toLowerCase() === selectedCountry.toLowerCase());

                let fillColor = isDark ? '#151C26' : '#E2E8F0';
                if (isSelected) {
                  fillColor = isDark ? '#92400E' : '#F59E0B';
                } else if (stats) {
                  fillColor =
                    mapMode === 'choropleth'
                      ? colorScale(stats.totalImpact)
                      : isDark ? '#1C2636' : '#CBD5E1';
                }

                const dAttr = pathGenerator(country as unknown as d3.GeoPermissibleObjects) || '';
                if (!dAttr) return null;

                return (
                  <path
                    key={country.id || `${name}-${idx}`}
                    d={dAttr}
                    fill={fillColor}
                    stroke={isSelected ? '#F59E0B' : isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.35)'}
                    strokeWidth={(isSelected ? 1.2 : 0.55) / transform.k}
                    className="transition-colors duration-150 cursor-pointer hover:brightness-125"
                    onMouseMove={(e) => {
                      const rect = svgRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setHoveredHub(null);
                      setHoveredCountry({
                        name: stats?.displayCountry || name,
                        count: stats?.count || 0,
                        impact: stats?.totalImpact || 0,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      });
                    }}
                    onMouseLeave={() => setHoveredCountry(null)}
                    onClick={() => {
                      if (!stats) return;
                      if (isSelected) {
                        onSelectCountry(null);
                      } else {
                        onSelectHub(null, null);
                        onSelectCountry(stats.displayCountry);
                      }
                    }}
                  />
                );
              })}
            </g>

            {/* Innovation Hotspot Radial Halos & Nodes */}
            {hubs.map((hub) => {
              const coords = projection([hub.lng, hub.lat]);
              if (!coords) return null;
              const [cx, cy] = coords;
              const isSelectedHub =
                selectedHub && selectedHub.toLowerCase() === hub.hubCity.toLowerCase();

              const haloRadius = (16 + Math.min(28, hub.totalImpact * 1.15)) / Math.sqrt(transform.k);
              const coreRadius = (3.8 + Math.min(4.5, hub.count * 1.1)) / Math.sqrt(transform.k);

              const gradId =
                hub.totalImpact >= 17
                  ? 'url(#heat-amber)'
                  : hub.dominantSector === 'Banking'
                  ? 'url(#heat-banking)'
                  : hub.dominantSector === 'FinTech'
                  ? 'url(#heat-fintech)'
                  : 'url(#heat-ai)';

              const strokeColor = isSelectedHub
                ? '#FDE68A'
                : SECTOR_COLORS[hub.dominantSector].hex;

              return (
                <g
                  key={`${hub.hubCity}-${hub.country}`}
                  transform={`translate(${cx}, ${cy})`}
                  className="cursor-pointer"
                  onMouseMove={(e) => {
                    e.stopPropagation();
                    const rect = svgRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setHoveredCountry(null);
                    setHoveredHub({
                      hub,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }}
                  onMouseLeave={() => setHoveredHub(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSelectedHub) {
                      onSelectHub(null, null);
                    } else {
                      onSelectHub(hub.hubCity, hub.country);
                    }
                  }}
                >
                  {mapMode === 'hotspots' && (
                    <circle r={haloRadius} fill={gradId} pointerEvents="none" />
                  )}
                  <circle
                    r={coreRadius * 1.65}
                    fill="transparent"
                    stroke={strokeColor}
                    strokeOpacity={isSelectedHub ? 0.95 : 0.45}
                    strokeWidth={(isSelectedHub ? 1.6 : 1) / transform.k}
                  />
                  <circle
                    r={coreRadius}
                    fill={isSelectedHub ? '#F59E0B' : strokeColor}
                    stroke={isDark ? '#090C10' : '#FFFFFF'}
                    strokeWidth={1 / transform.k}
                  />
                  {(hub.count >= 2 || transform.k >= 1.8 || isSelectedHub) && (
                    <text
                      y={-(coreRadius + 6 / transform.k)}
                      textAnchor="middle"
                      fill={isDark ? '#E2E8F0' : '#0F172A'}
                      fontSize={10 / Math.sqrt(transform.k)}
                      fontWeight={600}
                      fontFamily="Plus Jakarta Sans, sans-serif"
                      pointerEvents="none"
                      style={{
                        textShadow: isDark
                          ? '0 1px 4px rgba(0,0,0,0.9)'
                          : '0 1px 3px rgba(255,255,255,0.95), 0 0 2px rgba(255,255,255,0.95)',
                      }}
                    >
                      {hub.hubCity}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Tooltip for Hub */}
        {hoveredHub && (
          <div
            className="pointer-events-none absolute z-20 w-64 bg-[#0D1117]/95 backdrop-blur-sm border border-slate-700/90 rounded-lg p-3 shadow-xl"
            style={{
              left: Math.min(Math.max(hoveredHub.x + 14, 12), 520),
              top: Math.max(hoveredHub.y - 18, 12),
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-display text-sm font-semibold text-slate-100">
                {hoveredHub.hub.hubCity}, {hoveredHub.hub.country}
              </span>
              <span className="font-mono text-xs text-amber-400 tabular-nums">
                {hoveredHub.hub.count} {hoveredHub.hub.count === 1 ? 'signal' : 'signals'}
              </span>
            </div>
            <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
              <span className={SECTOR_COLORS[hoveredHub.hub.dominantSector].text}>
                {hoveredHub.hub.dominantSector} Lead
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Impact {hoveredHub.hub.totalImpact.toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {hoveredHub.hub.latestItem.headline}
            </p>
          </div>
        )}

        {/* Floating Tooltip for Country */}
        {!hoveredHub && hoveredCountry && hoveredCountry.count > 0 && (
          <div
            className="pointer-events-none absolute z-20 bg-[#0D1117]/95 border border-slate-700/90 rounded-lg px-3 py-2 shadow-xl"
            style={{
              left: Math.min(Math.max(hoveredCountry.x + 12, 12), 560),
              top: Math.max(hoveredCountry.y - 14, 12),
            }}
          >
            <div className="text-xs font-semibold text-slate-100">{hoveredCountry.name}</div>
            <div className="font-mono text-[11px] text-amber-400 tabular-nums">
              {hoveredCountry.count} tracked {hoveredCountry.count === 1 ? 'event' : 'events'} · Click to filter
            </div>
          </div>
        )}
      </div>

      {/* Compact Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-slate-400 shrink-0 pt-0.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" aria-hidden="true" />
            <span>Banking</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" aria-hidden="true" />
            <span>FinTech</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" aria-hidden="true" />
            <span>AI</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" aria-hidden="true" />
            <span>High Density</span>
          </span>
        </div>

        <span className="font-mono text-[10px] text-slate-500 tabular-nums">
          {hubs.length} hubs · {items.length} signals
        </span>
      </div>
    </div>
  );
}
