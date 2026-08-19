import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  OnDestroy,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import type { Memory } from '../../../../core/models/memory.model';
import { MediaService } from '../../../../core/services/media.service';
import { StorageService } from '../../../../core/services/storage.service';
import { selectPrimaryMedia } from '../../../../shared/utils/media-order';
import { formatMemoryDate } from '../../../../shared/utils/memory-date';
import {
  PhotoViewerComponent,
  type PhotoViewerPhoto,
} from '../photo-viewer/photo-viewer.component';

type PhotoStatus = 'loading' | 'ready' | 'empty' | 'error';

interface MemoryPhotoView extends PhotoViewerPhoto {
  id: string;
  thumbnailUrl: string;
}

@Component({
  selector: 'app-memory-detail-card',
  imports: [PhotoViewerComponent],
  templateUrl: './memory-detail-card.component.html',
  styleUrl: './memory-detail-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoryDetailCardComponent implements OnChanges, OnDestroy {
  readonly memory = input.required<Memory>();
  readonly categoryName = input('Sin categoría');
  readonly closed = output<void>();

  private readonly mediaService = inject(MediaService);
  private readonly storageService = inject(StorageService);
  private loadVersion = 0;

  protected readonly importanceLevels = [1, 2, 3, 4, 5] as const;
  protected readonly photoStatus = signal<PhotoStatus>('loading');
  protected readonly photos = signal<MemoryPhotoView[]>([]);
  protected readonly viewerIndex = signal<number | null>(null);
  protected readonly imageLoadFailed = signal(false);
  protected readonly formattedDate = computed(() => formatMemoryDate(this.memory().memoryDate));
  protected readonly primaryPhoto = computed(() =>
    selectPrimaryMedia(this.photos(), this.memory().coverMediaId),
  );
  protected readonly primaryPhotoIndex = computed(() => {
    const primary = this.primaryPhoto();
    return primary ? this.photos().findIndex((photo) => photo.id === primary.id) : 0;
  });
  protected readonly visiblePhotos = computed(() => this.photos().slice(0, 4));
  protected readonly viewerPhotos = computed<PhotoViewerPhoto[]>(() =>
    this.photos().map(({ url, alt }) => ({ url, alt })),
  );

  ngOnChanges(): void {
    void this.loadPhotos(this.memory().id);
  }

  ngOnDestroy(): void {
    this.loadVersion += 1;
  }

  protected reloadPhotos(): void {
    void this.loadPhotos(this.memory().id);
  }

  protected openViewer(index: number): void {
    this.viewerIndex.set(index);
  }

  protected closeViewer(): void {
    this.viewerIndex.set(null);
  }

  protected markImageFailure(): void {
    this.imageLoadFailed.set(true);
  }

  private async loadPhotos(memoryId: string): Promise<void> {
    const version = ++this.loadVersion;
    this.photoStatus.set('loading');
    this.photos.set([]);
    this.imageLoadFailed.set(false);

    try {
      const media = (await this.mediaService.getByMemoryId(memoryId)).filter(
        (item) => item.type === 'image',
      );

      if (version !== this.loadVersion) {
        return;
      }

      if (media.length === 0) {
        this.photoStatus.set('empty');
        return;
      }

      const paths = media.flatMap((item) => [
        item.storagePath,
        item.thumbnailPath ?? item.storagePath,
      ]);
      const signedUrls = await this.storageService.createSignedUrls(paths);

      if (version !== this.loadVersion) {
        return;
      }

      this.photos.set(
        media.map((item, index) => ({
          id: item.id,
          url: signedUrls[item.storagePath],
          thumbnailUrl: signedUrls[item.thumbnailPath ?? item.storagePath],
          alt: item.originalFilename
            ? `Fotografía ${item.originalFilename} de ${this.memory().title}`
            : `Fotografía ${index + 1} de ${this.memory().title}`,
        })),
      );
      this.photoStatus.set('ready');
    } catch (error) {
      if (version !== this.loadVersion) {
        return;
      }

      console.error('Our Journey: no se pudieron cargar las fotografías del recuerdo.', error);
      this.photoStatus.set('error');
    }
  }
}
