import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface DropzoneAreaProps {
  onFilesAccepted: (files: File[]) => void;
}

export const DropzoneArea: React.FC<DropzoneAreaProps> = ({ onFilesAccepted }) => {
  const onDrop = useCallback((acceptedFiles: any[]) => {
    onFilesAccepted(acceptedFiles);
  }, [onFilesAccepted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.avif', '.heic']
    }
  } as any);

  return (
    <div
      {...getRootProps()}
      className={`w-full border border-dashed p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-brand-accent bg-[#00ff4111]' : 'border-brand-muted hover:border-white hover:bg-brand-surface'}`}
    >
      <input {...getInputProps()} />
      <div className="text-[40px] leading-none font-black text-brand-muted mb-4 tracking-tighter">
        +
      </div>
      <p className="text-sm font-bold uppercase tracking-widest text-white mb-2">
        {isDragActive ? "DROP IMAGES NOW" : "DROP IMAGES OR CLICK"}
      </p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">
        JPG, PNG, WEBP, AVIF, HEIC
      </p>
    </div>
  );
};

