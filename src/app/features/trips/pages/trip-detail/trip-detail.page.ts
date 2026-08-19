import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type { Category } from '../../../../core/models/category.model';
import type { Memory } from '../../../../core/models/memory.model';
import type { Trip } from '../../../../core/models/trip.model';
import { CategoryService } from '../../../../core/services/category.service';
import { MemoryService } from '../../../../core/services/memory.service';
import { TripService } from '../../../../core/services/trip.service';
import { formatMemoryDate } from '../../../../shared/utils/memory-date';
import { memoriesToFeatureCollection } from '../../../../shared/utils/memory-geojson';
import { formatTripDateRange } from '../../../../shared/utils/trip-date';
import {
  memoriesToTripPath,
  sortMemoriesChronologically,
} from '../../../../shared/utils/trip-path-geojson';
import { MemoryDetailCardComponent } from '../../../journey/components/memory-detail-card/memory-detail-card.component';
import { TripMapComponent } from '../../components/trip-map/trip-map.component';

type TripDetailStatus = 'loading' | 'ready' | 'not-found' | 'error';

@Component({
  selector: 'app-trip-detail-page',
  imports: [RouterLink, TripMapComponent, MemoryDetailCardComponent],
  templateUrl: './trip-detail.page.html',
  styleUrl: './trip-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripDetailPage implements OnInit {
  @ViewChild(TripMapComponent)
  private tripMap?: TripMapComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly tripService = inject(TripService);
  private readonly memoryService = inject(MemoryService);
  private readonly categoryService = inject(CategoryService);

  protected readonly trip = signal<Trip | null>(null);
  protected readonly memories = signal<Memory[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly selectedMemory = signal<Memory | null>(null);
  protected readonly status = signal<TripDetailStatus>('loading');
  protected readonly featureCollection = computed(() =>
    memoriesToFeatureCollection(this.memories()),
  );
  protected readonly tripPath = computed(() => memoriesToTripPath(this.memories()));
  protected readonly formatDates = formatTripDateRange;
  protected readonly formatMemoryDate = formatMemoryDate;

  ngOnInit(): void {
    void this.loadTrip();
  }

  protected retry(): void {
    void this.loadTrip();
  }

  protected selectFromMap(memoryId: string): void {
    this.selectedMemory.set(this.memories().find((memory) => memory.id === memoryId) ?? null);
  }

  protected showOnMap(memory: Memory): void {
    this.selectedMemory.set(memory);
    this.tripMap?.focusMemory(memory);
  }

  protected closeMemoryDetail(): void {
    this.selectedMemory.set(null);
  }

  protected categoryName(categoryId: string): string {
    return (
      this.categories().find((category) => category.id === categoryId)?.name ?? 'Sin categoría'
    );
  }

  private async loadTrip(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.status.set('not-found');
      return;
    }

    this.status.set('loading');
    this.selectedMemory.set(null);

    try {
      const [trip, categories] = await Promise.all([
        this.tripService.getById(id),
        this.categoryService.getAll(),
      ]);
      if (!trip) {
        this.status.set('not-found');
        return;
      }

      const memories = await this.memoryService.getByTripId(trip.id);
      this.trip.set(trip);
      this.categories.set(categories);
      this.memories.set(sortMemoriesChronologically(memories));
      this.status.set('ready');
    } catch (error) {
      console.error('Our Journey: no se pudo cargar el detalle del viaje.', error);
      this.status.set('error');
    }
  }
}
