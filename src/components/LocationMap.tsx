import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, LayersControl, LayerGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Search } from 'lucide-react';
import { decode as decodePlusCode } from 'open-location-code';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  location: { lat: number; lng: number } | null;
  onLocationSelect: (loc: { lat: number; lng: number }) => void;
  photos?: any[];
  onPhotoMove?: (id: string, lat: number, lng: number) => void;
}

interface PhotoMarkerProps {
  photo: any;
  onMove: (id: string, lat: number, lng: number) => void;
}

const PhotoMarker: React.FC<PhotoMarkerProps> = ({ photo, onMove }) => {
  if (photo.lat === null || photo.lng === null) return null;
  
  const icon = L.divIcon({
    className: 'custom-photo-marker',
    html: `<div style="width: 40px; height: 40px; border: 2px solid var(--color-brand-pin, #d480ff); border-radius: 4px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.5); background: #000;"><img src="${photo.dataUrl}" style="width: 100%; height: 100%; object-fit: cover;" /></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });

  return (
    <Marker 
      position={{ lat: photo.lat, lng: photo.lng }} 
      icon={icon}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const position = marker.getLatLng();
          if (onMove) onMove(photo.id, position.lat, position.lng);
        }
      }}
    />
  );
};

const LocationMarker = ({ location, onLocationSelect }: MapProps) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });

  return location === null ? null : (
    <Marker position={location} />
  );
};

function MapController({ center }: { center: {lat: number, lng: number} }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 13);
  }, [center, map]);
  return null;
}

export const LocationMap: React.FC<MapProps> = ({ location, onLocationSelect, photos = [], onPhotoMove }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);
  const [userLoc, setUserLoc] = useState<{lat: number, lng: number} | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (location) {
      setMapCenter(location);
      // optionally fetch reverse geocoding if we don't have a search query, but we don't know the preset name here.
      // So we'll just center the map.
    }
  }, [location]);

  useEffect(() => {
    let locSet = false;
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLoc(loc);
          if (!location && !mapCenter && !locSet) {
            setMapCenter(loc);
            locSet = true;
          }
        },
        (error) => {
          console.warn("Geolocation denied or error", error);
        }
      );
    }

    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data && data.latitude && data.longitude) {
           const loc = { lat: data.latitude, lng: data.longitude };
           if (!userLoc) setUserLoc(loc);
           if (!location && !mapCenter && !locSet) {
              setMapCenter(loc);
              locSet = true;
           }
        }
      })
      .catch(err => console.warn("IP Geolocation failed", err));
  }, []);
  
  const fetchSuggestions = async (query: string) => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    
    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;
    const biasLoc = location || userLoc || mapCenter;
    if (biasLoc) {
      url += `&lat=${biasLoc.lat}&lon=${biasLoc.lng}`;
    }

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data && data.features) {
        setSuggestions(data.features);
      }
    } catch (error) {
      console.error("Autocomplete failed", error);
    }
  };

  const parseGoogleMapsLink = (url: string) => {
    try {
      const maybeCode = url.trim().toUpperCase();
      if (/^[23456789CFCGHJMPQRVWX]{4}[23456789CFCGHJMPQRVWX]{2,4}\+[23456789CFCGHJMPQRVWX]{2,3}$/.test(maybeCode)) {
        const decoded = decodePlusCode(maybeCode);
        if (decoded) {
          return { lat: decoded.latitudeCenter, lng: decoded.longitudeCenter };
        }
      }
    } catch (e) {}

    // Matches !3d(lat)!4d(lng) first (actual pin location in long links)
    let match = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    // Matches /@lat,lng
    match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    // Matches ?q=lat,lng or &q=lat,lng or ?ll=lat,lng
    match = url.match(/[?&](q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      return { lat: parseFloat(match[2]), lng: parseFloat(match[3]) };
    }
    // Matches raw lat,lng pasted
    match = url.match(/^(-?\d+\.\d+)(?:,\s*|\s+)(-?\d+\.\d+)$/);
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    const googleLoc = parseGoogleMapsLink(val);
    if (googleLoc) {
      setShowSuggestions(false);
      onLocationSelect(googleLoc);
      setMapCenter(googleLoc);
      return;
    }

    setShowSuggestions(true);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const handleSelectSuggestion = (feature: any) => {
    const [lng, lat] = feature.geometry.coordinates;
    const newLoc = { lat, lng };
    const name = feature.properties.name || feature.properties.city || feature.properties.state;
    
    setSearchQuery(name);
    setShowSuggestions(false);
    onLocationSelect(newLoc);
    setMapCenter(newLoc);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery) return;

    const googleLoc = parseGoogleMapsLink(searchQuery);
    if (googleLoc) {
      setShowSuggestions(false);
      onLocationSelect(googleLoc);
      setMapCenter(googleLoc);
      return;
    }
    
    setShowSuggestions(false);
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const newLoc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        onLocationSelect(newLoc);
        setMapCenter(newLoc);
      } else {
        alert("Location not found.");
      }
    } catch (error) {
      console.error("Search failed", error);
    }
  };

  const handleMapClick = async (latlng: {lat: number, lng: number}) => {
    onLocationSelect(latlng);
    setMapCenter(latlng);
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`);
      const data = await response.json();
      if (data && data.display_name) {
        setSearchQuery(data.display_name);
      }
    } catch (error) {
      console.error("Reverse geocoding failed", error);
    }
  };

  return (
    <div className="w-full flex flex-col border border-brand-border bg-brand-bg relative z-0 h-full">
      <div className="relative z-10 shrink-0">
        <form onSubmit={handleSearch} className="flex border-b border-brand-border bg-brand-surface shrink-0">
          <div className="flex-1 flex items-center px-4 relative">
            <Search className="w-5 h-5 text-brand-muted" />
            <input 
              type="text" 
              placeholder="SEARCH FOR A LOCATION..." 
              className="w-full p-4 outline-none bg-transparent text-white placeholder-brand-muted uppercase text-xs tracking-widest font-bold"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
          </div>
          <button type="submit" className="px-8 bg-white text-black hover:bg-gray-200 transition-colors font-black uppercase text-xs tracking-[0.2em] hidden sm:block cursor-pointer">
            Locate
          </button>
        </form>
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-brand-surface border-x border-b border-brand-border shadow-2xl z-50">
            {suggestions.map((feature, idx) => {
              const { name, city, state, country } = feature.properties;
              const displayName = [name, city, state, country].filter(Boolean).join(', ');
              return (
                <div 
                  key={idx}
                  onClick={() => handleSelectSuggestion(feature)}
                  className="px-4 py-3 hover:bg-brand-accent hover:text-black cursor-pointer border-b border-brand-border last:border-0 transition-colors"
                >
                  <div className="text-sm font-bold uppercase tracking-widest truncate">
                    {displayName}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-grow w-full relative z-0 bg-black min-h-[400px]">
        <MapContainer 
          center={location || [34.0522, -118.2437]} 
          zoom={location ? 13 : 2} 
          minZoom={3}
          maxBounds={[[-90, -180], [90, 180]]}
          maxBoundsViscosity={1.0}
          style={{ height: '100%', width: '100%', position: 'absolute', inset: 0 }}
        >
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={22}
            maxNativeZoom={17}
            zIndex={1}
          />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            minZoom={18}
            maxZoom={22}
            maxNativeZoom={19}
            zIndex={2}
          />
          <TileLayer
            url="https://tiles.arcgis.com/tiles/TGjun5cqf5Jwp2Ad/arcgis/rest/services/HULHUMALE_IMAGERY_24TH_MARCH_2024/MapServer/tile/{z}/{y}/{x}"
            attribution='Hulhumalé Imagery &copy; HDC'
            maxNativeZoom={20}
            maxZoom={22}
            bounds={[[4.1, 73.4], [4.3, 73.6]]}
            errorTileUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            zIndex={3}
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            maxZoom={18}
            errorTileUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            zIndex={4}
          />
          {mapCenter && <MapController center={mapCenter} />}
          <LocationMarker location={location} onLocationSelect={handleMapClick} />
          {photos.map(p => <PhotoMarker key={p.id} photo={p} onMove={onPhotoMove!} />)}
        </MapContainer>
      </div>
    </div>
  );
};

