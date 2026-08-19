import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type { Category } from '../../../../core/models/category.model';
import type { MemoryMedia } from '../../../../core/models/media.model';
import type { Memory } from '../../../../core/models/memory.model';
import { CategoryService } from '../../../../core/services/category.service';
import { MediaService } from '../../../../core/services/media.service';
import { MemoryService } from '../../../../core/services/memory.service';
import { StorageService } from '../../../../core/services/storage.service';
import { resolveMemoryCover } from '../../../../shared/utils/memory-cover';
import { formatMemoryDate } from '../../../../shared/utils/memory-date';
import { createMemoryMapNavigation } from '../../../../shared/utils/memory-navigation';
import {
  PhotoViewerComponent,
  type PhotoViewerPhoto,
} from '../../../journey/components/photo-viewer/photo-viewer.component';

type MemoryDetailStatus = 'loading' | 'ready' | 'not-found' | 'error';
type ImageMemoryMedia = MemoryMedia & { type: 'image' };

interface DetailPhotoView extends PhotoViewerPhoto {
  id: string;
  thumbnailUrl: string;
}

@Component({
  selector: 'app-memory-detail-page',
  imports: [RouterLink, PhotoViewerComponent],
  templateUrl: './memory-detail.page.html',
  styleUrl: './memory-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoryDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly memoryService = inject(MemoryService);
  private readonly categoryService = inject(CategoryService);
  private readonly mediaService = inject(MediaService);
  private readonly storageService = inject(StorageService);

  protected readonly memory = signal<Memory | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly photos = signal<ImageMemoryMedia[]>([]);
  protected readonly signedUrls = signal<Record<string, string>>({});
  protected readonly status = signal<MemoryDetailStatus>('loading');
  protected readonly viewerIndex = signal<number | null>(null);
  protected readonly failedPhotoIds = signal<Set<string>>(new Set());
  protected readonly formatDate = formatMemoryDate;
  protected readonly importanceLevels = [1, 2, 3, 4, 5] as const;

  protected readonly category = computed(() => {
    const memory = this.memory();
    return this.categories().find((category) => category.id === memory?.categoryId) ?? null;
  });
  protected readonly photoViews = computed<DetailPhotoView[]>(() => {
    const urls = this.signedUrls();
    const title = this.memory()?.title ?? 'recuerdo';

    return this.photos().flatMap((photo, index) => {
      const url = urls[photo.storagePath];
      if (!url) return [];
      const thumbnailPath = photo.thumbnailPath ?? photo.storagePath;
      return [
        {
          id: photo.id,
          url,
          thumbnailUrl: urls[thumbnailPath] ?? url,
          alt: `Fotografía ${index + 1} de ${title}`,
        },
      ];
    });
  });
  protected readonly primaryPhoto = computed(() => {
    const memory = this.memory();
    if (!memory) return null;
    const cover = resolveMemoryCover(memory, this.photos());
    return cover ? (this.photoViews().find((photo) => photo.id === cover.id) ?? null) : null;
  });
  protected readonly mapNavigation = computed(() => {
    const memory = this.memory();
    return memory ? createMemoryMapNavigation(memory.id) : null;
  });

  ngOnInit(): void {
    void this.loadMemory();
  }

  protected retry(): void {
    void this.loadMemory();
  }

  protected openViewer(photoId: string): void {
    const index = this.photoViews().findIndex((photo) => photo.id === photoId);
    if (index >= 0) this.viewerIndex.set(index);
  }

  protected closeViewer(): void {
    this.viewerIndex.set(null);
  }

  protected markPhotoFailed(photoId: string): void {
    this.failedPhotoIds.update((failed) => new Set(failed).add(photoId));
  }

  protected photoAvailable(photoId: string): boolean {
    return !this.failedPhotoIds().has(photoId);
  }

  private async loadMemory(): Promise<void> {
    const memoryId = this.route.snapshot.paramMap.get('id');
    if (!memoryId) {
      this.status.set('not-found');
      return;
    }

    this.status.set('loading');
    this.viewerIndex.set(null);
    this.failedPhotoIds.set(new Set());
    this.signedUrls.set({});

    try {
      const [memory, categories] = await Promise.all([
        this.memoryService.getById(memoryId),
        this.categoryService.getAll(),
      ]);
      if (!memory) {
        this.status.set('not-found');
        return;
      }

      const photos = (await this.mediaService.getByMemoryId(memory.id)).filter(
        (media): media is ImageMemoryMedia => media.type === 'image',
      );
      this.memory.set(memory);
      this.categories.set(categories);
      this.photos.set(photos);

      const paths = photos.flatMap((photo) => [
        photo.storagePath,
        photo.thumbnailPath ?? photo.storagePath,
      ]);
      try {
        this.signedUrls.set(await this.storageService.createCachedSignedUrls(paths));
      } catch (error) {
        console.error('Our Journey: no se pudieron preparar las fotografías del detalle.', error);
      }

      this.status.set('ready');
    } catch (error) {
      console.error('Our Journey: no se pudo cargar el recuerdo.', error);
      this.status.set('error');
    }
  }
}
