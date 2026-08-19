import { FormBuilder } from '@angular/forms';

import { createMemoryForm } from './memory-form';

describe('createMemoryForm', () => {
  function validForm() {
    const form = createMemoryForm(new FormBuilder());
    form.patchValue({
      title: 'Nuestra primera cita',
      memoryDate: '2026-08-19',
      categoryId: 'category-1',
      latitude: -9.3,
      longitude: -76,
      importance: 3,
    });
    return form;
  }

  it('is invalid without a title', () => {
    const form = validForm();
    form.controls.title.setValue('');

    expect(form.invalid).toBe(true);
    expect(form.controls.title.hasError('required')).toBe(true);
  });

  it('is invalid without a date', () => {
    const form = validForm();
    form.controls.memoryDate.setValue('');

    expect(form.invalid).toBe(true);
    expect(form.controls.memoryDate.hasError('required')).toBe(true);
  });

  it('is invalid without a category', () => {
    const form = validForm();
    form.controls.categoryId.setValue('');

    expect(form.invalid).toBe(true);
    expect(form.controls.categoryId.hasError('required')).toBe(true);
  });

  it('is invalid without a map location', () => {
    const form = validForm();
    form.patchValue({ latitude: null, longitude: null });

    expect(form.invalid).toBe(true);
    expect(form.controls.latitude.hasError('required')).toBe(true);
    expect(form.controls.longitude.hasError('required')).toBe(true);
  });

  it('is valid with the required information and coordinates', () => {
    expect(validForm().valid).toBe(true);
  });
});
