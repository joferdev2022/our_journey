import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { isTripDateRangeValid } from '../../shared/utils/trip-date';

const trimmedRequired: ValidatorFn = (control: AbstractControl<string>): ValidationErrors | null =>
  control.value.trim().length > 0 ? null : { required: true };

const tripDateRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const startDate = control.get('startDate')?.value;
  const endDate = control.get('endDate')?.value;

  if (typeof startDate !== 'string' || typeof endDate !== 'string' || !startDate || !endDate) {
    return null;
  }

  return isTripDateRangeValid(startDate, endDate) ? null : { dateRange: true };
};

export function createTripForm(formBuilder: FormBuilder) {
  return formBuilder.group(
    {
      title: formBuilder.nonNullable.control('', [trimmedRequired, Validators.maxLength(160)]),
      startDate: formBuilder.nonNullable.control('', Validators.required),
      endDate: formBuilder.nonNullable.control('', Validators.required),
      description: formBuilder.nonNullable.control('', Validators.maxLength(4000)),
    },
    { validators: tripDateRangeValidator },
  );
}

export type TripForm = ReturnType<typeof createTripForm>;
