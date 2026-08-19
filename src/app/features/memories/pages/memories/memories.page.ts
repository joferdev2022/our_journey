import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  MEMORIES_INITIAL_VISIBLE,
  MEMORIES_VISIBLE_INCREMENT,
} from '../../../../core/constants/memories.constants';
import type { Category } from '../../../../core/models/category.model';
import type { MemoryCoverMedia } from '../../../../core/models/media.model';
import type { Memory } from '../../../../core/models/memory.model';
import { CategoryService } from '../../../../core/services/category.service';
import { MediaService } from '../../../../core/services/media.service';
import { MemoryService } from '../../../../core/services/memory.service';
import { StorageService } from '../../../../core/services/storage.service';
import {
  memoryCoverThumbnailPath,
  resolveMemoryCover,
} from '../../../../shared/utils/memory-cover';
import {
  type MemorySortOrder,
  filterAndSortMemories,
  getMemoryYears,
  groupMemoriesByYearMonth,
} from '../../../../shared/utils/memory-library';
import { MemoryCardComponent } from '../../components/memory-card/memory-card.component';

type MemoriesStatus = 'loading' | 'success' | 'empty' | 'error';

@Component({
  selector: 'app-memories-page',
  imports: [RouterLink, MemoryCardComponent],
  templateUrl: './memories.page.html',
  styleUrl: './memories.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoriesPage implements OnInit {
  private readonly memoryService = inject(MemoryService);
  private readonly categoryService = inject(CategoryService);
  private readonly mediaService = inject(MediaService);
  private readonly storageService = inject(StorageService);

  protected readonly memories = signal<Memory[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly status = signal<MemoriesStatus>('loading');
  protected readonly query = signal('');
  protected readonly selectedCategoryId = signal<string | null>(null);
  protected readonly selectedYear = signal<number | null>(null);
  protected readonly sortOrder = signal<MemorySortOrder>('newest');
  protected readonly visibleCount = signal(MEMORIES_INITIAL_VISIBLE);

  private readonly mediaByMemoryId = signal<Record<string, MemoryCoverMedia[]>>({});
  private readonly thumbnailUrls = signal<Record<string, string>>({});
  private readonly loadingMemoryIds = new Set<string>();
  private readonly signingPaths = new Set<string>();

  protected readonly years = computed(() => getMemoryYears(this.memories()));
  protected readonly filteredMemories = computed(() =>
    filterAndSortMemories(this.memories(), {
      query: this.query(),
      categoryId: this.selectedCategoryId(),
      year: this.selectedYear(),
      sortOrder: this.sortOrder(),
    }),
  );
  protected readonly visibleMemories = computed(() =>
    this.filteredMemories().slice(0, this.visibleCount()),
  );
  protected readonly groups = computed(() =>
    groupMemoriesByYearMonth(this.visibleMemories(), this.sortOrder()),
  );
  protected readonly filtersActive = computed(
    () =>
      this.query().trim().length > 0 ||
      this.selectedCategoryId() !== null ||
      this.selectedYear() !== null,
  );
  protected readonly hasMore = computed(
    () => this.visibleMemories().length < this.filteredMemories().length,
  );
  protected readonly categoryById = computed(
    () => new Map(this.categories().map((category) => [category.id, category])),
  );
  protected readonly coverUrlsByMemoryId = computed(() => {
    const result: Record<string, string> = {};
    const urls = this.thumbnailUrls();
    const mediaByMemoryId = this.mediaByMemoryId();

    for (const memory of this.visibleMemories()) {
      const cover = resolveMemoryCover(memory, mediaByMemoryId[memory.id] ?? []);
      const path = memoryCoverThumbnailPath(cover);
      if (path && urls[path]) result[memory.id] = urls[path];
    }

    return result;
  });

  constructor() {
    effect(() => {
      void this.ensureVisibleCovers(this.visibleMemories());
    });
  }

  ngOnInit(): void {
    void this.loadLibrary();
  }

  protected retry(): void {
    void this.loadLibrary();
  }

  protected updateQuery(value: string): void {
    this.query.set(value);
    this.resetVisibleCount();
  }

  protected selectCategory(categoryId: string | null): void {
    this.selectedCategoryId.set(categoryId);
    this.resetVisibleCount();
  }

  protected selectYear(value: string): void {
    this.selectedYear.set(value ? Number(value) : null);
    this.resetVisibleCount();
  }

  protected selectSortOrder(value: string): void {
    this.sortOrder.set(value === 'oldest' ? 'oldest' : 'newest');
    this.resetVisibleCount();
  }

  protected clearFilters(): void {
    this.query.set('');
    this.selectedCategoryId.set(null);
    this.selectedYear.set(null);
    this.resetVisibleCount();
  }

  protected showMore(): void {
    this.visibleCount.update((count) => count + MEMORIES_VISIBLE_INCREMENT);
  }

  protected categoryFor(categoryId: string): Category | null {
    return this.categoryById().get(categoryId) ?? null;
  }

  protected coverUrlFor(memoryId: string): string | null {
    return this.coverUrlsByMemoryId()[memoryId] ?? null;
  }

  private resetVisibleCount(): void {
    this.visibleCount.set(MEMORIES_INITIAL_VISIBLE);
  }

  private async loadLibrary(): Promise<void> {
    this.status.set('loading');
    this.memories.set([]);
    this.categories.set([]);
    this.mediaByMemoryId.set({});
    this.thumbnailUrls.set({});
    this.loadingMemoryIds.clear();
    this.signingPaths.clear();
    this.resetVisibleCount();

    try {
      const [memories, categories] = await Promise.all([
        this.memoryService.getAll(),
        this.categoryService.getAll(),
      ]);
      this.memories.set(memories);
      this.categories.set(categories);
      this.status.set(memories.length > 0 ? 'success' : 'empty');
    } catch (error) {
      console.error('Our Journey: no se pudo cargar la biblioteca de recuerdos.', error);
      this.status.set('error');
    }
  }

  private async ensureVisibleCovers(memories: readonly Memory[]): Promise<void> {
    if (memories.length === 0) return;

    const currentMedia = this.mediaByMemoryId();
    const unknownIds = memories
      .map((memory) => memory.id)
      .filter(
        (memoryId) =>
          !Object.prototype.hasOwnProperty.call(currentMedia, memoryId) &&
          !this.loadingMemoryIds.has(memoryId),
      );

    if (unknownIds.length > 0) {
      unknownIds.forEach((memoryId) => this.loadingMemoryIds.add(memoryId));
      try {
        const media = await this.mediaService.getImageMetadataByMemoryIds(unknownIds);
        const grouped = Object.fromEntries(unknownIds.map((memoryId) => [memoryId, []])) as Record<
          string,
          MemoryCoverMedia[]
        >;
        for (const item of media) grouped[item.memoryId].push(item);
        this.mediaByMemoryId.update((existing) => ({ ...existing, ...grouped }));
      } catch (error) {
        console.error('Our Journey: no se pudieron preparar las portadas visibles.', error);
      } finally {
        unknownIds.forEach((memoryId) => this.loadingMemoryIds.delete(memoryId));
      }
    }

    const refreshedMedia = this.mediaByMemoryId();
    const currentUrls = this.thumbnailUrls();
    const paths = memories
      .map((memory) =>
        memoryCoverThumbnailPath(resolveMemoryCover(memory, refreshedMedia[memory.id] ?? [])),
      )
      .filter((path): path is string =>
        Boolean(path && !currentUrls[path] && !this.signingPaths.has(path)),
      );

    if (paths.length === 0) return;
    paths.forEach((path) => this.signingPaths.add(path));

    try {
      const urls = await this.storageService.createCachedSignedUrls(paths);
      this.thumbnailUrls.update((existing) => ({ ...existing, ...urls }));
    } catch (error) {
      console.error('Our Journey: algunas portadas privadas no pudieron cargarse.', error);
    } finally {
      paths.forEach((path) => this.signingPaths.delete(path));
    }
  }
}
