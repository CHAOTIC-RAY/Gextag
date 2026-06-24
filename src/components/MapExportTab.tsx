import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toPng, toJpeg } from 'html-to-image';
import { saveAs } from 'file-saver';

const THEMES = [
  { id: 'esri-sat', name: 'Esri Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri' },
  { id: 'osm', name: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors' },
  { id: 'carto-dark', name: 'Carto Dark', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '&copy; OpenStreetMap contributors &copy; CARTO' },
  { id: 'carto-light', name: 'Carto Light', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attribution: '&copy; OpenStreetMap contributors &copy; CARTO' },
  { id: 'esri-topo', name: 'Esri Topographic', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri' },
  { id: 'hulhumale', name: 'Hulhumalé 2024', url: 'https://tiles.arcgis.com/tiles/TGjun5cqf5Jwp2Ad/arcgis/rest/services/HULHUMALE_IMAGERY_24TH_MARCH_2024/MapServer/tile/{z}/{y}/{x}', attribution: 'HDC' }
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

const MapController = ({ center }: { center: { lat: number, lng: number } }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

export const MapExportTab = ({ location }: { location: { lat: number, lng: number } | null }) => {
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(800);
  const [scale, setScale] = useState(2);
  const [theme, setTheme] = useState(THEMES[0]);
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [isExporting, setIsExporting] = useState(false);
  
  const [center, setCenter] = useState({ lat: 4.1755, lng: 73.5093 }); // default Malé
  const [markerPos, setMarkerPos] = useState({ lat: 4.1755, lng: 73.5093 });

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
      // html-to-image needs to capture the actual DOM node.
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
      
      saveAs(dataUrl, `map-export-${width}x${height}@${scale}x.${format}`);
    } catch (err) {
      console.error('Export failed', err);
      alert('Failed to export map. This may be due to CORS restrictions on some map tiles.');
    } finally {
      setIsExporting(false);
    }
  };

  const [containerWidth, setContainerWidth] = useState(500);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(Math.max(200, entry.contentRect.width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const displayScale = Math.min(1, containerWidth / width);

  return (
    <div className="h-full w-full bg-black text-white p-4 overflow-y-auto flex flex-col items-center">
      <div className="w-full max-w-5xl" ref={containerRef}>
        <div className="flex flex-col gap-4 mb-4 bg-brand-surface p-4 border border-brand-border">
          <h2 className="text-[12px] uppercase tracking-widest font-bold text-brand-accent mb-2">Export Settings</h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-brand-muted mb-1">Width (px)</label>
            <input type="number" value={width} onChange={e => setWidth(Math.min(2000, Math.max(100, Number(e.target.value))))} className="w-full bg-black border border-brand-border p-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-brand-muted mb-1">Height (px)</label>
            <input type="number" value={height} onChange={e => setHeight(Math.min(2000, Math.max(100, Number(e.target.value))))} className="w-full bg-black border border-brand-border p-2 text-white text-sm" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-brand-muted mb-1">Scale (Retina)</label>
            <select value={scale} onChange={e => setScale(Number(e.target.value))} className="w-full bg-black border border-brand-border p-2 text-white text-sm">
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={3}>3x</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-brand-muted mb-1">Format</label>
            <select value={format} onChange={e => setFormat(e.target.value as 'png'|'jpeg')} className="w-full bg-black border border-brand-border p-2 text-white text-sm">
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-brand-muted mb-1 mt-2">Theme</label>
          <div className="flex flex-wrap gap-2">
            {THEMES.map(t => (
              <button 
                key={t.id} 
                onClick={() => setTheme(t)}
                className={`p-[6px_12px] text-[10px] uppercase tracking-widest border ${theme.id === t.id ? 'border-brand-accent text-brand-accent bg-brand-accent/10' : 'border-brand-border text-brand-muted hover:text-white'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="mt-4 bg-brand-accent text-black font-bold uppercase tracking-widest p-3 hover:bg-white transition-colors disabled:opacity-50"
        >
          {isExporting ? 'Generating...' : `Export ${width}x${height} @${scale}x`}
        </button>
      </div>

      <div className="text-[10px] text-brand-muted mb-2 uppercase tracking-widest">
        Preview (Scaled to fit) - Drag marker to position
      </div>

      {/* Wrapper to handle scaling down large maps for preview */}
      <div className="relative overflow-hidden border border-brand-border bg-brand-surface" style={{ width: width * displayScale, height: height * displayScale }}>
        <div style={{ width, height, transform: `scale(${displayScale})`, transformOrigin: 'top left' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }}>
            <MapContainer
              center={center}
              zoom={15}
              zoomControl={false}
              style={{ height: '100%', width: '100%', background: '#000' }}
            >
              <TileLayer
                key={theme.id} // force re-render on theme change
                url={theme.url}
                attribution={theme.attribution}
                crossOrigin="anonymous" // required for exporting canvas
              />
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
              <MapController center={center} />
            </MapContainer>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
