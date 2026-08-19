import { inject, Injectable } from '@angular/core';

import {
  JOURNEY_MEDIA_BUCKET,
  MEDIA_CACHE_CONTROL_SECONDS,
  SIGNED_URL_TTL_SECONDS,
} from '../constants/storage.constants';
import { ServiceError } from '../models/service-error.model';
import type { OptimizedImageExtension, ProcessedImageVariant } from './image-processing.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly supabase = inject(SupabaseService);
  private readonly signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

  async uploadMemoryImage(
    memoryId: string,
    imageId: string,
    image: ProcessedImageVariant,
  ): Promise<string> {
    const storagePath = this.memoryPath(memoryId, 'images', imageId, image.extension);
    await this.uploadImageBlob(storagePath, image.blob);
    return storagePath;
  }

  async uploadMemoryThumbnail(
    memoryId: string,
    imageId: string,
    thumbnail: ProcessedImageVariant,
  ): Promise<string> {
    const storagePath = this.memoryPath(memoryId, 'thumbs', imageId, thumbnail.extension);
    await this.uploadImageBlob(storagePath, thumbnail.blob);
    return storagePath;
  }

  async removeFiles(storagePaths: readonly string[]): Promise<void> {
    const uniquePaths = [...new Set(storagePaths.filter((path) => path.trim().length > 0))];

    if (uniquePaths.length === 0) {
      return;
    }

    const { error } = await this.supabase.client.storage
      .from(JOURNEY_MEDIA_BUCKET)
      .remove(uniquePaths);

    if (error) {
      throw new ServiceError('storage', 'No se pudieron eliminar los archivos.', {
        cause: error,
      });
    }
  }

  async deleteFile(storagePath: string): Promise<void> {
    await this.removeFiles([storagePath]);
  }

  async createSignedUrl(
    storagePath: string,
    expiresInSeconds = SIGNED_URL_TTL_SECONDS,
  ): Promise<string> {
    const { data, error } = await this.supabase.client.storage
      .from(JOURNEY_MEDIA_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new ServiceError('storage', 'No se pudo preparar el archivo privado.', {
        cause: error ?? undefined,
      });
    }

    return data.signedUrl;
  }

  async createSignedUrls(
    storagePaths: readonly string[],
    expiresInSeconds = SIGNED_URL_TTL_SECONDS,
  ): Promise<Record<string, string>> {
    const uniquePaths = [...new Set(storagePaths.filter((path) => path.trim().length > 0))];

    if (uniquePaths.length === 0) {
      return {};
    }

    const { data, error } = await this.supabase.client.storage
      .from(JOURNEY_MEDIA_BUCKET)
      .createSignedUrls(uniquePaths, expiresInSeconds);

    if (error) {
      throw new ServiceError('storage', 'No se pudieron preparar las fotografías privadas.', {
        cause: error,
      });
    }

    const signedUrls: Record<string, string> = {};

    for (const item of data ?? []) {
      if (item.path && item.signedUrl) {
        signedUrls[item.path] = item.signedUrl;
      }
    }

    if (Object.keys(signedUrls).length !== uniquePaths.length) {
      throw new ServiceError('storage', 'No se pudieron preparar todas las fotografías privadas.');
    }

    return signedUrls;
  }

  async createCachedSignedUrls(
    storagePaths: readonly string[],
    expiresInSeconds = SIGNED_URL_TTL_SECONDS,
  ): Promise<Record<string, string>> {
    const uniquePaths = [...new Set(storagePaths.filter((path) => path.trim().length > 0))];
    const now = Date.now();
    const safetyWindow = Math.min(60_000, expiresInSeconds * 100);
    const result: Record<string, string> = {};
    const missingPaths: string[] = [];

    for (const path of uniquePaths) {
      const cached = this.signedUrlCache.get(path);
      if (cached && cached.expiresAt - now > safetyWindow) {
        result[path] = cached.url;
      } else {
        this.signedUrlCache.delete(path);
        missingPaths.push(path);
      }
    }

    if (missingPaths.length > 0) {
      const signed = await this.createSignedUrls(missingPaths, expiresInSeconds);
      const expiresAt = now + expiresInSeconds * 1000;
      for (const [path, url] of Object.entries(signed)) {
        this.signedUrlCache.set(path, { url, expiresAt });
        result[path] = url;
      }
    }

    return result;
  }
  private async uploadImageBlob(storagePath: string, blob: Blob): Promise<void> {
    if (blob.type !== 'image/webp' && blob.type !== 'image/jpeg') {
      throw new ServiceError('storage', 'El formato optimizado de la imagen no es válido.');
    }

    const { error } = await this.supabase.client.storage
      .from(JOURNEY_MEDIA_BUCKET)
      .upload(storagePath, blob, {
        cacheControl: String(MEDIA_CACHE_CONTROL_SECONDS),
        upsert: false,
        contentType: blob.type,
      });

    if (error) {
      throw new ServiceError('storage', 'No se pudo subir la imagen.', { cause: error });
    }
  }

  private memoryPath(
    memoryId: string,
    directory: 'images' | 'thumbs',
    imageId: string,
    extension: OptimizedImageExtension,
  ): string {
    return `memories/${memoryId}/${directory}/${imageId}.${extension}`;
  }
}
