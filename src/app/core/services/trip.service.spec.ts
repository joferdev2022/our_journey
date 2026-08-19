import { TestBed } from '@angular/core/testing';

import { TripService } from './trip.service';
import { SupabaseService } from './supabase.service';

const tripRow = {
  id: 'trip-1',
  title: 'Cusco 2025',
  description: 'Nuestro primer viaje.',
  start_date: '2025-06-12',
  end_date: '2025-06-18',
  cover_path: null,
  created_by: 'user-1',
  created_at: '2025-05-01T12:00:00Z',
  updated_at: '2025-05-01T12:00:00Z',
};

describe('TripService', () => {
  const from = vi.fn();

  beforeEach(() => {
    from.mockReset();
    TestBed.configureTestingModule({
      providers: [TripService, { provide: SupabaseService, useValue: { client: { from } } }],
    });
  });

  it('getAll orders trips by newest start date and maps the rows', async () => {
    const order = vi.fn().mockResolvedValue({ data: [tripRow], error: null });
    const select = vi.fn().mockReturnValue({ order });
    from.mockReturnValue({ select });

    const result = await TestBed.inject(TripService).getAll();

    expect(from).toHaveBeenCalledWith('trips');
    expect(select).toHaveBeenCalledWith('*');
    expect(order).toHaveBeenCalledWith('start_date', { ascending: false });
    expect(result[0]).toMatchObject({
      id: 'trip-1',
      title: 'Cusco 2025',
      startDate: '2025-06-12',
      endDate: '2025-06-18',
      createdBy: 'user-1',
    });
  });

  it('getById filters by id and returns one mapped trip', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: tripRow, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ select });

    const result = await TestBed.inject(TripService).getById('trip-1');

    expect(eq).toHaveBeenCalledWith('id', 'trip-1');
    expect(maybeSingle).toHaveBeenCalled();
    expect(result?.title).toBe('Cusco 2025');
  });

  it('create maps camelCase to the existing trips columns', async () => {
    const single = vi.fn().mockResolvedValue({ data: tripRow, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    from.mockReturnValue({ insert });

    const result = await TestBed.inject(TripService).create({
      title: 'Cusco 2025',
      description: 'Nuestro primer viaje.',
      startDate: '2025-06-12',
      endDate: '2025-06-18',
      coverPath: null,
    });

    expect(insert).toHaveBeenCalledWith({
      title: 'Cusco 2025',
      description: 'Nuestro primer viaje.',
      start_date: '2025-06-12',
      end_date: '2025-06-18',
      cover_path: null,
    });
    expect(result.id).toBe('trip-1');
  });

  it('update only sends the supplied editable fields', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { ...tripRow, title: 'Cusco y Valle Sagrado' },
      error: null,
    });
    const selectAfterEq = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select: selectAfterEq });
    const update = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ update });

    const result = await TestBed.inject(TripService).update('trip-1', {
      title: 'Cusco y Valle Sagrado',
    });

    expect(update).toHaveBeenCalledWith({ title: 'Cusco y Valle Sagrado' });
    expect(eq).toHaveBeenCalledWith('id', 'trip-1');
    expect(result.title).toBe('Cusco y Valle Sagrado');
  });

  it('delete removes only the requested trip row', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const deleteRow = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ delete: deleteRow });

    await TestBed.inject(TripService).delete('trip-1');

    expect(deleteRow).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('id', 'trip-1');
  });
});
