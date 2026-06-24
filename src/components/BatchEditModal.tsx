import React, { useState, useEffect } from 'react';

interface BatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: { keywords: string[], description: string, lat: number | null, lng: number | null, artist: string, copyright: string, datetime: string }) => void;
  initialData?: {
    keywords: string[];
    description: string;
    lat: number | null;
    lng: number | null;
    artist: string;
    copyright: string;
    datetime: string;
  };
  isSingleEdit?: boolean;
}

export const BatchEditModal: React.FC<BatchEditModalProps> = ({ 
  isOpen, 
  onClose, 
  onApply,
  initialData,
  isSingleEdit = false
}) => {
  const [keywordsInput, setKeywordsInput] = useState('');
  const [description, setDescription] = useState('');
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [artist, setArtist] = useState('');
  const [copyright, setCopyright] = useState('');
  const [datetime, setDatetime] = useState('');

  useEffect(() => {
    if (isOpen) {
      setKeywordsInput(initialData?.keywords?.join(', ') || '');
      setDescription(initialData?.description || '');
      setLatInput(initialData?.lat !== null && initialData?.lat !== undefined ? String(initialData.lat) : '');
      setLngInput(initialData?.lng !== null && initialData?.lng !== undefined ? String(initialData.lng) : '');
      setArtist(initialData?.artist || '');
      setCopyright(initialData?.copyright || '');
      setDatetime(initialData?.datetime || '');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleApply = () => {
    const kws = keywordsInput.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const lat = latInput.trim() === '' ? null : parseFloat(latInput);
    const lng = lngInput.trim() === '' ? null : parseFloat(lngInput);
    
    onApply({
       keywords: kws,
       description,
       lat: isNaN(lat as number) ? null : lat,
       lng: isNaN(lng as number) ? null : lng,
       artist,
       copyright,
       datetime
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-brand-bg border border-brand-border shadow-2xl w-full max-w-2xl my-8 flex flex-col max-h-full animate-in fade-in zoom-in duration-200">
        <div className="p-8 overflow-y-auto flex-grow">
          <h3 className="text-3xl font-black text-white mb-8 tracking-tighter uppercase">
            {isSingleEdit ? "Edit Metadata" : "Batch Edit"}
          </h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-[0.2em] mb-2">Latitude</label>
                <input 
                  type="text" 
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder="e.g. 34.0522"
                  className="w-full px-4 py-3 bg-black border border-brand-border text-white focus:outline-none focus:border-brand-accent transition-colors font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-[0.2em] mb-2">Longitude</label>
                <input 
                  type="text" 
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  placeholder="e.g. -118.2437"
                  className="w-full px-4 py-3 bg-black border border-brand-border text-white focus:outline-none focus:border-brand-accent transition-colors font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-[0.2em] mb-2">Artist / Photographer</label>
              <input 
                type="text" 
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="AUTHOR NAME..."
                className="w-full px-4 py-3 bg-black border border-brand-border text-white focus:outline-none focus:border-brand-accent transition-colors font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-[0.2em] mb-2">Copyright</label>
              <input 
                type="text" 
                value={copyright}
                onChange={(e) => setCopyright(e.target.value)}
                placeholder="© 2026..."
                className="w-full px-4 py-3 bg-black border border-brand-border text-white focus:outline-none focus:border-brand-accent transition-colors font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-[0.2em] mb-2">Date Time Original</label>
              <input 
                type="text" 
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
                placeholder="YYYY:MM:DD HH:MM:SS"
                className="w-full px-4 py-3 bg-black border border-brand-border text-white focus:outline-none focus:border-brand-accent transition-colors font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-[0.2em] mb-2">Keywords</label>
              <input 
                type="text" 
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="TAG1, TAG2..."
                className="w-full px-4 py-3 bg-black border border-brand-border text-white focus:outline-none focus:border-brand-accent transition-colors font-mono text-sm"
              />
              <p className="text-[10px] text-brand-muted mt-2 uppercase tracking-widest">Separate with commas.</p>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-brand-muted uppercase tracking-[0.2em] mb-2">Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`ENTER DESCRIPTION...`}
                rows={4}
                className="w-full px-4 py-3 bg-black border border-brand-border text-white focus:outline-none focus:border-brand-accent transition-colors font-mono text-sm resize-none"
              />
            </div>
          </div>
        </div>
        
        <div className="px-8 py-6 bg-brand-surface flex justify-end gap-4 border-t border-brand-border shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-3 text-sm font-black text-white uppercase tracking-[0.1em] hover:text-brand-pin transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleApply}
            className="px-8 py-3 text-sm font-black text-black bg-white uppercase tracking-[0.1em] hover:bg-gray-200 transition-colors"
          >
            {isSingleEdit ? "Apply Changes" : "Apply to All"}
          </button>
        </div>
      </div>
    </div>
  );
};

