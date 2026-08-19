import { inject, Injectable } from '@angular/core';

import type { Memory } from '../models/memory.model';
import { MediaService } from './media.service';
import { MemoryService } from './memory.service';
import { StorageService } from './storage.service';

export type MemoryManagementPhase = 'media' | 'storage' | 'database' | 'cover';

export class MemoryManagementError extends Error {
  constructor(
    readonly phase: MemoryManagementPhase,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'MemoryManagementError';
  }
}

@Injectable({ providedIn: 'root' })
export class MemoryManagementService {
  private readonly memories = inject(MemoryService);
  private readonly media = inject(MediaService);
  private readonly storage = inject(StorageService);

  async deleteMemory(memoryId: string): Promise<void> {
    let associatedMedia;

    try {
      associatedMedia = await this.media.getByMemoryId(memoryId);
    } catch (error) {
      throw new MemoryManagementError(
        'media',
        'No pudimos comprobar las fotografías asociadas. El recuerdo no fue eliminado.',
        { cause: error },
      );
    }

    const storagePaths = associatedMedia.flatMap((item) =>
      [item.storagePath, item.thumbnailPath].filter((path): path is string => Boolean(path)),
    );

    if (storagePaths.length > 0) {
      try {
        await this.storage.removeFiles(storagePaths);
      } catch (error) {
        throw new MemoryManagementError(
          'storage',
          'No pudimos eliminar todas las fotografías. El recuerdo no fue eliminado.',
          { cause: error },
        );
      }
    }

    try {
      await this.memories.delete(memoryId);
    } catch (error) {
      throw new MemoryManagementError(
        'database',
        'Las fotografías se eliminaron, pero no pudimos eliminar el recuerdo. Puedes reintentar.',
        { cause: error },
      );
    }
  }

  async setCover(memoryId: string, mediaId: string): Promise<Memory> {
    let associatedMedia;

    try {
      associatedMedia = await this.media.getByMemoryId(memoryId);
    } catch (error) {
      throw new MemoryManagementError('media', 'No pudimos comprobar la fotografía.', {
        cause: error,
      });
    }

    const validPhoto = associatedMedia.some(
      (item) => item.id === mediaId && item.memoryId === memoryId && item.type === 'image',
    );

    if (!validPhoto) {
      throw new MemoryManagementError(
        'cover',
        'La portada debe ser una fotografía de este recuerdo.',
      );
    }

    try {
      return await this.memories.update(memoryId, { coverMediaId: mediaId });
    } catch (error) {
      throw new MemoryManagementError('database', 'No pudimos cambiar la portada.', {
        cause: error,
      });
    }
  }
}
