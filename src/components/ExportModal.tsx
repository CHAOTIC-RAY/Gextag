import React, { useState } from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'jpg' | 'png' | 'webp', baseName: string, suffix: string) => void;
  count: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, count }) => {
  const [format, setFormat] = useState<'jpg' | 'png' | 'webp'>('jpg');
  const [baseName, setBaseName] = useState('');
  const [suffix, setSuffix] = useState('-geotagged');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-surface border border-brand-border p-8 w-full max-w-md flex flex-col">
        <h2 className="text-[20px] font-black uppercase tracking-widest text-brand-accent mb-6 text-center">
          Export Batch
        </h2>
        
        <div className="flex flex-col gap-4 mb-6">
          <label className="text-white uppercase text-xs tracking-widest font-bold mb-2">Select Image Format</label>
          <div className="flex gap-4">
            {(['jpg', 'png', 'webp'] as const).map(fmt => (
              <label key={fmt} className={`flex-1 flex items-center justify-center border p-4 cursor-pointer transition-colors ${format === fmt ? 'border-brand-accent text-brand-accent bg-brand-bg' : 'border-brand-border text-brand-muted hover:border-white hover:text-white'}`}>
                <input 
                  type="radio" 
                  name="format" 
                  value={fmt} 
                  checked={format === fmt} 
                  onChange={() => setFormat(fmt)} 
                  className="hidden" 
                />
                <span className="uppercase font-bold tracking-widest">{fmt}</span>
              </label>
            ))}
          </div>
          {format !== 'jpg' && (
            <p className="text-xs text-brand-muted mt-2">
              Note: EXIF metadata is optimally supported in JPG format. Saving as {format.toUpperCase()} may result in metadata loss depending on the viewing software.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 mb-8">
            <label className="text-white uppercase text-xs tracking-widest font-bold">Bulk Rename (Optional)</label>
            <input 
              type="text" 
              placeholder="Base name (e.g. Vacation)" 
              value={baseName} 
              onChange={(e) => setBaseName(e.target.value)}
              className="bg-black text-white border border-brand-border p-3 text-sm focus:outline-none focus:border-brand-accent transition-colors"
            />
            <input 
              type="text" 
              placeholder="Suffix (e.g. -geotagged)" 
              value={suffix} 
              onChange={(e) => setSuffix(e.target.value)}
              className="bg-black text-white border border-brand-border p-3 text-sm focus:outline-none focus:border-brand-accent transition-colors"
            />
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 bg-transparent text-white border border-[#333] p-[12px] font-black uppercase text-[12px] tracking-[0.1em] cursor-pointer hover:bg-brand-bg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onExport(format, baseName, suffix);
              onClose();
            }}
            className="flex-1 bg-brand-accent text-black border border-brand-accent p-[12px] font-black uppercase text-[12px] tracking-[0.1em] cursor-pointer hover:bg-white transition-colors"
          >
            Export {count} Files
          </button>
        </div>
      </div>
    </div>
  );
};
