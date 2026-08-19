import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Trip } from '../../../../core/models/trip.model';
import { TripService } from '../../../../core/services/trip.service';
import { formatTripDateRange } from '../../../../shared/utils/trip-date';

type AdminTripsStatus = 'loading' | 'success' | 'empty' | 'error';

@Component({
  selector: 'app-admin-trips-page',
  imports: [RouterLink],
  templateUrl: './admin-trips.page.html',
  styleUrl: './admin-trips.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTripsPage implements OnInit {
  private readonly tripService = inject(TripService);
  protected readonly trips = signal<Trip[]>([]);
  protected readonly status = signal<AdminTripsStatus>('loading');
  protected readonly deletingId = signal<string | null>(null);
  protected readonly feedback = signal('');
  protected readonly formatDates = formatTripDateRange;

  ngOnInit(): void {
    void this.load();
  }
  protected retry(): void {
    void this.load();
  }

  protected async deleteTrip(trip: Trip): Promise<void> {
    const confirmed = globalThis.confirm(
      `¿Eliminar “${trip.title}”?\n\nLos recuerdos no serán eliminados. Simplemente dejarán de pertenecer al viaje.`,
    );
    if (!confirmed || this.deletingId()) return;
    this.deletingId.set(trip.id);
    this.feedback.set('');
    try {
      await this.tripService.delete(trip.id);
      this.trips.update((items) => items.filter((item) => item.id !== trip.id));
      this.status.set(this.trips().length ? 'success' : 'empty');
      this.feedback.set('Viaje eliminado. Sus recuerdos se conservaron sin viaje asociado.');
    } catch (error) {
      console.error('Our Journey: no se pudo eliminar el viaje.', error);
      this.feedback.set('No pudimos eliminar el viaje. Intenta nuevamente.');
    } finally {
      this.deletingId.set(null);
    }
  }

  private async load(): Promise<void> {
    this.status.set('loading');
    try {
      const trips = await this.tripService.getAll();
      this.trips.set(trips);
      this.status.set(trips.length ? 'success' : 'empty');
    } catch (error) {
      console.error('Our Journey: no se pudieron cargar los viajes en Administración.', error);
      this.status.set('error');
    }
  }
}
