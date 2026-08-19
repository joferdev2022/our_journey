export type MediaType = 'image' | 'audio' | 'video';

export interface MemoryMedia {
  id: string;
  memoryId: string;
  type: MediaType;
  storagePath: string;
  thumbnailPath: string | null;
  originalFilename: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  sortOrder: number;
  createdAt: string;
}

export interface MemoryCoverMedia {
  id: string;
  memoryId: string;
  type: 'image';
  storagePath: string;
  thumbnailPath: string | null;
  sortOrder: number;
}

export type Media = MemoryMedia;
export type CreateMemoryMedia = Omit<MemoryMedia, 'id' | 'createdAt'>;
