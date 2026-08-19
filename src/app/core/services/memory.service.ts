import { inject, Injectable } from '@angular/core';

import type { CreateMemory, Memory, MemoryImportance, UpdateMemory } from '../models/memory.model';
import { ServiceError } from '../models/service-error.model';
import { SupabaseService } from './supabase.service';

interface MemoryRow {
  id: string;
  title: string;
  description: string | null;
  memory_date: string;
  place_name: string | null;
  latitude: number;
  longitude: number;
  category_id: string;
  trip_id: string | null;
  importance: number;
  cover_media_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class MemoryService {
  private readonly supabase = inject(SupabaseService);

  async getAll(): Promise<Memory[]> {
    const { data, error } = await this.supabase.client
      .from('memories')
      .select('*')
      .order('memory_date', { ascending: false });

    if (error) {
      throw this.dataError('No se pudieron cargar los recuerdos.', error);
    }

    return (data as MemoryRow[]).map((row) => this.fromRow(row));
  }

  async getByTripId(tripId: string): Promise<Memory[]> {
    const query = this.supabase.client
      .from('memories')
      .select('*')
      .eq('trip_id', tripId)
      .order('memory_date', { ascending: true });
    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      throw this.dataError('No se pudieron cargar los recuerdos del viaje.', error);
    }

    return (data as MemoryRow[]).map((row) => this.fromRow(row));
  }
  async getById(id: string): Promise<Memory | null> {
    const { data, error } = await this.supabase.client
      .from('memories')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw this.dataError('No se pudo cargar el recuerdo.', error);
    }

    return data ? this.fromRow(data as MemoryRow) : null;
  }

  async create(memory: CreateMemory): Promise<Memory> {
    const { data, error } = await this.supabase.client
      .from('memories')
      .insert(this.toInsert(memory))
      .select()
      .single();

    if (error) {
      throw this.dataError('No se pudo guardar el recuerdo.', error);
    }

    return this.fromRow(data as MemoryRow);
  }

  async update(id: string, changes: UpdateMemory): Promise<Memory> {
    const { data, error } = await this.supabase.client
      .from('memories')
      .update(this.toUpdate(changes))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw this.dataError('No se pudo actualizar el recuerdo.', error);
    }

    return this.fromRow(data as MemoryRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('memories').delete().eq('id', id);

    if (error) {
      throw this.dataError('No se pudo eliminar el recuerdo.', error);
    }
  }

  private fromRow(row: MemoryRow): Memory {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      memoryDate: row.memory_date,
      placeName: row.place_name,
      latitude: row.latitude,
      longitude: row.longitude,
      categoryId: row.category_id,
      tripId: row.trip_id,
      importance: row.importance as MemoryImportance,
      coverMediaId: row.cover_media_id ?? null,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toInsert(
    memory: CreateMemory,
  ): Omit<MemoryRow, 'id' | 'cover_media_id' | 'created_by' | 'created_at' | 'updated_at'> {
    return {
      title: memory.title,
      description: memory.description,
      memory_date: memory.memoryDate,
      place_name: memory.placeName,
      latitude: memory.latitude,
      longitude: memory.longitude,
      category_id: memory.categoryId,
      trip_id: memory.tripId ?? null,
      importance: memory.importance,
    };
  }

  private toUpdate(changes: UpdateMemory): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    if (changes.title !== undefined) row['title'] = changes.title;
    if (changes.description !== undefined) row['description'] = changes.description;
    if (changes.memoryDate !== undefined) row['memory_date'] = changes.memoryDate;
    if (changes.placeName !== undefined) row['place_name'] = changes.placeName;
    if (changes.latitude !== undefined) row['latitude'] = changes.latitude;
    if (changes.longitude !== undefined) row['longitude'] = changes.longitude;
    if (changes.categoryId !== undefined) row['category_id'] = changes.categoryId;
    if (changes.tripId !== undefined) row['trip_id'] = changes.tripId;
    if (changes.importance !== undefined) row['importance'] = changes.importance;
    if (changes.coverMediaId !== undefined) row['cover_media_id'] = changes.coverMediaId;

    return row;
  }

  private dataError(message: string, cause: unknown): ServiceError {
    return new ServiceError('data-access', message, { cause });
  }
}
