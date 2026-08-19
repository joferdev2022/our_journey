import { TestBed } from '@angular/core/testing';

import type { MemoryMedia } from '../models/media.model';
import type { ProcessedMemoryImage } from './image-processing.service';
import { MediaService } from './media.service';
import { MemoryPhotoService } from './memory-photo.service';
import { StorageService } from './storage.service';

describe('MemoryPhotoService compensation', () => {
  const uploadMemoryImage = vi.fn();
  const uploadMemoryThumbnail = vi.fn();
  const removeFiles = vi.fn();
  const create = vi.fn();

  beforeEach(() => {
    uploadMemoryImage.mockReset();
    uploadMemoryThumbnail.mockReset();
    removeFiles.mockReset().mockResolvedValue(undefined);
    create.mockReset();

    TestBed.configureTestingModule({
      providers: [
        MemoryPhotoService,
        {
          provide: StorageService,
          useValue: { uploadMemoryImage, uploadMemoryThumbnail, removeFiles },
        },
        { provide: MediaService, useValue: { create } },
      ],
    });
  });

  it('removes the main image if the thumbnail upload fails', async () => {
    uploadMemoryImage.mockResolvedValue('image-path');
    uploadMemoryThumbnail.mockRejectedValue(new Error('thumbnail failed'));

    await expect(
      TestBed.inject(MemoryPhotoService).upload('memory-1', processedPhoto(), 0),
    ).rejects.toThrow('thumbnail failed');
    expect(removeFiles).toHaveBeenCalledWith(['image-path']);
    expect(create).not.toHaveBeenCalled();
  });

  it('removes both uploaded variants if the media insert fails', async () => {
    uploadMemoryImage.mockResolvedValue('image-path');
    uploadMemoryThumbnail.mockResolvedValue('thumb-path');
    create.mockRejectedValue(new Error('insert failed'));

    await expect(
      TestBed.inject(MemoryPhotoService).upload('memory-1', processedPhoto(), 0),
    ).rejects.toThrow('insert failed');
    expect(removeFiles).toHaveBeenCalledWith(['image-path', 'thumb-path']);
  });

  it('keeps a successful photo independent from later batches', async () => {
    const saved = { id: 'photo-1' } as MemoryMedia;
    uploadMemoryImage.mockResolvedValue('image-path');
    uploadMemoryThumbnail.mockResolvedValue('thumb-path');
    create.mockResolvedValue(saved);

    const result = await TestBed.inject(MemoryPhotoService).upload('memory-1', processedPhoto(), 4);

    expect(result).toBe(saved);
    expect(removeFiles).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 4 }));
  });

  function processedPhoto(): ProcessedMemoryImage {
    return {
      originalFilename: 'IMG_1.jpg',
      image: {
        blob: new Blob(['image'], { type: 'image/webp' }),
        mimeType: 'image/webp',
        extension: 'webp',
        width: 1920,
        height: 1280,
      },
      thumbnail: {
        blob: new Blob(['thumb'], { type: 'image/webp' }),
        mimeType: 'image/webp',
        extension: 'webp',
        width: 480,
        height: 320,
      },
    };
  }
});
