import { Injectable } from '@angular/core';

import {
  IMAGE_MAX_DIMENSION,
  IMAGE_WEBP_QUALITY,
  MAX_ORIGINAL_IMAGE_BYTES,
  SUPPORTED_IMAGE_MIME_TYPES,
  THUMBNAIL_MAX_DIMENSION,
  THUMBNAIL_WEBP_QUALITY,
} from '../constants/image.constants';

export type OptimizedImageMimeType = 'image/webp' | 'image/jpeg';
export type OptimizedImageExtension = 'webp' | 'jpg';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ProcessedImageVariant extends ImageDimensions {
  blob: Blob;
  mimeType: OptimizedImageMimeType;
  extension: OptimizedImageExtension;
}

export interface ProcessedMemoryImage {
  image: ProcessedImageVariant;
  thumbnail: ProcessedImageVariant;
  originalFilename: string;
}

export interface MemoryImagePaths {
  storagePath: string;
  thumbnailPath: string;
}

export class ImageProcessingError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ImageProcessingError';
  }
}

export function calculateConstrainedDimensions(
  width: number,
  height: number,
  maxDimension: number,
): ImageDimensions {
  if (width <= 0 || height <= 0 || maxDimension <= 0) {
    throw new Error('Las dimensiones deben ser positivas.');
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function getImageValidationError(file: Pick<File, 'type' | 'size'>): string | null {
  if (
    !SUPPORTED_IMAGE_MIME_TYPES.includes(file.type as (typeof SUPPORTED_IMAGE_MIME_TYPES)[number])
  ) {
    return 'Usa una fotografía JPG, PNG o WebP.';
  }

  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
    return 'Esta fotografía es demasiado grande para procesarla.';
  }

  return null;
}

export function buildMemoryImagePaths(
  memoryId: string,
  imageId: string,
  imageExtension: OptimizedImageExtension,
  thumbnailExtension: OptimizedImageExtension,
): MemoryImagePaths {
  return {
    storagePath: `memories/${memoryId}/images/${imageId}.${imageExtension}`,
    thumbnailPath: `memories/${memoryId}/thumbs/${imageId}.${thumbnailExtension}`,
  };
}

@Injectable({ providedIn: 'root' })
export class ImageProcessingService {
  validateImage(file: File): void {
    const validationError = getImageValidationError(file);

    if (validationError) {
      throw new ImageProcessingError(validationError);
    }
  }

  createPreview(file: File): string {
    this.validateImage(file);
    return URL.createObjectURL(file);
  }

  async processImage(file: File): Promise<ProcessedMemoryImage> {
    this.validateImage(file);

    let decoded: DecodedImage | null = null;

    try {
      decoded = await this.decodeImage(file);
      const imageDimensions = calculateConstrainedDimensions(
        decoded.width,
        decoded.height,
        IMAGE_MAX_DIMENSION,
      );
      const thumbnailDimensions = calculateConstrainedDimensions(
        decoded.width,
        decoded.height,
        THUMBNAIL_MAX_DIMENSION,
      );

      const image = await this.encodeVariant(decoded.source, imageDimensions, IMAGE_WEBP_QUALITY);
      const thumbnail = await this.encodeVariant(
        decoded.source,
        thumbnailDimensions,
        THUMBNAIL_WEBP_QUALITY,
      );

      return { image, thumbnail, originalFilename: file.name };
    } catch (error) {
      if (error instanceof ImageProcessingError) {
        throw error;
      }

      throw new ImageProcessingError(
        'No pudimos procesar esta imagen. Prueba convirtiéndola a JPG, PNG o WebP.',
        { cause: error },
      );
    } finally {
      decoded?.release();
    }
  }

  private async decodeImage(file: File): Promise<DecodedImage> {
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          release: () => bitmap.close(),
        };
      } catch {
        // Algunos navegadores decodifican más formatos mediante HTMLImageElement.
      }
    }

    const objectUrl = URL.createObjectURL(file);

    try {
      const image = new Image();
      image.decoding = 'async';
      image.src = objectUrl;
      await image.decode();

      return {
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        release: () => URL.revokeObjectURL(objectUrl),
      };
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }

  private async encodeVariant(
    source: CanvasImageSource,
    dimensions: ImageDimensions,
    quality: number,
  ): Promise<ProcessedImageVariant> {
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    try {
      const context = canvas.getContext('2d');

      if (!context) {
        throw new ImageProcessingError('No pudimos preparar el editor de imágenes.');
      }

      context.drawImage(source, 0, 0, dimensions.width, dimensions.height);
      const webpBlob = await this.canvasToBlob(canvas, 'image/webp', quality);

      if (webpBlob?.type === 'image/webp') {
        return {
          blob: webpBlob,
          mimeType: 'image/webp',
          extension: 'webp',
          ...dimensions,
        };
      }

      context.save();
      context.globalCompositeOperation = 'destination-over';
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, dimensions.width, dimensions.height);
      context.restore();

      const jpegBlob = await this.canvasToBlob(canvas, 'image/jpeg', quality);

      if (!jpegBlob || jpegBlob.type !== 'image/jpeg') {
        throw new ImageProcessingError('El navegador no pudo exportar la fotografía.');
      }

      return {
        blob: jpegBlob,
        mimeType: 'image/jpeg',
        extension: 'jpg',
        ...dimensions,
      };
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  private canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: OptimizedImageMimeType,
    quality: number,
  ): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));
  }
}

interface DecodedImage extends ImageDimensions {
  source: CanvasImageSource;
  release: () => void;
}
