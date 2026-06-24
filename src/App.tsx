import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { get, set } from 'idb-keyval';
import { DropzoneArea } from './components/DropzoneArea';
import { LocationMap } from './components/LocationMap';
import { PhotoList } from './components/PhotoList';
import { BatchEditModal } from './components/BatchEditModal';
import { ExportModal } from './components/ExportModal';
import { Photo } from './types';
import { fileToDataUrl, convertToJpegDataUrl, applyMetadata, convertFormat } from './utils/exif';

export default function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    get<Photo[]>('gextag_queue').then((val) => {
      if (val) {
        setPhotos(val);
      }
      setIsLoaded(true);
    }).catch(err => {
      console.error("Failed to load queue from IndexedDB", err);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) {
      set('gextag_queue', photos).catch(err => console.error("Failed to save queue", err));
    }
  }, [photos, isLoaded]);

  const [savedLocations, setSavedLocations] = useState<Array<{id: string, name: string, lat: number, lng: number}>>(() => {
    try {
      const saved = localStorage.getItem('gextag_locations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleSavePreset = () => {
    if (!selectedLocation) return;
    const name = window.prompt("ENTER A NAME FOR THIS LOCATION PRESET:");
    if (!name || name.trim() === '') return;
    
    const newLoc = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      lat: selectedLocation.lat,
      lng: selectedLocation.lng
    };
    
    const updated = [...savedLocations, newLoc];
    setSavedLocations(updated);
    localStorage.setItem('gextag_locations', JSON.stringify(updated));
  };

  const handleFilesAccepted = async (files: File[]) => {
    const newPhotos: Photo[] = [];
    for (const file of files) {
      try {
        const rawDataUrl = await fileToDataUrl(file);
        const jpegDataUrl = await convertToJpegDataUrl(rawDataUrl);
        newPhotos.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          dataUrl: jpegDataUrl,
          name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
          type: 'image/jpeg',
          size: file.size,
          lat: null,
          lng: null,
          keywords: [],
          description: ''
        });
      } catch (err) {
        console.error("Failed to process file", file.name, err);
      }
    }
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleTagAll = () => {
    if (!selectedLocation) {
      alert("Please select a location on the map first.");
      return;
    }
    setPhotos(prev => prev.map(p => ({
      ...p,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng
    })));
  };

  const handleBatchApply = (data: { keywords: string[], description: string, lat: number | null, lng: number | null, artist: string, copyright: string, datetime: string }) => {
    if (editingPhotoId) {
      setPhotos(prev => prev.map(p => 
        p.id === editingPhotoId ? { ...p, ...data } : p
      ));
    } else {
      setPhotos(prev => prev.map(p => ({
        ...p,
        ...data
      })));
    }
    setEditingPhotoId(null);
  };

  const handleReset = () => {
    if (window.confirm("ARE YOU SURE YOU WANT TO CLEAR ALL PHOTOS?")) {
      setPhotos([]);
      setSelectedLocation(null);
    }
  };

  const handleDownloadZip = async (format: 'jpg' | 'png' | 'webp', baseName: string, suffix: string) => {
    if (photos.length === 0) return;
    setIsProcessing(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const metadataDataUrl = applyMetadata(
          photo.dataUrl, 
          photo.lat, 
          photo.lng, 
          photo.description, 
          photo.keywords,
          photo.artist,
          photo.copyright,
          photo.datetime
        );
        
        let finalDataUrl = metadataDataUrl;
        if (format !== 'jpg') {
          finalDataUrl = await convertFormat(metadataDataUrl, format);
        }
        
        const base64Data = finalDataUrl.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
        const ext = format === 'jpg' ? 'jpg' : format;
        
        let originalNameWithoutExt = photo.name.replace(/\.[^/.]+$/, "");
        let newNameWithoutExt = baseName.trim() ? `${baseName.trim()}_${String(i + 1).padStart(3, '0')}` : originalNameWithoutExt;
        
        const finalName = `${newNameWithoutExt}${suffix}.${ext}`;
        zip.file(finalName, base64Data, { base64: true });
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "geotagged_photos.zip");
    } catch (err) {
      console.error("Error generating zip", err);
      alert("There was an error creating the zip file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePhotoMove = (id: string, lat: number, lng: number) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, lat, lng } : p));
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-brand-bg text-white">
      <header className="h-[120px] border-b border-brand-border flex items-end p-5 gap-5 shrink-0">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.2em] text-brand-muted mb-2">Gextag v3.0</span>
            <img src="/logo.svg" alt="GexTag Logo" className="h-[40px] sm:h-[50px] md:h-[60px] object-contain" />
          </div>
        </header>

        <main className="flex-grow flex flex-col md:flex-row overflow-hidden border-b border-brand-border">
          {/* Left Column: Upload & Queue */}
          <section className="flex flex-col md:w-[320px] lg:w-[400px] border-r border-brand-border shrink-0">
            <div className="p-[15px_20px] text-[10px] uppercase tracking-[0.3em] text-brand-muted border-b border-brand-border flex justify-between shrink-0 bg-brand-bg">
              <span>Batch Queue</span>
              <span className="text-white">{photos.length.toString().padStart(2, '0')} Files</span>
            </div>
            <div className="overflow-y-auto flex-grow bg-black">
              <div className="p-4 border-b border-brand-border bg-brand-surface sticky top-0 z-10">
                <DropzoneArea onFilesAccepted={handleFilesAccepted} />
              </div>
              <PhotoList 
                photos={photos} 
                onDelete={handleDeletePhoto} 
                onEdit={(id) => {
                  setEditingPhotoId(id);
                  setIsBatchModalOpen(true);
                }} 
              />
            </div>
          </section>

          {/* Center Column: Map */}
          <section className="flex flex-col flex-grow relative bg-black shrink-0 md:shrink">
            <div className="p-[15px_20px] text-[10px] uppercase tracking-[0.3em] text-brand-muted border-b border-brand-border bg-brand-bg shrink-0 flex justify-between items-center">
              <span>Spatial Visualization</span>
              <div className="flex gap-4 items-center">
                {savedLocations.length > 0 && (
                  <select 
                    className="bg-black text-white border border-brand-border text-[10px] p-[4px_8px] uppercase tracking-widest outline-none cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value) {
                        const loc = savedLocations.find(l => l.id === e.target.value);
                        if (loc) setSelectedLocation({ lat: loc.lat, lng: loc.lng });
                        e.target.value = "";
                      }
                    }}
                    value=""
                  >
                    <option value="" disabled>Load Preset</option>
                    {savedLocations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                )}
                {selectedLocation && (
                  <button 
                    onClick={handleSavePreset} 
                    className="text-brand-accent hover:text-white transition-colors"
                    title="Save current location as preset"
                  >
                    + SAVE PRESET
                  </button>
                )}
              </div>
            </div>
            <div className="flex-grow relative z-0 flex flex-col">
               <LocationMap location={selectedLocation} onLocationSelect={setSelectedLocation} photos={photos} onPhotoMove={handlePhotoMove} />
            </div>
          </section>
        </main>

        <footer className="h-[80px] shrink-0 p-[0_20px] flex items-center justify-between bg-brand-bg">
          <div>
            <span className="text-brand-muted text-[12px] mr-5 uppercase tracking-widest font-bold hidden sm:inline">
              Selected: {selectedLocation ? `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}` : 'None'}
            </span>
            <button onClick={handleReset} className="bg-transparent text-white border border-[#333] p-[12px_30px] font-black uppercase text-[14px] tracking-[0.1em] cursor-pointer hover:bg-brand-surface hover:text-brand-pin transition-colors">
              Clear All
            </button>
          </div>
          <div className="flex gap-4">
             <button onClick={() => {
                setEditingPhotoId(null);
                setIsBatchModalOpen(true);
              }} className="bg-transparent text-white border border-[#333] p-[12px_30px] font-black uppercase text-[14px] tracking-[0.1em] cursor-pointer hover:bg-brand-surface transition-colors hidden md:block">
              Batch Edit
            </button>
            <button onClick={handleTagAll} className="bg-brand-surface text-brand-accent border border-brand-accent p-[12px_30px] font-black uppercase text-[14px] tracking-[0.1em] cursor-pointer hover:bg-brand-accent hover:text-black transition-colors hidden sm:block">
              Tag Queue
            </button>
            <button disabled={isProcessing} onClick={() => setIsExportModalOpen(true)} className="bg-white text-black border-none p-[12px_30px] font-black uppercase text-[14px] tracking-[0.1em] cursor-pointer hover:bg-gray-200 transition-colors disabled:opacity-50">
              {isProcessing ? "Processing..." : `Export Batch (${photos.length.toString().padStart(2, '0')})`}
            </button>
          </div>
        </footer>

        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleDownloadZip}
          count={photos.length}
        />

        <BatchEditModal 
          isOpen={isBatchModalOpen}
          onClose={() => {
            setIsBatchModalOpen(false);
            setEditingPhotoId(null);
          }}
          onApply={handleBatchApply}
          isSingleEdit={!!editingPhotoId}
          initialData={editingPhotoId ? {
            keywords: photos.find(p => p.id === editingPhotoId)?.keywords || [],
            description: photos.find(p => p.id === editingPhotoId)?.description || '',
            lat: photos.find(p => p.id === editingPhotoId)?.lat || null,
            lng: photos.find(p => p.id === editingPhotoId)?.lng || null,
            artist: photos.find(p => p.id === editingPhotoId)?.artist || '',
            copyright: photos.find(p => p.id === editingPhotoId)?.copyright || '',
            datetime: photos.find(p => p.id === editingPhotoId)?.datetime || '',
          } : undefined}
        />
      </div>
  );
}
