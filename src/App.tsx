import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { get, set } from 'idb-keyval';
import { DropzoneArea } from './components/DropzoneArea';
import { LocationMap } from './components/LocationMap';
import { PhotoList } from './components/PhotoList';
import { BatchEditModal } from './components/BatchEditModal';
import { ExportModal } from './components/ExportModal';
import { MapExportTab } from './components/MapExportTab';
import { Photo } from './types';
import { fileToDataUrl, convertToJpegDataUrl, applyMetadata, convertFormat } from './utils/exif';
import { Images, MapPin, Download } from 'lucide-react';

export default function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapTab, setMapTab] = useState<'queue' | 'tagging' | 'export'>('queue');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mapTab === 'queue') {
        setMapTab('tagging');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mapTab]);

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

  const [lastBatchData, setLastBatchData] = useState<any>(null);
  const [activePresetData, setActivePresetData] = useState<any>(null);

  const [presets, setPresets] = useState<Array<any>>(() => {
    try {
      const savedPresets = localStorage.getItem('gextag_presets');
      if (savedPresets) return JSON.parse(savedPresets);
      const savedLocations = localStorage.getItem('gextag_locations');
      return savedLocations ? JSON.parse(savedLocations) : [];
    } catch {
      return [];
    }
  });

  const handleSavePreset = (additionalData?: any) => {
    // Check if additionalData is an event (e.g. from onClick)
    const isEvent = additionalData && typeof additionalData === 'object' && 'nativeEvent' in additionalData;
    const dataToSave = (additionalData && !isEvent && Object.keys(additionalData).length > 0) ? additionalData : (lastBatchData || {});
    
    const latToSave = dataToSave.lat !== undefined ? dataToSave.lat : (selectedLocation?.lat || null);
    const lngToSave = dataToSave.lng !== undefined ? dataToSave.lng : (selectedLocation?.lng || null);

    if (latToSave === null && lngToSave === null && Object.keys(dataToSave).length === 0) {
       alert("No edits or location to save as preset.");
       return;
    }

    const name = window.prompt("ENTER A NAME FOR THIS PRESET:");
    if (!name || name.trim() === '') return;
    
    const newPreset = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      lat: latToSave,
      lng: lngToSave,
      description: dataToSave.description || '',
      artist: dataToSave.artist || '',
      copyright: dataToSave.copyright || '',
      keywords: dataToSave.keywords || [],
      datetime: dataToSave.datetime || ''
    };
    
    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('gextag_presets', JSON.stringify(updated));
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
      setLastBatchData(data);
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

      if (lastBatchData) {
        const exists = presets.some(p => 
          p.lat === lastBatchData.lat && 
          p.lng === lastBatchData.lng && 
          p.description === lastBatchData.description &&
          p.artist === lastBatchData.artist &&
          p.copyright === lastBatchData.copyright
        );
        if (!exists) {
          if (window.confirm("Do you want to save the applied batch metadata as a new preset?")) {
            handleSavePreset(lastBatchData);
          }
        }
      }
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
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-brand-bg text-white">
      <header className="border-b border-brand-border flex flex-row items-center justify-between p-4 md:p-5 gap-4 md:gap-5 shrink-0 bg-brand-bg relative">
          <div className="flex flex-col items-start shrink-0">
            <span className="text-[9px] md:text-[11px] uppercase tracking-[0.2em] text-brand-muted">Gextag v3.0</span>
            <img src="/logo.svg" alt="GexTag Logo" className="h-[22px] sm:h-[30px] md:h-[40px] object-contain mt-0.5" />
          </div>
          
          <div className="flex flex-col items-end text-right justify-center gap-1.5 md:gap-2">
            {/* Passion credits - opposite side of Gextag logo */}
            <div className="flex flex-col items-end text-right text-[8px] sm:text-[9px] uppercase tracking-wider text-brand-muted shrink-0 select-none">
              <span className="font-bold text-white leading-tight">Created from passion by chaos.studio.mv</span>
              <div className="hidden sm:flex flex-row flex-wrap items-center justify-end gap-x-2 gap-y-0 text-[7.5px] font-mono mt-0.5 text-brand-muted/80">
                <a href="mailto:chaos.studio.mv@gmail.com" className="hover:text-brand-accent transition-colors">chaos.studio.mv@gmail.com</a>
                <span>•</span>
                <span>+960 9401011 (Telegram)</span>
                <span>•</span>
                <a href="https://portfolio.chaoticstudio.workers.dev/studio" target="_blank" rel="noopener noreferrer" className="hover:text-brand-accent transition-colors">chaos.studio</a>
              </div>
            </div>

            {/* Navigation Tabs for desktop */}
            <div className="hidden md:flex h-[24px] gap-6 items-center w-auto justify-end">
              <button 
                onClick={() => setMapTab('tagging')} 
                className={`h-full border-b-2 font-black uppercase tracking-[0.2em] text-[10px] transition-colors whitespace-nowrap pb-1 ${mapTab === 'tagging' ? 'border-brand-accent text-white' : 'border-transparent text-brand-muted hover:text-white'}`}
              >
                Geotagger
              </button>
              <button 
                onClick={() => setMapTab('export')} 
                className={`h-full border-b-2 font-black uppercase tracking-[0.2em] text-[10px] transition-colors whitespace-nowrap pb-1 ${mapTab === 'export' ? 'border-brand-accent text-white' : 'border-transparent text-brand-muted hover:text-white'}`}
              >
                Map Export (Beta)
              </button>
            </div>
          </div>
      </header>

      <main className="flex-grow flex flex-col md:flex-row overflow-hidden border-b border-brand-border">
          {/* Left Column: Upload & Queue */}
          <section className={`${mapTab === 'queue' ? 'flex flex-grow w-full h-full' : 'hidden md:flex'} flex-col md:h-auto md:w-[320px] lg:w-[400px] border-b md:border-b-0 md:border-r border-brand-border shrink-0 overflow-hidden`}>
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

          {/* Center/Main Column: Map & Workspaces */}
          <section className={`${mapTab !== 'queue' ? 'flex flex-col flex-grow w-full h-full' : 'hidden md:flex md:flex-col md:flex-grow'} relative bg-black shrink-0 md:shrink overflow-hidden min-h-0`}>
            <div className="h-auto md:h-[46px] px-5 py-2 md:py-0 text-[10px] uppercase tracking-[0.3em] text-brand-muted border-b border-brand-border bg-brand-bg shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-0">
              <div className="flex h-[30px] md:h-full gap-4 items-center w-full md:w-auto border-b border-[#333] md:border-none pb-2 md:pb-0">
                <span className="font-bold text-white">
                  {mapTab === 'tagging' ? 'GEOTAGGER' : mapTab === 'export' ? 'MAP EXPORT (BETA)' : 'BATCH QUEUE'}
                </span>
              </div>
              {mapTab === 'tagging' && (
                <div className="flex gap-4 items-center w-full md:w-auto justify-between md:justify-end mt-2 md:mt-0">
                  {presets.length > 0 && (
                  <select 
                    className="bg-black text-white border border-brand-border text-[10px] p-[4px_8px] uppercase tracking-widest outline-none cursor-pointer"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('del_')) {
                        const id = val.replace('del_', '');
                        if (window.confirm("Are you sure you want to delete this preset?")) {
                           const updated = presets.filter(p => p.id !== id);
                           setPresets(updated);
                           localStorage.setItem('gextag_presets', JSON.stringify(updated));
                        }
                      } else if (val) {
                        const p = presets.find(l => l.id === val);
                        if (p) {
                          setSelectedLocation({ lat: p.lat, lng: p.lng });
                          setActivePresetData(p);
                          setEditingPhotoId(null);
                          setIsBatchModalOpen(true);
                        }
                      }
                      e.target.value = "";
                    }}
                    value=""
                  >
                    <option value="" disabled>Presets...</option>
                    <optgroup label="Load">
                      {presets.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Delete">
                      {presets.map(p => (
                        <option key={`del_${p.id}`} value={`del_${p.id}`}>Delete: {p.name}</option>
                      ))}
                    </optgroup>
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
              )}
            </div>
            <div className="flex-grow relative z-0 flex flex-col h-full overflow-hidden">
               {mapTab === 'tagging' ? (
                 <LocationMap location={selectedLocation} onLocationSelect={setSelectedLocation} photos={photos} onPhotoMove={handlePhotoMove} />
               ) : mapTab === 'export' ? (
                 <MapExportTab location={selectedLocation} />
               ) : null}
            </div>
          </section>
        </main>

        <footer className={mapTab === 'tagging' ? "shrink-0 flex flex-col bg-brand-bg border-t border-brand-border" : "hidden"}>
          {mapTab === 'tagging' && (
            <div className="min-h-[80px] p-4 md:p-[0_20px] flex flex-col md:flex-row items-center justify-between border-b border-[#111] gap-4 md:gap-0">
              <div className="w-full md:w-auto flex justify-between md:justify-start items-center shrink-0">
                <span className="text-brand-muted text-[12px] mr-5 uppercase tracking-widest font-bold hidden sm:inline">
                  Selected: {selectedLocation ? `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}` : 'None'}
                </span>
                <button onClick={handleReset} className="w-full md:w-auto bg-transparent text-white border border-[#333] p-[10px_20px] md:p-[12px_30px] font-black uppercase text-[12px] md:text-[14px] tracking-[0.1em] cursor-pointer hover:bg-brand-surface hover:text-brand-pin transition-colors whitespace-nowrap">
                  Clear All
                </button>
              </div>
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto scrollbar-none py-1 flex-nowrap justify-start md:justify-end shrink-0">
                 <button onClick={() => {
                    setEditingPhotoId(null);
                    setIsBatchModalOpen(true);
                  }} className="shrink-0 bg-transparent text-white border border-[#333] p-[10px_20px] md:p-[12px_30px] font-black uppercase text-[11px] md:text-[14px] tracking-[0.1em] cursor-pointer hover:bg-brand-surface transition-colors whitespace-nowrap">
                  Batch Edit
                </button>
                <button onClick={handleTagAll} className="shrink-0 bg-brand-surface text-brand-accent border border-brand-accent p-[10px_20px] md:p-[12px_30px] font-black uppercase text-[11px] md:text-[14px] tracking-[0.1em] cursor-pointer hover:bg-brand-accent hover:text-black transition-colors whitespace-nowrap">
                  Tag Queue
                </button>
                <button disabled={isProcessing} onClick={() => setIsExportModalOpen(true)} className="shrink-0 bg-white text-black border-none p-[10px_20px] md:p-[12px_30px] font-black uppercase text-[11px] md:text-[14px] tracking-[0.1em] cursor-pointer hover:bg-gray-200 transition-colors disabled:opacity-50 whitespace-nowrap">
                  {isProcessing ? "Wait..." : `Export (${photos.length.toString().padStart(2, '0')})`}
                </button>
              </div>
            </div>
          )}
        </footer>

        {/* Bottom Navigation Bar for Mobile */}
        <nav className="md:hidden shrink-0 bg-brand-bg border-t border-brand-border h-[64px] flex justify-around items-center px-4 z-50">
          <button
            onClick={() => setMapTab('queue')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${mapTab === 'queue' ? 'text-brand-accent font-black' : 'text-brand-muted'}`}
          >
            <Images size={18} className={mapTab === 'queue' ? 'scale-110 text-brand-accent' : 'text-brand-muted'} />
            <span className="text-[9px] uppercase tracking-wider">Queue</span>
          </button>
          
          <button
            onClick={() => setMapTab('tagging')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${mapTab === 'tagging' ? 'text-brand-accent font-black' : 'text-brand-muted'}`}
          >
            <MapPin size={18} className={mapTab === 'tagging' ? 'scale-110 text-brand-accent' : 'text-brand-muted'} />
            <span className="text-[9px] uppercase tracking-wider">Geotagger</span>
          </button>
          
          <button
            onClick={() => setMapTab('export')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${mapTab === 'export' ? 'text-brand-accent font-black' : 'text-brand-muted'}`}
          >
            <Download size={18} className={mapTab === 'export' ? 'scale-110 text-brand-accent' : 'text-brand-muted'} />
            <span className="text-[9px] uppercase tracking-wider">Export</span>
          </button>
        </nav>

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
            setActivePresetData(null);
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
          } : activePresetData || undefined}
        />
      </div>
  );
}
