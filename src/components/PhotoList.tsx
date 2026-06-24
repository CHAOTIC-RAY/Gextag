import React from 'react';
import { Photo } from '../types';

interface PhotoListProps {
  photos: Photo[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export const PhotoList: React.FC<PhotoListProps> = ({ photos, onDelete, onEdit }) => {
  if (photos.length === 0) return null;

  return (
    <div className="w-full flex flex-col">
      {photos.map((photo) => (
        <div key={photo.id} className="p-[12px_20px] border-b border-brand-border text-[13px] flex flex-col gap-3 hover:bg-brand-surface transition-colors group">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-black flex items-center justify-center border border-brand-border overflow-hidden shrink-0">
                  <img src={photo.dataUrl} alt={photo.name} className="w-full h-full object-cover" />
               </div>
               <div className="flex flex-col">
                 <span className="font-bold uppercase tracking-widest text-xs truncate max-w-[150px] sm:max-w-[200px]" title={photo.name}>{photo.name}</span>
                 <div className="flex gap-2 items-center mt-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                   <span className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">
                     {photo.lat !== null ? `${photo.lat.toFixed(4)}, ${photo.lng?.toFixed(4)}` : 'UNTAGGED'}
                   </span>
                 </div>
               </div>
            </div>
            
            <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={() => onEdit(photo.id)} className="text-[10px] uppercase tracking-widest font-bold text-brand-muted hover:text-white transition-colors">
                 Edit
               </button>
               <button onClick={() => onDelete(photo.id)} className="text-[10px] uppercase tracking-widest font-bold text-brand-muted hover:text-brand-pin transition-colors">
                 Remove
               </button>
            </div>
          </div>

          {(photo.keywords.length > 0 || photo.description) && (
            <div className="bg-black p-3 border border-brand-border flex flex-col gap-2">
               {photo.keywords.length > 0 && (
                 <div className="flex flex-col gap-1">
                   <span className="text-[9px] text-brand-muted uppercase tracking-[0.1em]">Keywords</span>
                   <span className="font-mono text-xs">{photo.keywords.join(', ')}</span>
                 </div>
               )}
               {photo.description && (
                 <div className="flex flex-col gap-1">
                   <span className="text-[9px] text-brand-muted uppercase tracking-[0.1em]">Description</span>
                   <span className="font-mono text-xs text-brand-muted truncate">{photo.description}</span>
                 </div>
               )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

