import { inject, Injectable } from '@angular/core';

import { CreateTrip, Trip, UpdateTrip } from '../models/trip.model';
import { ServiceError } from '../models/service-error.model';
import { SupabaseService } from './supabase.service';

interface TripRow {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  cover_path: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly supabase = inject(SupabaseService);

  async getAll(): Promise<Trip[]> {
    const { data, error } = await this.supabase.client
      .from('trips')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      throw this.dataError('No se pudieron cargar los viajes.', error);
    }

    return (data as TripRow[]).map((row) => this.fromRow(row));
  }

  async getById(id: string): Promise<Trip | null> {
    const { data, error } = await this.supabase.client
      .from('trips')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw this.dataError('No se pudo cargar el viaje.', error);
    }

    return data ? this.fromRow(data as TripRow) : null;
  }

  async create(trip: CreateTrip): Promise<Trip> {
    const { data, error } = await this.supabase.client
      .from('trips')
      .insert(this.toInsert(trip))
      .select()
      .single();

    if (error) {
      throw this.dataError('No se pudo guardar el viaje.', error);
    }

    return this.fromRow(data as TripRow);
  }

  async update(id: string, changes: UpdateTrip): Promise<Trip> {
    const { data, error } = await this.supabase.client
      .from('trips')
      .update(this.toUpdate(changes))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw this.dataError('No se pudo actualizar el viaje.', error);
    }

    return this.fromRow(data as TripRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('trips').delete().eq('id', id);

    if (error) {
      throw this.dataError('No se pudo eliminar el viaje.', error);
    }
  }

  private fromRow(row: TripRow): Trip {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      coverPath: row.cover_path,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toInsert(
    trip: CreateTrip,
  ): Omit<TripRow, 'id' | 'created_by' | 'created_at' | 'updated_at'> {
    return {
      title: trip.title,
      description: trip.description,
      start_date: trip.startDate,
      end_date: trip.endDate,
      cover_path: trip.coverPath,
    };
  }

  private toUpdate(changes: UpdateTrip): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    if (changes.title !== undefined) row['title'] = changes.title;
    if (changes.description !== undefined) row['description'] = changes.description;
    if (changes.startDate !== undefined) row['start_date'] = changes.startDate;
    if (changes.endDate !== undefined) row['end_date'] = changes.endDate;
    if (changes.coverPath !== undefined) row['cover_path'] = changes.coverPath;

    return row;
  }

  private dataError(message: string, cause: unknown): ServiceError {
    return new ServiceError('data-access', message, { cause });
  }
}
