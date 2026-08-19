import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import type { TripEditableFields } from '../../../../core/models/trip.model';
import { AuthService } from '../../../../core/services/auth.service';
import { TripService } from '../../../../core/services/trip.service';
import { TripFormComponent } from '../../components/trip-form/trip-form.component';

@Component({
  selector: 'app-new-trip-page',
  imports: [RouterLink, TripFormComponent],
  templateUrl: './new-trip.page.html',
  styleUrl: './new-trip.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewTripPage {
  private readonly trips = inject(TripService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isSaving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected async createTrip(value: TripEditableFields): Promise<void> {
    if (this.isSaving()) return;
    this.isSaving.set(true);
    this.saveError.set(null);

    try {
      const user = this.auth.getCurrentUser() ?? (await this.auth.getSession())?.user ?? null;
      if (!user?.id) {
        this.saveError.set('Tu sesión ya no está disponible. Vuelve a iniciar sesión.');
        return;
      }
      await this.trips.create({ ...value, coverPath: null });
      await this.router.navigate(['/admin/trips']);
    } catch (error) {
      console.error('Our Journey: no se pudo crear el viaje.', error);
      this.saveError.set('No pudimos crear el viaje. Intenta nuevamente.');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected cancel(): void {
    void this.router.navigate(['/admin/trips']);
  }
}
