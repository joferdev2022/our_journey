import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { MemoryImportance } from '../../core/models/memory.model';

const trimmedRequired: ValidatorFn = (control: AbstractControl<string>): ValidationErrors | null =>
  control.value.trim().length > 0 ? null : { required: true };

export function createMemoryForm(formBuilder: FormBuilder) {
  return formBuilder.group({
    title: formBuilder.nonNullable.control('', [trimmedRequired, Validators.maxLength(160)]),
    memoryDate: formBuilder.nonNullable.control('', Validators.required),
    categoryId: formBuilder.nonNullable.control('', Validators.required),
    placeName: formBuilder.nonNullable.control('', Validators.maxLength(160)),
    description: formBuilder.nonNullable.control('', Validators.maxLength(4000)),
    tripId: formBuilder.nonNullable.control(''),
    importance: formBuilder.nonNullable.control<MemoryImportance>(3, [
      Validators.min(1),
      Validators.max(5),
    ]),
    latitude: formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(-90),
      Validators.max(90),
    ]),
    longitude: formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(-180),
      Validators.max(180),
    ]),
  });
}

export type MemoryForm = ReturnType<typeof createMemoryForm>;
