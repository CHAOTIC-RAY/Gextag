import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toPng, toJpeg } from 'html-to-image';
import { saveAs } from 'file-saver';
import { Layers, HelpCircle, Settings, Download, ChevronDown, ChevronUp, RefreshCw, Sliders } from 'lucide-react';

interface MapLayer {
  id: string;
  name: string;
  url: string;
  attribution: string;
  checked: boolean;
  opacity: number;
  zIndex: number;
  maxZoom: number;
  maxNativeZoom: number;
  bounds?: [[number, number], [number, number]];
  className?: string;
}

const INITIAL_LAYERS: MapLayer[] = [
  {
    id: 'google-hybrid',
    name: 'Google Satellite Hybrid',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    checked: true,
    opacity: 1.0,
    zIndex: 1,
    maxZoom: 22,
    maxNativeZoom: 20
  },
  {
    id: 'esri-sat',
    name: 'Esri Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    checked: true,
    opacity: 1.0,
    zIndex: 2,
    maxZoom: 22,
    maxNativeZoom: 17
  },
  {
    id: 'osm',
    name: 'OpenStreetMap Roads',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    checked: true,
    opacity: 0.4,
    zIndex: 3,
    maxZoom: 22,
    maxNativeZoom: 19
  },
  {
    id: 'hulhumale',
    name: 'Hulhumalé 24 (HDC Overlay)',
    url: 'https://tiles.arcgis.com/tiles/TGjun5cqf5Jwp2Ad/arcgis/rest/services/HULHUMALE_IMAGERY_24TH_MARCH_2024/MapServer/tile/{z}/{y}/{x}',
    attribution: 'HDC',
    checked: true,
    opacity: 1.0,
    zIndex: 4,
    bounds: [[4.18, 73.515], [4.24, 73.56]],
    className: 'hulhumale-tiles',
    maxZoom: 22,
    maxNativeZoom: 20
  },
  {
    id: 'carto-dark',
    name: 'Carto Dark Map',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    checked: false,
    opacity: 1.0,
    zIndex: 5,
    maxZoom: 22,
    maxNativeZoom: 19
  },
  {
    id: 'carto-light',
    name: 'Carto Light Map',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    checked: false,
    opacity: 1.0,
    zIndex: 6,
    maxZoom: 22,
    maxNativeZoom: 19
  },
  {
    id: 'google-sat-only',
    name: 'Google Satellite Only',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    checked: false,
    opacity: 1.0,
    zIndex: 7,
    maxZoom: 22,
    maxNativeZoom: 20
  }
];

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle pan, zoom, and dynamic size re-computation in Leaflet
const MapController = ({ center, width, height }: { center: { lat: number, lng: number }, width: number, height: number }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: false });
  }, [center, map]);
  
  useEffect(() => {
    map.invalidateSize({ animate: false });
    const timeout = setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 150);
    return () => clearTimeout(timeout);
  }, [map, width, height]);
  
  return null;
};

export const MapExportTab = ({ location }: { location: { lat: number, lng: number } | null }) => {
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(800);
  const [scale, setScale] = useState(2);
  const [exportLayers, setExportLayers] = useState<MapLayer[]>(INITIAL_LAYERS);
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [isExporting, setIsExporting] = useState(false);
  
  const [center, setCenter] = useState({ lat: 4.1755, lng: 73.5093 }); // default Malé/Hulhumalé area
  const [markerPos, setMarkerPos] = useState({ lat: 4.1755, lng: 73.5093 });

  // Floating menus expand state - starts open on desktop, closed on mobile
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLayersOpen, setIsLayersOpen] = useState(false);

  useEffect(() => {
    const isDesktop = window.innerWidth >= 768;
    setIsSettingsOpen(isDesktop);
    setIsLayersOpen(isDesktop);
  }, []);

  useEffect(() => {
    if (location) {
      setCenter(location);
      setMarkerPos(location);
    }
  }, [location]);
  
  const mapRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!mapRef.current) return;
    setIsExporting(true);
    try {
      // Hide marker and leaflet UI controls briefly for pristine export
      const leafletControls = mapRef.current.querySelectorAll('.leaflet-control-container');
      const markers = mapRef.current.querySelectorAll('.leaflet-marker-icon, .leaflet-marker-shadow');
      
      leafletControls.forEach((el: any) => el.style.display = 'none');
      markers.forEach((el: any) => el.style.display = 'none');

      // Small delay to ensure render states sync
      await new Promise(resolve => setTimeout(resolve, 150));

      const node = mapRef.current;
      const options = {
        pixelRatio: scale,
        width: width,
        height: height,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      };

      let dataUrl;
      if (format === 'png') {
        dataUrl = await toPng(node, options);
      } else {
        dataUrl = await toJpeg(node, { ...options, quality: 0.95 });
      }
      
      // Restore hidden Leaflet elements
      leafletControls.forEach((el: any) => el.style.display = '');
      markers.forEach((el: any) => el.style.display = '');

      saveAs(dataUrl, `gextag-map-${width}x${height}@${scale}x.${format}`);
    } catch (err) {
      console.error('Export failed', err);
      alert('Failed to export map canvas. Ensure active tile servers do not restrict CORS.');
    } finally {
      setIsExporting(false);
    }
  };

  const applyPreset = (w: number, h: number) => {
    setWidth(w);
    setHeight(h);
  };

  const moveLayer = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index + 1 : index - 1;
    if (targetIndex < 0 || targetIndex >= exportLayers.length) return;
    
    const updated = [...exportLayers];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    
    // Assign consecutive zIndex values starting from 1
    const reordered = updated.map((layer, idx) => ({
      ...layer,
      zIndex: idx + 1
    }));
    
    setExportLayers(reordered);
  };

  return (
    <div className="h-full w-full bg-black text-white flex flex-col overflow-hidden relative">
      {/* Workspace Area with Fixed Control Panels & Scrollable Canvas Container */}
      <div className="flex-grow w-full h-full relative overflow-y-auto md:overflow-hidden flex flex-col md:flex-row">
        
        {/* LEFT PANEL: Canvas Settings */}
        <div className="relative md:absolute md:top-4 md:left-4 z-[1000] w-full md:w-[280px] bg-brand-surface/95 backdrop-blur-md border-b md:border border-brand-border md:rounded shadow-2xl transition-all duration-300">
          <div 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="flex items-center justify-between p-3 border-b border-brand-border/60 cursor-pointer hover:bg-white/5 select-none"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-brand-accent animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-widest text-white">Canvas Config</span>
            </div>
            {isSettingsOpen ? <ChevronUp className="w-3.5 h-3.5 text-brand-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-brand-muted" />}
          </div>

          {isSettingsOpen && (
            <div className="p-4 space-y-4">
              {/* Presets */}
              <div>
                <span className="block text-[8px] font-bold text-brand-muted uppercase tracking-wider mb-1.5">Preset Sizes</span>
                <div className="grid grid-cols-2 gap-1">
                  <button 
                    onClick={() => applyPreset(800, 800)}
                    className={`text-[9px] uppercase tracking-wider py-1 border border-brand-border rounded hover:border-brand-accent hover:text-brand-accent transition-colors ${width === 800 && height === 800 ? 'border-brand-accent text-brand-accent font-bold bg-brand-accent/5' : 'text-brand-muted'}`}
                  >
                    Square (800)
                  </button>
                  <button 
                    onClick={() => applyPreset(1200, 1200)}
                    className={`text-[9px] uppercase tracking-wider py-1 border border-brand-border rounded hover:border-brand-accent hover:text-brand-accent transition-colors ${width === 1200 && height === 1200 ? 'border-brand-accent text-brand-accent font-bold bg-brand-accent/5' : 'text-brand-muted'}`}
                  >
                    Hi-Res Sq (1200)
                  </button>
                  <button 
                    onClick={() => applyPreset(1920, 1080)}
                    className={`text-[9px] uppercase tracking-wider py-1 border border-brand-border rounded hover:border-brand-accent hover:text-brand-accent transition-colors ${width === 1920 && height === 1080 ? 'border-brand-accent text-brand-accent font-bold bg-brand-accent/5' : 'text-brand-muted'}`}
                  >
                    Full HD (1080)
                  </button>
                  <button 
                    onClick={() => applyPreset(1080, 1920)}
                    className={`text-[9px] uppercase tracking-wider py-1 border border-brand-border rounded hover:border-brand-accent hover:text-brand-accent transition-colors ${width === 1080 && height === 1920 ? 'border-brand-accent text-brand-accent font-bold bg-brand-accent/5' : 'text-brand-muted'}`}
                  >
                    Vertical (1920)
                  </button>
                </div>
              </div>

              {/* Dimensions Input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] font-bold text-brand-muted uppercase tracking-wider mb-1">Width (px)</label>
                  <input 
                    type="number" 
                    value={width} 
                    onChange={e => setWidth(Math.min(3000, Math.max(100, Number(e.target.value))))}
                    className="w-full bg-black/60 border border-brand-border px-2 py-1.5 text-white text-xs font-mono rounded focus:outline-none focus:border-brand-accent" 
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-brand-muted uppercase tracking-wider mb-1">Height (px)</label>
                  <input 
                    type="number" 
                    value={height} 
                    onChange={e => setHeight(Math.min(3000, Math.max(100, Number(e.target.value))))}
                    className="w-full bg-black/60 border border-brand-border px-2 py-1.5 text-white text-xs font-mono rounded focus:outline-none focus:border-brand-accent" 
                  />
                </div>
              </div>

              {/* Scale & Format */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] font-bold text-brand-muted uppercase tracking-wider mb-1">Retina Scale</label>
                  <select 
                    value={scale} 
                    onChange={e => setScale(Number(e.target.value))}
                    className="w-full bg-black/60 border border-brand-border px-2 py-1.5 text-white text-xs cursor-pointer rounded focus:outline-none focus:border-brand-accent"
                  >
                    <option value={1}>1x (Standard)</option>
                    <option value={2}>2x (Retina)</option>
                    <option value={3}>3x (SuperRes)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-brand-muted uppercase tracking-wider mb-1">Format</label>
                  <select 
                    value={format} 
                    onChange={e => setFormat(e.target.value as 'png'|'jpeg')}
                    className="w-full bg-black/60 border border-brand-border px-2 py-1.5 text-white text-xs cursor-pointer rounded focus:outline-none focus:border-brand-accent"
                  >
                    <option value="png">PNG</option>
                    <option value="jpeg">JPEG</option>
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={handleExport}
                disabled={isExporting}
                className="w-full bg-brand-accent hover:bg-white text-black font-black uppercase tracking-[0.15em] text-[10px] py-2.5 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-brand-accent/25 rounded"
              >
                <Download className="w-3.5 h-3.5" />
                {isExporting ? 'GENERATING...' : 'EXPORT MAP CANVAS'}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Map Layers Stack */}
        <div className="relative md:absolute md:top-4 md:right-4 z-[1000] w-full md:w-[280px] bg-brand-surface/95 backdrop-blur-md border-b md:border border-brand-border md:rounded shadow-2xl transition-all duration-300">
          <div 
            onClick={() => setIsLayersOpen(!isLayersOpen)}
            className="flex items-center justify-between p-3 border-b border-brand-border/60 cursor-pointer hover:bg-white/5 select-none"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-accent" />
              <span className="text-[11px] font-black uppercase tracking-widest text-white">Layer Blending</span>
            </div>
            {isLayersOpen ? <ChevronUp className="w-3.5 h-3.5 text-brand-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-brand-muted" />}
          </div>

          {isLayersOpen && (
            <div className="p-3 max-h-[420px] overflow-y-auto space-y-3 scrollbar-none">
              <div className="flex items-center justify-between border-b border-brand-border/40 pb-1.5">
                <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider">Active Layers (Stack)</span>
                <div className="group relative">
                  <HelpCircle className="w-3.5 h-3.5 text-brand-muted hover:text-white cursor-pointer" />
                  <span className="absolute right-0 bottom-full mb-2 w-48 bg-black border border-brand-border text-[8px] text-brand-muted p-2 uppercase tracking-wider rounded shadow-2xl hidden group-hover:block z-50 normal-case leading-relaxed">
                    Toggle multiple layers, slide opacities to blend, and use arrows to rearrange the draw order.
                  </span>
                </div>
              </div>

              {/* Stack is rendered in reverse order so the top-most layer is visually at the top of the list! */}
              <div className="space-y-2">
                {[...exportLayers].reverse().map((layer, revIdx) => {
                  const index = exportLayers.length - 1 - revIdx;
                  return (
                    <div key={layer.id} className="p-2 bg-black/40 border border-brand-border/30 hover:border-brand-border/60 transition-colors rounded-sm">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer group text-[10px] uppercase tracking-wider text-white">
                          <input 
                            type="checkbox" 
                            checked={layer.checked} 
                            onChange={(e) => {
                              const newLayers = [...exportLayers];
                              newLayers[index].checked = e.target.checked;
                              setExportLayers(newLayers);
                            }}
                            className="accent-brand-accent h-3.5 w-3.5 cursor-pointer rounded-sm"
                          />
                          <span className={layer.checked ? 'text-brand-accent font-black' : 'text-brand-muted group-hover:text-white transition-colors'}>
                            {layer.name}
                          </span>
                        </label>

                        {/* Rearrange controls */}
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button 
                            onClick={() => moveLayer(index, 'down')}
                            disabled={index === 0}
                            className="p-1 hover:text-brand-accent text-brand-muted disabled:opacity-20 disabled:hover:text-brand-muted transition-colors cursor-pointer"
                            title="Move Down (towards bottom of stack)"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[8px] font-mono text-brand-muted min-w-[12px] text-center" title="Stack Order">
                            {index + 1}
                          </span>
                          <button 
                            onClick={() => moveLayer(index, 'up')}
                            disabled={index === exportLayers.length - 1}
                            className="p-1 hover:text-brand-accent text-brand-muted disabled:opacity-20 disabled:hover:text-brand-muted transition-colors cursor-pointer"
                            title="Move Up (towards top of stack)"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {layer.checked && (
                        <div className="flex items-center gap-2 mt-2 pl-5">
                          <span className="text-[8px] uppercase tracking-wider text-brand-muted shrink-0 w-[42px]">Opacity:</span>
                          <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.01"
                            value={layer.opacity} 
                            onChange={(e) => {
                              const newLayers = [...exportLayers];
                              newLayers[index].opacity = parseFloat(e.target.value);
                              setExportLayers(newLayers);
                            }}
                            className="flex-grow accent-brand-accent h-1 bg-brand-border/40 rounded-lg cursor-pointer appearance-none"
                          />
                          <span className="text-[9px] font-mono text-white w-[25px] text-right shrink-0">
                            {Math.round(layer.opacity * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* CANVAS PREVIEW AREA (The interactive workspace) */}
        <div className="flex-grow overflow-auto p-4 md:p-12 bg-[#090909] flex items-center justify-center relative z-0 min-h-[400px]">
          {/* Scrollable container mirroring the user-specified export resolution */}
          <div className="shadow-2xl border border-brand-border/60 overflow-hidden bg-black shrink-0 relative transition-all duration-300">
            <div ref={mapRef} style={{ width, height, position: 'relative' }}>
              <MapContainer
                center={center}
                zoom={15}
                zoomControl={true}
                style={{ height: '100%', width: '100%', background: '#000' }}
              >
                {/* Dynamically build stacked TileLayers based on blend configuration */}
                {/* Fixed key to ensure buttery-smooth continuous hardware-accelerated opacity sliding! */}
                {exportLayers
                  .filter(layer => layer.checked)
                  .map(layer => {
                    if (layer.bounds) {
                      return (
                        <TileLayer
                          key={layer.id}
                          url={layer.url}
                          attribution={layer.attribution}
                          opacity={layer.opacity}
                          zIndex={layer.zIndex}
                          bounds={layer.bounds as L.LatLngBoundsExpression}
                          className={layer.className}
                          crossOrigin="anonymous"
                        />
                      );
                    }
                    return (
                      <TileLayer
                        key={layer.id}
                        url={layer.url}
                        attribution={layer.attribution}
                        opacity={layer.opacity}
                        zIndex={layer.zIndex}
                        crossOrigin="anonymous"
                      />
                    );
                  })}
                <Marker 
                  position={markerPos} 
                  icon={customIcon}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => {
                      setMarkerPos(e.target.getLatLng());
                    }
                  }}
                />
                <MapController center={center} width={width} height={height} />
              </MapContainer>
            </div>
          </div>
        </div>

      </div>

      {/* Floating Canvas Meta Footer */}
      <div className="bg-brand-surface border-t border-brand-border shrink-0 py-2.5 px-4 flex flex-wrap justify-between items-center text-[10px] uppercase tracking-wider text-brand-muted z-[1001]">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white">Interactive Canvas Preview</span>
          <span>•</span>
          <span>Dimensions: {width} x {height} px</span>
          <span>•</span>
          <span>Target File: ~{Math.round(width * height * 4 / (1024 * 1024))}MB Raw</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 font-mono">
          <span>Marker Coordinates: {markerPos.lat.toFixed(6)}, {markerPos.lng.toFixed(6)}</span>
        </div>
      </div>
    </div>
  );
};
