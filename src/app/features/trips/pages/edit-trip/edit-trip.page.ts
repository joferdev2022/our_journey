import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { Trip, TripEditableFields } from '../../../../core/models/trip.model';
import { TripService } from '../../../../core/services/trip.service';
import { TripFormComponent } from '../../components/trip-form/trip-form.component';

type EditStatus = 'loading' | 'ready' | 'not-found' | 'error';

@Component({
  selector: 'app-edit-trip-page',
  imports: [RouterLink, TripFormComponent],
  templateUrl: './edit-trip.page.html',
  styleUrl: '../new-trip/new-trip.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditTripPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly trips = inject(TripService);

  protected readonly trip = signal<Trip | null>(null);
  protected readonly status = signal<EditStatus>('loading');
  protected readonly isSaving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  ngOnInit(): void {
    void this.load();
  }
  protected retry(): void {
    void this.load();
  }
  protected cancel(): void {
    void this.router.navigate(['/admin/trips']);
  }

  protected async updateTrip(value: TripEditableFields): Promise<void> {
    const trip = this.trip();
    if (!trip || this.isSaving()) return;
    this.isSaving.set(true);
    this.saveError.set(null);
    try {
      const updated = await this.trips.update(trip.id, value);
      await this.router.navigate(['/trips', updated.id]);
    } catch (error) {
      console.error('Our Journey: no se pudo actualizar el viaje.', error);
      this.saveError.set('No pudimos guardar los cambios. Intenta nuevamente.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.status.set('not-found');
      return;
    }
    this.status.set('loading');
    try {
      const trip = await this.trips.getById(id);
      if (!trip) {
        this.status.set('not-found');
        return;
      }
      this.trip.set(trip);
      this.status.set('ready');
    } catch (error) {
      console.error('Our Journey: no se pudo cargar el viaje.', error);
      this.status.set('error');
    }
  }
}
