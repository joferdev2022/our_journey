import { inject, Injectable } from '@angular/core';

import { CreateMemoryMedia, MediaType, MemoryCoverMedia, MemoryMedia } from '../models/media.model';
import { ServiceError } from '../models/service-error.model';
import { SupabaseService } from './supabase.service';

interface MediaRow {
  id: string;
  memory_id: string;
  type: string;
  storage_path: string;
  thumbnail_path: string | null;
  original_filename: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  sort_order: number;
  created_at: string;
}

interface CoverMediaRow {
  id: string;
  memory_id: string;
  type: 'image';
  storage_path: string;
  thumbnail_path: string | null;
  sort_order: number;
}

@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly supabase = inject(SupabaseService);

  async getByMemoryId(memoryId: string): Promise<MemoryMedia[]> {
    const query = this.supabase.client
      .from('media')
      .select('*')
      .eq('memory_id', memoryId)
      .order('sort_order', { ascending: true });
    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      throw this.dataError('No se pudieron cargar las fotografías.', error);
    }

    return (data as MediaRow[]).map((row) => this.fromRow(row));
  }

  async getImageMetadataByMemoryIds(memoryIds: readonly string[]): Promise<MemoryCoverMedia[]> {
    const uniqueIds = [...new Set(memoryIds.filter(Boolean))];
    if (uniqueIds.length === 0) return [];

    const query = this.supabase.client
      .from('media')
      .select('id,memory_id,type,storage_path,thumbnail_path,sort_order')
      .in('memory_id', uniqueIds)
      .eq('type', 'image')
      .order('sort_order', { ascending: true });
    const { data, error } = await query.order('id', { ascending: true });

    if (error) {
      throw this.dataError('No se pudieron cargar las portadas de los recuerdos.', error);
    }

    return (data as CoverMediaRow[]).map((row) => ({
      id: row.id,
      memoryId: row.memory_id,
      type: row.type,
      storagePath: row.storage_path,
      thumbnailPath: row.thumbnail_path,
      sortOrder: row.sort_order,
    }));
  }

  async create(media: CreateMemoryMedia): Promise<MemoryMedia> {
    const { data, error } = await this.supabase.client
      .from('media')
      .insert(this.toInsert(media))
      .select()
      .single();

    if (error) {
      throw this.dataError('No se pudo registrar la fotografía.', error);
    }

    return this.fromRow(data as MediaRow);
  }

  async createMany(media: readonly CreateMemoryMedia[]): Promise<MemoryMedia[]> {
    if (media.length === 0) return [];

    const { data, error } = await this.supabase.client
      .from('media')
      .insert(media.map((item) => this.toInsert(item)))
      .select();

    if (error) {
      throw this.dataError('No se pudieron registrar las fotografías.', error);
    }

    return (data as MediaRow[]).map((row) => this.fromRow(row));
  }

  async updateSortOrders(memoryId: string, orderedMediaIds: readonly string[]): Promise<void> {
    const { error } = await this.supabase.client.rpc('reorder_memory_media', {
      p_memory_id: memoryId,
      p_ordered_media_ids: [...orderedMediaIds],
    });

    if (error) {
      throw this.dataError('No se pudo actualizar el orden de las fotografías.', error);
    }
  }

  async updateSortOrder(id: string, sortOrder: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('media')
      .update({ sort_order: sortOrder })
      .eq('id', id);

    if (error) {
      throw this.dataError('No se pudo actualizar el orden de la fotografía.', error);
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('media').delete().eq('id', id);

    if (error) {
      throw this.dataError('No se pudo eliminar la fotografía.', error);
    }
  }

  private fromRow(row: MediaRow): MemoryMedia {
    return {
      id: row.id,
      memoryId: row.memory_id,
      type: row.type as MediaType,
      storagePath: row.storage_path,
      thumbnailPath: row.thumbnail_path,
      originalFilename: row.original_filename,
      width: row.width,
      height: row.height,
      sizeBytes: row.size_bytes,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
    };
  }

  private toInsert(media: CreateMemoryMedia): Omit<MediaRow, 'id' | 'created_at'> {
    return {
      memory_id: media.memoryId,
      type: media.type,
      storage_path: media.storagePath,
      thumbnail_path: media.thumbnailPath,
      original_filename: media.originalFilename,
      width: media.width,
      height: media.height,
      size_bytes: media.sizeBytes,
      sort_order: media.sortOrder,
    };
  }

  private dataError(message: string, cause: unknown): ServiceError {
    return new ServiceError('data-access', message, { cause });
  }
}
