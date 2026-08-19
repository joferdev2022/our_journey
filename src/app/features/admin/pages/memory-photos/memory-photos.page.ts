import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type { MemoryMedia } from '../../../../core/models/media.model';
import type { Memory } from '../../../../core/models/memory.model';
import { MediaService } from '../../../../core/services/media.service';
import { MemoryManagementService } from '../../../../core/services/memory-management.service';
import { MemoryPhotoService } from '../../../../core/services/memory-photo.service';
import { MemoryService } from '../../../../core/services/memory.service';
import { StorageService } from '../../../../core/services/storage.service';
import {
  moveMediaItem,
  normalizeMediaOrder,
  type MoveDirection,
} from '../../../../shared/utils/media-order';
import { formatMemoryDate } from '../../../../shared/utils/memory-date';
import { MemoryPhotoUploaderComponent } from '../../components/memory-photo-uploader/memory-photo-uploader.component';

type PhotosPageStatus = 'loading' | 'success' | 'not-found' | 'error';

@Component({
  selector: 'app-memory-photos-page',
  imports: [RouterLink, MemoryPhotoUploaderComponent],
  templateUrl: './memory-photos.page.html',
  styleUrl: './memory-photos.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoryPhotosPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly memoryService = inject(MemoryService);
  private readonly mediaService = inject(MediaService);
  private readonly storageService = inject(StorageService);
  private readonly memoryPhotoService = inject(MemoryPhotoService);
  private readonly memoryManagement = inject(MemoryManagementService);

  protected readonly memory = signal<Memory | null>(null);
  protected readonly photos = signal<MemoryMedia[]>([]);
  protected readonly thumbnailUrls = signal<Record<string, string>>({});
  protected readonly status = signal<PhotosPageStatus>('loading');
  protected readonly busyAction = signal<string | null>(null);
  protected readonly feedback = signal('');
  protected readonly formatDate = formatMemoryDate;
  protected readonly nextSortOrder = computed(() => {
    const orders = this.photos().map((photo) => photo.sortOrder);
    return orders.length === 0 ? 0 : Math.max(...orders) + 1;
  });

  ngOnInit(): void {
    void this.loadPage();
  }

  protected retry(): void {
    void this.loadPage();
  }

  protected uploadsCompleted(count: number): void {
    void this.refreshAfterUpload(count);
  }

  protected isCover(photo: MemoryMedia): boolean {
    return this.memory()?.coverMediaId === photo.id;
  }

  protected async setCover(photo: MemoryMedia): Promise<void> {
    const memory = this.memory();
    if (!memory || this.busyAction()) return;

    this.busyAction.set(`cover:${photo.id}`);
    this.feedback.set('');

    try {
      const updated = await this.memoryManagement.setCover(memory.id, photo.id);
      this.memory.set(updated);
      this.feedback.set(
        'Portada actualizada. Journey usará esta fotografía como imagen principal.',
      );
    } catch (error) {
      console.error('Our Journey: no se pudo establecer la portada.', error);
      this.feedback.set('No pudimos cambiar la portada. Intenta nuevamente.');
    } finally {
      this.busyAction.set(null);
    }
  }

  protected async movePhoto(index: number, direction: MoveDirection): Promise<void> {
    const memory = this.memory();
    if (!memory || this.busyAction()) return;

    const reordered = normalizeMediaOrder(moveMediaItem(this.photos(), index, direction));
    if (reordered.every((photo, currentIndex) => photo.id === this.photos()[currentIndex]?.id)) {
      return;
    }

    this.busyAction.set('reorder');
    this.feedback.set('');

    try {
      await this.mediaService.updateSortOrders(
        memory.id,
        reordered.map((photo) => photo.id),
      );
      this.photos.set(reordered);
      this.feedback.set('Orden actualizado correctamente.');
    } catch (error) {
      console.error('Our Journey: no se pudo reordenar la galería.', error);
      this.feedback.set('No pudimos cambiar el orden. La galería anterior se mantuvo.');
    } finally {
      this.busyAction.set(null);
    }
  }

  protected async deletePhoto(photo: MemoryMedia): Promise<void> {
    const memory = this.memory();
    if (!memory || this.busyAction()) return;

    const confirmed = globalThis.confirm(
      `¿Eliminar ${photo.originalFilename ?? 'esta fotografía'}? Esta acción quitará sus archivos privados.`,
    );
    if (!confirmed) return;

    this.busyAction.set(`delete:${photo.id}`);
    this.feedback.set('');

    try {
      await this.memoryPhotoService.delete(photo);
      const remaining = this.photos().filter((item) => item.id !== photo.id);
      let normalized = true;

      try {
        await this.mediaService.updateSortOrders(
          memory.id,
          remaining.map((item) => item.id),
        );
      } catch (orderError) {
        normalized = false;
        console.error(
          'Our Journey: la fotografía se eliminó, pero no se normalizó el orden.',
          orderError,
        );
      }

      if (memory.coverMediaId === photo.id) {
        this.memory.set({ ...memory, coverMediaId: null });
      }

      await this.loadPhotos();
      this.feedback.set(
        normalized
          ? 'Fotografía eliminada y orden normalizado.'
          : 'Fotografía eliminada. El orden no pudo normalizarse y puedes reintentarlo moviendo otra foto.',
      );
    } catch (error) {
      console.error('Our Journey: no se pudo eliminar una fotografía.', error);
      this.feedback.set(
        'No pudimos completar la eliminación. Revisa la conexión e inténtalo nuevamente.',
      );
    } finally {
      this.busyAction.set(null);
    }
  }

  protected thumbnailUrl(photo: MemoryMedia): string | null {
    const path = photo.thumbnailPath ?? photo.storagePath;
    return this.thumbnailUrls()[path] ?? null;
  }

  private async refreshAfterUpload(count: number): Promise<void> {
    try {
      await this.loadPhotos();
      this.feedback.set(
        `${count} ${count === 1 ? 'fotografía guardada' : 'fotografías guardadas'}. Galería actualizada.`,
      );
    } catch (error) {
      console.error('Our Journey: no se pudo refrescar la galería.', error);
      this.feedback.set(
        'Las fotografías se guardaron, pero no pudimos refrescar la galería. Pulsa Reintentar.',
      );
    }
  }

  private async loadPage(): Promise<void> {
    const memoryId = this.route.snapshot.paramMap.get('id');
    if (!memoryId) {
      this.status.set('not-found');
      return;
    }

    this.status.set('loading');
    try {
      const memory = await this.memoryService.getById(memoryId);
      if (!memory) {
        this.status.set('not-found');
        return;
      }
      this.memory.set(memory);
      await this.loadPhotos();
      this.status.set('success');
    } catch (error) {
      console.error('Our Journey: no se pudo cargar la administración de fotografías.', error);
      this.status.set('error');
    }
  }

  private async loadPhotos(): Promise<void> {
    const memory = this.memory();
    if (!memory) return;

    const photos = (await this.mediaService.getByMemoryId(memory.id)).filter(
      (media) => media.type === 'image',
    );
    const paths = photos.map((photo) => photo.thumbnailPath ?? photo.storagePath);
    const urls = await this.storageService.createSignedUrls(paths);
    this.photos.set(photos);
    this.thumbnailUrls.set(urls);
  }
}
