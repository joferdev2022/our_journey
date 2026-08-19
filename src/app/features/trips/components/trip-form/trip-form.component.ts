import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  SimpleChanges,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import type { Trip, TripEditableFields } from '../../../../core/models/trip.model';
import { createTripForm } from '../../trip-form';

export type TripFormMode = 'create' | 'edit';

@Component({
  selector: 'app-trip-form',
  imports: [ReactiveFormsModule],
  templateUrl: './trip-form.component.html',
  styleUrl: './trip-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripFormComponent implements OnChanges {
  readonly mode = input.required<TripFormMode>();
  readonly initialTrip = input<Trip | null>(null);
  readonly isSaving = input(false);
  readonly saveError = input<string | null>(null);
  readonly submitted = output<TripEditableFields>();
  readonly canceled = output<void>();

  private readonly formBuilder = inject(FormBuilder);
  protected readonly tripForm = createTripForm(this.formBuilder);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialTrip']) {
      const trip = this.initialTrip();
      if (trip) {
        this.tripForm.reset({
          title: trip.title,
          startDate: trip.startDate,
          endDate: trip.endDate ?? trip.startDate,
          description: trip.description ?? '',
        });
      }
    }
  }

  protected submit(): void {
    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      return;
    }

    const value = this.tripForm.getRawValue();
    this.submitted.emit({
      title: value.title.trim(),
      startDate: value.startDate,
      endDate: value.endDate,
      description: value.description.trim() || null,
    });
  }

  protected requestCancel(): void {
    if (this.tripForm.dirty && !globalThis.confirm('Hay cambios sin guardar. ¿Quieres salir?'))
      return;
    this.canceled.emit();
  }
}
