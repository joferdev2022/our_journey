import { MAX_ORIGINAL_IMAGE_BYTES } from '../constants/image.constants';
import {
  buildMemoryImagePaths,
  calculateConstrainedDimensions,
  getImageValidationError,
} from './image-processing.service';

describe('ImageProcessingService utilities', () => {
  it('keeps the aspect ratio when constraining a landscape image', () => {
    expect(calculateConstrainedDimensions(4000, 3000, 1920)).toEqual({
      width: 1920,
      height: 1440,
    });
  });

  it('does not enlarge a small image', () => {
    expect(calculateConstrainedDimensions(640, 480, 1920)).toEqual({
      width: 640,
      height: 480,
    });
  });

  it('calculates a 480px thumbnail while preserving proportions', () => {
    expect(calculateConstrainedDimensions(3000, 4000, 480)).toEqual({
      width: 360,
      height: 480,
    });
  });

  it('rejects originals larger than the configured limit', () => {
    expect(
      getImageValidationError({ type: 'image/jpeg', size: MAX_ORIGINAL_IMAGE_BYTES + 1 }),
    ).toBe('Esta fotografía es demasiado grande para procesarla.');
  });

  it('accepts only the image MIME types enabled for this stage', () => {
    expect(getImageValidationError({ type: 'image/webp', size: 100 })).toBeNull();
    expect(getImageValidationError({ type: 'image/gif', size: 100 })).toBe(
      'Usa una fotografía JPG, PNG o WebP.',
    );
  });

  it('builds UUID-based image and thumbnail paths with their real extensions', () => {
    expect(buildMemoryImagePaths('memory-id', 'image-id', 'webp', 'jpg')).toEqual({
      storagePath: 'memories/memory-id/images/image-id.webp',
      thumbnailPath: 'memories/memory-id/thumbs/image-id.jpg',
    });
  });
});
