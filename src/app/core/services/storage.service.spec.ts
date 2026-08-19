import { TestBed } from '@angular/core/testing';

import { JOURNEY_MEDIA_BUCKET } from '../constants/storage.constants';
import type { ProcessedImageVariant } from './image-processing.service';
import { StorageService } from './storage.service';
import { SupabaseService } from './supabase.service';

describe('StorageService', () => {
  const from = vi.fn();
  const upload = vi.fn();
  const remove = vi.fn();
  const createSignedUrl = vi.fn();
  const createSignedUrls = vi.fn();

  beforeEach(() => {
    from.mockReset();
    upload.mockReset();
    remove.mockReset();
    createSignedUrl.mockReset();
    createSignedUrls.mockReset();
    from.mockReturnValue({ upload, remove, createSignedUrl, createSignedUrls });

    TestBed.configureTestingModule({
      providers: [
        StorageService,
        {
          provide: SupabaseService,
          useValue: { client: { storage: { from } } },
        },
      ],
    });
  });

  it('uploads an optimized image to a UUID path without upsert', async () => {
    upload.mockResolvedValue({ error: null });
    const image = variant('image/webp', 'webp');

    const path = await TestBed.inject(StorageService).uploadMemoryImage(
      'memory-1',
      'image-1',
      image,
    );

    expect(from).toHaveBeenCalledWith(JOURNEY_MEDIA_BUCKET);
    expect(path).toBe('memories/memory-1/images/image-1.webp');
    expect(upload).toHaveBeenCalledWith(path, image.blob, {
      cacheControl: '31536000',
      upsert: false,
      contentType: 'image/webp',
    });
  });

  it('creates signed URLs in one batch and returns them keyed by path', async () => {
    createSignedUrls.mockResolvedValue({
      data: [
        { path: 'one.webp', signedUrl: 'signed-one' },
        { path: 'two.webp', signedUrl: 'signed-two' },
      ],
      error: null,
    });

    const result = await TestBed.inject(StorageService).createSignedUrls([
      'one.webp',
      'two.webp',
      'one.webp',
    ]);

    expect(createSignedUrls).toHaveBeenCalledWith(['one.webp', 'two.webp'], 900);
    expect(result).toEqual({ 'one.webp': 'signed-one', 'two.webp': 'signed-two' });
  });

  it('removes both image variants in one private Storage call', async () => {
    remove.mockResolvedValue({ error: null });

    await TestBed.inject(StorageService).removeFiles(['image.webp', 'thumb.webp']);

    expect(remove).toHaveBeenCalledWith(['image.webp', 'thumb.webp']);
  });

  function variant(
    mimeType: 'image/webp' | 'image/jpeg',
    extension: 'webp' | 'jpg',
  ): ProcessedImageVariant {
    return {
      blob: new Blob(['image'], { type: mimeType }),
      mimeType,
      extension,
      width: 100,
      height: 80,
    };
  }
  it('reuses a still-valid Signed URL from its in-memory cache', async () => {
    createSignedUrls.mockResolvedValue({
      data: [{ path: 'cover.webp', signedUrl: 'signed-cover' }],
      error: null,
    });
    const service = TestBed.inject(StorageService);

    const first = await service.createCachedSignedUrls(['cover.webp']);
    const second = await service.createCachedSignedUrls(['cover.webp']);

    expect(first).toEqual({ 'cover.webp': 'signed-cover' });
    expect(second).toEqual(first);
    expect(createSignedUrls).toHaveBeenCalledOnce();
  });
});
