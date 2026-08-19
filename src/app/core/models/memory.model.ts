export type MemoryImportance = 1 | 2 | 3 | 4 | 5;

export interface Memory {
  id: string;
  title: string;
  description: string | null;
  memoryDate: string;
  placeName: string | null;
  latitude: number;
  longitude: number;
  categoryId: string;
  tripId?: string | null;
  importance: MemoryImportance;
  coverMediaId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateMemory = Omit<
  Memory,
  'id' | 'coverMediaId' | 'createdBy' | 'createdAt' | 'updatedAt'
>;

export type UpdateMemory = Partial<Omit<Memory, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>;
