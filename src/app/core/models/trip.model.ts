export interface Trip {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  coverPath: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripEditableFields {
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
}

export type CreateTrip = TripEditableFields & { coverPath: string | null };
export type UpdateTrip = Partial<TripEditableFields & Pick<Trip, 'coverPath'>>;
