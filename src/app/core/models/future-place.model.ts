export type FuturePlaceStatus = 'idea' | 'planned' | 'visited';

export interface FuturePlace {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  targetDate: string | null;
  status: FuturePlaceStatus;
  createdBy: string;
  createdAt: string;
}
