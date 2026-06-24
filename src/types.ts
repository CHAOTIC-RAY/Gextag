export interface Photo {
  id: string;
  file: File;
  dataUrl: string;
  name: string;
  type: string;
  size: number;
  lat: number | null;
  lng: number | null;
  keywords: string[];
  description: string;
  artist?: string;
  copyright?: string;
  datetime?: string;
}
