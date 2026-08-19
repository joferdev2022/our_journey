import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { MAX_IMAGES_PER_SELECTION } from '../../../../core/constants/image.constants';
import type { ProcessedMemoryImage } from '../../../../core/services/image-processing.service';
import { ImageProcessingService } from '../../../../core/services/image-processing.service';
import { MemoryPhotoService } from '../../../../core/services/memory-photo.service';

type PhotoUploadStatus = 'selected' | 'processing' | 'ready' | 'uploading' | 'success' | 'error';
type PhotoErrorPhase = 'validation' | 'processing' | 'upload';

interface PhotoUploadItem {
  id: string;
  file: File;
  previewUrl: string | null;
  status: PhotoUploadStatus;
  message: string;
  processed: ProcessedMemoryImage | null;
  errorPhase: PhotoErrorPhase | null;
}

@Component({
  selector: 'app-memory-photo-uploader',
  templateUrl: './memory-photo-uploader.component.html',
  styleUrl: './memory-photo-uploader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoryPhotoUploaderComponent implements OnDestroy {
  readonly memoryId = input.required<string>();
  readonly nextSortOrder = input(0);
  readonly uploadsCompleted = output<number>();

  private readonly imageProcessing = inject(ImageProcessingService);
  private readonly memoryPhotos = inject(MemoryPhotoService);

  protected readonly items = signal<PhotoUploadItem[]>([]);
  protected readonly selectionMessage = signal('');
  protected readonly batchMessage = signal('');
  protected readonly readyCount = computed(
    () => this.items().filter((item) => item.status === 'ready').length,
  );
  protected readonly isBusy = computed(() =>
    this.items().some((item) => item.status === 'processing' || item.status === 'uploading'),
  );
  protected readonly maximumPerSelection = MAX_IMAGES_PER_SELECTION;

  ngOnDestroy(): void {
    for (const item of this.items()) {
      this.revokePreview(item.previewUrl);
    }
  }

  protected async filesSelected(event: Event): Promise<void> {
    const inputElement = event.target as HTMLInputElement;
    const selectedFiles = Array.from(inputElement.files ?? []);
    inputElement.value = '';
    this.batchMessage.set('');

    if (selectedFiles.length === 0) {
      return;
    }

    const files = selectedFiles.slice(0, MAX_IMAGES_PER_SELECTION);
    this.selectionMessage.set(
      selectedFiles.length > MAX_IMAGES_PER_SELECTION
        ? `Puedes añadir hasta ${MAX_IMAGES_PER_SELECTION} fotografías en cada selección. Se tomaron las primeras ${MAX_IMAGES_PER_SELECTION}.`
        : '',
    );

    const newItems = files.map((file) => this.createItem(file));
    this.items.update((current) => [...current, ...newItems]);

    for (const item of newItems) {
      if (item.status === 'selected') {
        await this.processItem(item.id);
      }
    }
  }

  protected removeItem(item: PhotoUploadItem): void {
    if (item.status === 'uploading' || item.status === 'success') {
      return;
    }

    this.revokePreview(item.previewUrl);
    this.items.update((current) => current.filter((candidate) => candidate.id !== item.id));
  }

  protected async retryItem(item: PhotoUploadItem): Promise<void> {
    if (item.errorPhase === 'upload' && item.processed) {
      const uploaded = await this.uploadItem(item.id, this.nextSortOrder());

      if (uploaded) {
        this.batchMessage.set('1 fotografía añadida correctamente.');
        this.uploadsCompleted.emit(1);
      }

      return;
    }

    await this.processItem(item.id);
  }

  protected async uploadReady(): Promise<void> {
    const readyItems = this.items().filter((item) => item.status === 'ready');

    if (readyItems.length === 0) {
      return;
    }

    this.batchMessage.set(`Subiendo 0 de ${readyItems.length}…`);
    let successCount = 0;

    for (const [index, item] of readyItems.entries()) {
      this.batchMessage.set(`Subiendo ${index + 1} de ${readyItems.length}…`);
      const uploaded = await this.uploadItem(item.id, this.nextSortOrder() + successCount);

      if (uploaded) {
        successCount += 1;
      }
    }

    const failedCount = readyItems.length - successCount;
    this.batchMessage.set(
      failedCount === 0
        ? `${successCount} ${successCount === 1 ? 'fotografía añadida' : 'fotografías añadidas'} correctamente.`
        : `${successCount} guardadas y ${failedCount} con error. Puedes reintentar las fallidas.`,
    );

    if (successCount > 0) {
      this.uploadsCompleted.emit(successCount);
    }
  }

  protected statusLabel(item: PhotoUploadItem): string {
    const labels: Record<PhotoUploadStatus, string> = {
      selected: 'Seleccionada',
      processing: 'Procesando…',
      ready: 'Lista para subir',
      uploading: 'Subiendo…',
      success: 'Guardada',
      error: 'Error',
    };

    return labels[item.status];
  }

  protected canRetry(item: PhotoUploadItem): boolean {
    return item.status === 'error' && item.errorPhase !== 'validation';
  }

  private createItem(file: File): PhotoUploadItem {
    const item: PhotoUploadItem = {
      id: globalThis.crypto.randomUUID(),
      file,
      previewUrl: null,
      status: 'selected',
      message: '',
      processed: null,
      errorPhase: null,
    };

    try {
      item.previewUrl = this.imageProcessing.createPreview(file);
    } catch (error) {
      item.status = 'error';
      item.errorPhase = 'validation';
      item.message = this.userMessage(error);
    }

    return item;
  }

  private async processItem(itemId: string): Promise<void> {
    const item = this.findItem(itemId);

    if (!item) {
      return;
    }

    this.patchItem(itemId, {
      status: 'processing',
      message: 'Optimizando imagen y thumbnail…',
      errorPhase: null,
    });

    try {
      const processed = await this.imageProcessing.processImage(item.file);
      this.patchItem(itemId, {
        status: 'ready',
        message: 'Imagen optimizada y lista.',
        processed,
        errorPhase: null,
      });
    } catch (error) {
      console.error('Our Journey: no se pudo procesar una fotografía.', error);
      this.patchItem(itemId, {
        status: 'error',
        message: this.userMessage(error),
        processed: null,
        errorPhase: 'processing',
      });
    }
  }

  private async uploadItem(itemId: string, sortOrder: number): Promise<boolean> {
    const item = this.findItem(itemId);

    if (!item?.processed) {
      return false;
    }

    this.patchItem(itemId, { status: 'uploading', message: 'Guardando de forma privada…' });

    try {
      await this.memoryPhotos.upload(this.memoryId(), item.processed, sortOrder);
      this.revokePreview(item.previewUrl);
      this.patchItem(itemId, {
        status: 'success',
        message: 'Fotografía guardada.',
        previewUrl: null,
        errorPhase: null,
      });
      return true;
    } catch (error) {
      console.error('Our Journey: no se pudo subir una fotografía.', error);
      this.patchItem(itemId, {
        status: 'error',
        message: `No pudimos subir ${item.file.name}. Puedes intentarlo nuevamente.`,
        errorPhase: 'upload',
      });
      return false;
    }
  }

  private findItem(itemId: string): PhotoUploadItem | undefined {
    return this.items().find((item) => item.id === itemId);
  }

  private patchItem(itemId: string, changes: Partial<PhotoUploadItem>): void {
    this.items.update((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...changes } : item)),
    );
  }

  private userMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : 'No pudimos procesar esta imagen. Prueba convirtiéndola a JPG, PNG o WebP.';
  }

  private revokePreview(previewUrl: string | null): void {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }
}
