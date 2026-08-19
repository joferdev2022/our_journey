import { inject, Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { MemoryMedia } from '../models/media.model';
import { ProcessedMemoryImage } from './image-processing.service';
import { MediaService } from './media.service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class MemoryPhotoService {
  private readonly storage = inject(StorageService);
  private readonly media = inject(MediaService);

  async upload(
    memoryId: string,
    processed: ProcessedMemoryImage,
    sortOrder: number,
  ): Promise<MemoryMedia> {
    const imageId = globalThis.crypto.randomUUID();
    let storagePath: string | null = null;
    let thumbnailPath: string | null = null;

    try {
      storagePath = await this.storage.uploadMemoryImage(memoryId, imageId, processed.image);
      thumbnailPath = await this.storage.uploadMemoryThumbnail(
        memoryId,
        imageId,
        processed.thumbnail,
      );

      return await this.media.create({
        memoryId,
        type: 'image',
        storagePath,
        thumbnailPath,
        originalFilename: processed.originalFilename,
        width: processed.image.width,
        height: processed.image.height,
        sizeBytes: processed.image.blob.size,
        sortOrder,
      });
    } catch (error) {
      await this.cleanup(storagePath, thumbnailPath);
      throw error;
    }
  }

  async delete(photo: MemoryMedia): Promise<void> {
    await this.storage.removeFiles(
      [photo.storagePath, photo.thumbnailPath].filter((path): path is string => Boolean(path)),
    );
    await this.media.delete(photo.id);
  }

  private async cleanup(...paths: Array<string | null>): Promise<void> {
    const uploadedPaths = paths.filter((path): path is string => Boolean(path));

    if (uploadedPaths.length === 0) {
      return;
    }

    try {
      await this.storage.removeFiles(uploadedPaths);
    } catch (cleanupError) {
      if (!environment.production) {
        console.error('Our Journey: falló la compensación de archivos de una fotografía.', {
          uploadedPaths,
          cleanupError,
        });
      }
    }
  }
}
