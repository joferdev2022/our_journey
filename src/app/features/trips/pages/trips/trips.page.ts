import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Memory } from '../../../../core/models/memory.model';
import type { Trip } from '../../../../core/models/trip.model';
import { MemoryService } from '../../../../core/services/memory.service';
import { TripService } from '../../../../core/services/trip.service';
import { formatTripDateRange } from '../../../../shared/utils/trip-date';

type TripsStatus = 'loading' | 'success' | 'empty' | 'error';

@Component({
  selector: 'app-trips-page',
  imports: [RouterLink],
  templateUrl: './trips.page.html',
  styleUrl: './trips.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripsPage implements OnInit {
  private readonly tripService = inject(TripService);
  private readonly memoryService = inject(MemoryService);

  protected readonly trips = signal<Trip[]>([]);
  protected readonly memoryCounts = signal<Record<string, number>>({});
  protected readonly status = signal<TripsStatus>('loading');
  protected readonly formatDates = formatTripDateRange;

  ngOnInit(): void {
    void this.loadTrips();
  }

  protected retry(): void {
    void this.loadTrips();
  }

  protected memoryCount(tripId: string): number {
    return this.memoryCounts()[tripId] ?? 0;
  }

  private async loadTrips(): Promise<void> {
    this.status.set('loading');

    try {
      const [trips, memories] = await Promise.all([
        this.tripService.getAll(),
        this.memoryService.getAll(),
      ]);
      this.trips.set(trips);
      this.memoryCounts.set(this.countMemoriesByTrip(memories));
      this.status.set(trips.length > 0 ? 'success' : 'empty');
    } catch (error) {
      console.error('Our Journey: no se pudieron cargar los viajes.', error);
      this.status.set('error');
    }
  }

  private countMemoriesByTrip(memories: readonly Memory[]): Record<string, number> {
    return memories.reduce<Record<string, number>>((counts, memory) => {
      if (memory.tripId) counts[memory.tripId] = (counts[memory.tripId] ?? 0) + 1;
      return counts;
    }, {});
  }
}
