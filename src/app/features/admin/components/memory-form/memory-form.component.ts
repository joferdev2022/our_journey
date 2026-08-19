import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import type { Category } from '../../../../core/models/category.model';
import type { CreateMemory, Memory, MemoryImportance } from '../../../../core/models/memory.model';
import type { Trip } from '../../../../core/models/trip.model';
import { CategoryService } from '../../../../core/services/category.service';
import { TripService } from '../../../../core/services/trip.service';
import { createMemoryForm } from '../../memory-form';
import {
  LocationPickerMapComponent,
  type LocationSelection,
} from '../location-picker-map/location-picker-map.component';

export type MemoryFormMode = 'create' | 'edit';
type ReferenceStatus = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-memory-form',
  imports: [ReactiveFormsModule, LocationPickerMapComponent],
  templateUrl: './memory-form.component.html',
  styleUrl: './memory-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoryFormComponent implements OnInit, OnChanges {
  readonly mode = input.required<MemoryFormMode>();
  readonly initialMemory = input<Memory | null>(null);
  readonly initialTripId = input<string | null>(null);
  readonly isSaving = input(false);
  readonly saveError = input<string | null>(null);
  readonly submitted = output<CreateMemory>();
  readonly canceled = output<void>();

  private readonly formBuilder = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly tripService = inject(TripService);

  protected readonly memoryForm = createMemoryForm(this.formBuilder);
  protected readonly categories = signal<Category[]>([]);
  protected readonly trips = signal<Trip[]>([]);
  protected readonly categoriesStatus = signal<ReferenceStatus>('loading');
  protected readonly tripsStatus = signal<ReferenceStatus>('loading');
  protected readonly selectedLocation = signal<LocationSelection | null>(null);
  protected readonly importanceLevels = [1, 2, 3, 4, 5] as const;

  ngOnInit(): void {
    void this.loadReferences();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialMemory']) {
      this.resetFromMemory(this.initialMemory());
    }
  }

  protected setLocation(selection: LocationSelection): void {
    this.selectedLocation.set(selection);
    this.memoryForm.patchValue({
      latitude: selection.latitude,
      longitude: selection.longitude,
    });
    this.memoryForm.controls.latitude.markAsTouched();
    this.memoryForm.controls.longitude.markAsTouched();
    this.memoryForm.markAsDirty();
  }

  protected retryCategories(): void {
    void this.loadCategories();
  }

  protected submit(): void {
    if (this.memoryForm.invalid || this.categoriesStatus() !== 'ready') {
      this.memoryForm.markAllAsTouched();
      return;
    }

    const value = this.memoryForm.getRawValue();

    if (value.latitude === null || value.longitude === null) {
      this.memoryForm.controls.latitude.markAsTouched();
      this.memoryForm.controls.longitude.markAsTouched();
      return;
    }

    this.submitted.emit({
      title: value.title.trim(),
      memoryDate: value.memoryDate + 'T12:00:00.000Z',
      categoryId: value.categoryId,
      placeName: value.placeName.trim() || null,
      description: value.description.trim() || null,
      tripId: value.tripId || null,
      importance: value.importance as MemoryImportance,
      latitude: value.latitude,
      longitude: value.longitude,
    });
  }

  protected requestCancel(): void {
    if (this.memoryForm.dirty && !globalThis.confirm('Hay cambios sin guardar. ¿Quieres salir?')) {
      return;
    }

    this.canceled.emit();
  }

  private resetFromMemory(memory: Memory | null): void {
    if (!memory) {
      this.selectedLocation.set(null);
      return;
    }

    const location = { latitude: memory.latitude, longitude: memory.longitude };
    this.memoryForm.reset({
      title: memory.title,
      memoryDate: memory.memoryDate.slice(0, 10),
      categoryId: memory.categoryId,
      placeName: memory.placeName ?? '',
      description: memory.description ?? '',
      tripId: memory.tripId ?? '',
      importance: memory.importance,
      latitude: memory.latitude,
      longitude: memory.longitude,
    });
    this.selectedLocation.set(location);
  }

  private async loadReferences(): Promise<void> {
    await Promise.all([this.loadCategories(), this.loadTrips()]);
  }

  private async loadCategories(): Promise<void> {
    this.categoriesStatus.set('loading');

    try {
      const categories = await this.categoryService.getAll();
      this.categories.set(categories);
      this.categoriesStatus.set(categories.length > 0 ? 'ready' : 'empty');
    } catch (error) {
      console.error('Our Journey: no se pudieron cargar las categorías.', error);
      this.categoriesStatus.set('error');
    }
  }

  private async loadTrips(): Promise<void> {
    this.tripsStatus.set('loading');

    try {
      const trips = await this.tripService.getAll();
      this.trips.set(trips);
      this.tripsStatus.set(trips.length > 0 ? 'ready' : 'empty');

      const requestedTripId = this.initialTripId();
      if (
        this.mode() === 'create' &&
        requestedTripId &&
        trips.some((trip) => trip.id === requestedTripId)
      ) {
        this.memoryForm.controls.tripId.setValue(requestedTripId);
        this.memoryForm.controls.tripId.markAsPristine();
      }
    } catch (error) {
      console.warn('Our Journey: los viajes opcionales no están disponibles.', error);
      this.tripsStatus.set('error');
    }
  }
}
