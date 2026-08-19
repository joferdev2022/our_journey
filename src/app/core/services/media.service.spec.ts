import { TestBed } from '@angular/core/testing';

import type { CreateMemoryMedia } from '../models/media.model';
import { MediaService } from './media.service';
import { SupabaseService } from './supabase.service';

describe('MediaService', () => {
  const from = vi.fn();

  beforeEach(() => {
    from.mockReset();
    TestBed.configureTestingModule({
      providers: [MediaService, { provide: SupabaseService, useValue: { client: { from } } }],
    });
  });

  it('loads by memory, orders rows and maps snake_case to camelCase', async () => {
    const row = mediaRow();
    const createdOrder = vi.fn().mockResolvedValue({ data: [row], error: null });
    const sortOrder = vi.fn().mockReturnValue({ order: createdOrder });
    const eq = vi.fn().mockReturnValue({ order: sortOrder });
    const select = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ select });

    const result = await TestBed.inject(MediaService).getByMemoryId('memory-1');

    expect(from).toHaveBeenCalledWith('media');
    expect(eq).toHaveBeenCalledWith('memory_id', 'memory-1');
    expect(sortOrder).toHaveBeenCalledWith('sort_order', { ascending: true });
    expect(createdOrder).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(result[0]).toEqual({
      id: 'photo-1',
      memoryId: 'memory-1',
      type: 'image',
      storagePath: 'memories/memory-1/images/photo-1.webp',
      thumbnailPath: 'memories/memory-1/thumbs/photo-1.webp',
      originalFilename: 'IMG_1.jpg',
      width: 1920,
      height: 1280,
      sizeBytes: 456789,
      sortOrder: 3,
      createdAt: '2026-08-19T12:00:00.000Z',
    });
  });

  it('maps a camelCase creation payload to PostgreSQL columns', async () => {
    const row = mediaRow();
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    from.mockReturnValue({ insert });
    const payload = createMedia();

    const result = await TestBed.inject(MediaService).create(payload);

    expect(insert).toHaveBeenCalledWith({
      memory_id: payload.memoryId,
      type: 'image',
      storage_path: payload.storagePath,
      thumbnail_path: payload.thumbnailPath,
      original_filename: payload.originalFilename,
      width: payload.width,
      height: payload.height,
      size_bytes: payload.sizeBytes,
      sort_order: payload.sortOrder,
    });
    expect(result.id).toBe('photo-1');
  });

  it('deletes only the requested media row', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const deleteRow = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ delete: deleteRow });

    await TestBed.inject(MediaService).delete('photo-1');

    expect(deleteRow).toHaveBeenCalledOnce();
    expect(eq).toHaveBeenCalledWith('id', 'photo-1');
  });

  function mediaRow() {
    return {
      id: 'photo-1',
      memory_id: 'memory-1',
      type: 'image',
      storage_path: 'memories/memory-1/images/photo-1.webp',
      thumbnail_path: 'memories/memory-1/thumbs/photo-1.webp',
      original_filename: 'IMG_1.jpg',
      width: 1920,
      height: 1280,
      size_bytes: 456789,
      sort_order: 3,
      created_at: '2026-08-19T12:00:00.000Z',
    };
  }

  function createMedia(): CreateMemoryMedia {
    return {
      memoryId: 'memory-1',
      type: 'image',
      storagePath: 'memories/memory-1/images/photo-1.webp',
      thumbnailPath: 'memories/memory-1/thumbs/photo-1.webp',
      originalFilename: 'IMG_1.jpg',
      width: 1920,
      height: 1280,
      sizeBytes: 456789,
      sortOrder: 3,
    };
  }
  it('loads cover metadata for many memories in one batch query', async () => {
    const idOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'photo-1',
          memory_id: 'memory-1',
          type: 'image',
          storage_path: 'memories/memory-1/images/photo-1.webp',
          thumbnail_path: 'memories/memory-1/thumbs/photo-1.webp',
          sort_order: 0,
        },
      ],
      error: null,
    });
    const sortOrder = vi.fn().mockReturnValue({ order: idOrder });
    const eq = vi.fn().mockReturnValue({ order: sortOrder });
    const inFilter = vi.fn().mockReturnValue({ eq });
    const select = vi.fn().mockReturnValue({ in: inFilter });
    from.mockReturnValue({ select });

    const result = await TestBed.inject(MediaService).getImageMetadataByMemoryIds([
      'memory-1',
      'memory-2',
      'memory-1',
    ]);

    expect(select).toHaveBeenCalledWith('id,memory_id,type,storage_path,thumbnail_path,sort_order');
    expect(inFilter).toHaveBeenCalledWith('memory_id', ['memory-1', 'memory-2']);
    expect(eq).toHaveBeenCalledWith('type', 'image');
    expect(result[0]).toEqual({
      id: 'photo-1',
      memoryId: 'memory-1',
      type: 'image',
      storagePath: 'memories/memory-1/images/photo-1.webp',
      thumbnailPath: 'memories/memory-1/thumbs/photo-1.webp',
      sortOrder: 0,
    });
  });
});
