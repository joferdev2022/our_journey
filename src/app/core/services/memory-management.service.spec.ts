import { TestBed } from '@angular/core/testing';

import type { MemoryMedia } from '../models/media.model';
import type { Memory } from '../models/memory.model';
import { MediaService } from './media.service';
import { MemoryManagementError, MemoryManagementService } from './memory-management.service';
import { MemoryService } from './memory.service';
import { StorageService } from './storage.service';

describe('MemoryManagementService', () => {
  const getByMemoryId = vi.fn();
  const removeFiles = vi.fn();
  const deleteMemoryRow = vi.fn();
  const updateMemory = vi.fn();

  beforeEach(() => {
    getByMemoryId.mockReset();
    removeFiles.mockReset().mockResolvedValue(undefined);
    deleteMemoryRow.mockReset().mockResolvedValue(undefined);
    updateMemory.mockReset();

    TestBed.configureTestingModule({
      providers: [
        MemoryManagementService,
        { provide: MediaService, useValue: { getByMemoryId } },
        { provide: StorageService, useValue: { removeFiles } },
        {
          provide: MemoryService,
          useValue: { delete: deleteMemoryRow, update: updateMemory },
        },
      ],
    });
  });

  it('deletes a memory without photos without calling Storage', async () => {
    getByMemoryId.mockResolvedValue([]);

    await TestBed.inject(MemoryManagementService).deleteMemory('memory-1');

    expect(removeFiles).not.toHaveBeenCalled();
    expect(deleteMemoryRow).toHaveBeenCalledWith('memory-1');
  });

  it('removes every image and thumbnail before deleting a memory with photos', async () => {
    getByMemoryId.mockResolvedValue([
      photo('photo-1', 'image-1', 'thumb-1'),
      photo('photo-2', 'image-2', 'thumb-2'),
    ]);

    await TestBed.inject(MemoryManagementService).deleteMemory('memory-1');

    expect(removeFiles).toHaveBeenCalledWith(['image-1', 'thumb-1', 'image-2', 'thumb-2']);
    expect(removeFiles.mock.invocationCallOrder[0]).toBeLessThan(
      deleteMemoryRow.mock.invocationCallOrder[0],
    );
  });

  it('does not delete the memory when Storage cleanup fails', async () => {
    getByMemoryId.mockResolvedValue([photo('photo-1', 'image-1', 'thumb-1')]);
    removeFiles.mockRejectedValue(new Error('storage failed'));

    await expect(
      TestBed.inject(MemoryManagementService).deleteMemory('memory-1'),
    ).rejects.toMatchObject({ phase: 'storage' });
    expect(deleteMemoryRow).not.toHaveBeenCalled();
  });

  it('reports a database phase when DELETE fails after Storage succeeded', async () => {
    getByMemoryId.mockResolvedValue([photo('photo-1', 'image-1', 'thumb-1')]);
    deleteMemoryRow.mockRejectedValue(new Error('delete failed'));

    await expect(
      TestBed.inject(MemoryManagementService).deleteMemory('memory-1'),
    ).rejects.toMatchObject({ phase: 'database' });
    expect(removeFiles).toHaveBeenCalledOnce();
  });

  it('sets a cover only when the image belongs to the same memory', async () => {
    const updated = { id: 'memory-1', coverMediaId: 'photo-1' } as Memory;
    getByMemoryId.mockResolvedValue([photo('photo-1', 'image-1', 'thumb-1')]);
    updateMemory.mockResolvedValue(updated);

    const result = await TestBed.inject(MemoryManagementService).setCover('memory-1', 'photo-1');

    expect(updateMemory).toHaveBeenCalledWith('memory-1', { coverMediaId: 'photo-1' });
    expect(result).toBe(updated);
  });

  it('rejects a cover that is not associated with the memory', async () => {
    getByMemoryId.mockResolvedValue([photo('photo-1', 'image-1', 'thumb-1')]);

    await expect(
      TestBed.inject(MemoryManagementService).setCover('memory-1', 'photo-from-another-memory'),
    ).rejects.toMatchObject({ phase: 'cover' });
    expect(updateMemory).not.toHaveBeenCalled();
  });

  function photo(id: string, storagePath: string, thumbnailPath: string): MemoryMedia {
    return {
      id,
      memoryId: 'memory-1',
      type: 'image',
      storagePath,
      thumbnailPath,
      originalFilename: null,
      width: 100,
      height: 80,
      sizeBytes: 1000,
      sortOrder: 0,
      createdAt: '2026-08-19T12:00:00.000Z',
    };
  }
});
