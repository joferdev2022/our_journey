import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import type { Category } from '../../../../core/models/category.model';
import type { Memory } from '../../../../core/models/memory.model';
import { formatMemoryDate } from '../../../../shared/utils/memory-date';

@Component({
  selector: 'app-memory-card',
  imports: [RouterLink],
  templateUrl: './memory-card.component.html',
  styleUrl: './memory-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoryCardComponent {
  readonly memory = input.required<Memory>();
  readonly category = input<Category | null>(null);
  readonly thumbnailUrl = input<string | null>(null);

  private readonly failedUrl = signal<string | null>(null);
  protected readonly formattedDate = computed(() => formatMemoryDate(this.memory().memoryDate));
  protected readonly showImage = computed(() => {
    const url = this.thumbnailUrl();
    return Boolean(url && this.failedUrl() !== url);
  });
  protected readonly importanceLevels = [1, 2, 3, 4, 5] as const;

  protected markThumbnailFailed(): void {
    const url = this.thumbnailUrl();
    if (!url) return;
    this.failedUrl.set(url);
    if (!environment.production) {
      console.warn(`Our Journey: no se pudo mostrar la portada de ${this.memory().id}.`);
    }
  }
}
