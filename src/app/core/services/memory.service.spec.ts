import { TestBed } from '@angular/core/testing';

import { ServiceError } from '../models/service-error.model';
import { MemoryService } from './memory.service';
import { SupabaseService } from './supabase.service';

describe('MemoryService', () => {
  const from = vi.fn();

  beforeEach(() => {
    from.mockReset();

    TestBed.configureTestingModule({
      providers: [
        MemoryService,
        {
          provide: SupabaseService,
          useValue: { client: { from } },
        },
      ],
    });
  });

  it('loads and maps Supabase rows to the domain model', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'memory-1',
          title: 'Una tarde',
          description: null,
          memory_date: '2026-02-01T18:00:00.000Z',
          place_name: 'Barranco',
          latitude: -12.1439,
          longitude: -77.0203,
          category_id: 'category-1',
          trip_id: null,
          importance: 4,
          created_by: 'user-1',
          created_at: '2026-02-01T18:10:00.000Z',
          updated_at: '2026-02-01T18:10:00.000Z',
        },
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ order });
    from.mockReturnValue({ select });

    const service = TestBed.inject(MemoryService);
    const memories = await service.getAll();

    expect(from).toHaveBeenCalledWith('memories');
    expect(order).toHaveBeenCalledWith('memory_date', { ascending: false });
    expect(memories[0]).toMatchObject({
      id: 'memory-1',
      memoryDate: '2026-02-01T18:00:00.000Z',
      placeName: 'Barranco',
      categoryId: 'category-1',
      importance: 4,
      createdBy: 'user-1',
    });
  });

  it('maps a creation payload to snake_case and returns the inserted memory', async () => {
    const insertedRow = {
      id: 'memory-2',
      title: 'Primera cita',
      description: 'Una tarde especial',
      memory_date: '2026-08-19T12:00:00.000Z',
      place_name: 'Lima',
      latitude: -12.0464,
      longitude: -77.0428,
      category_id: 'category-1',
      trip_id: null,
      importance: 5,
      created_by: 'user-1',
      created_at: '2026-08-19T12:10:00.000Z',
      updated_at: '2026-08-19T12:10:00.000Z',
    };
    const single = vi.fn().mockResolvedValue({ data: insertedRow, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    from.mockReturnValue({ insert });

    const service = TestBed.inject(MemoryService);
    const result = await service.create({
      title: 'Primera cita',
      description: 'Una tarde especial',
      memoryDate: '2026-08-19T12:00:00.000Z',
      placeName: 'Lima',
      latitude: -12.0464,
      longitude: -77.0428,
      categoryId: 'category-1',
      tripId: null,
      importance: 5,
    });

    expect(insert).toHaveBeenCalledWith({
      title: 'Primera cita',
      description: 'Una tarde especial',
      memory_date: '2026-08-19T12:00:00.000Z',
      place_name: 'Lima',
      latitude: -12.0464,
      longitude: -77.0428,
      category_id: 'category-1',
      trip_id: null,
      importance: 5,
    });
    expect(result).toMatchObject({
      id: 'memory-2',
      createdBy: 'user-1',
      memoryDate: '2026-08-19T12:00:00.000Z',
    });
  });

  it('turns database failures into a consistent service error', async () => {
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'internal detail' },
    });
    from.mockReturnValue({
      select: vi.fn().mockReturnValue({ order }),
    });

    const service = TestBed.inject(MemoryService);

    await expect(service.getAll()).rejects.toBeInstanceOf(ServiceError);
    await expect(service.getAll()).rejects.toMatchObject({
      code: 'data-access',
      message: 'No se pudieron cargar los recuerdos.',
    });
  });
  it('loads one trip without querying memories from other trips', async () => {
    const secondOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'memory-trip-1',
          title: 'Machu Picchu',
          description: null,
          memory_date: '2025-06-14T12:00:00.000Z',
          place_name: 'Cusco',
          latitude: -13.1631,
          longitude: -72.545,
          category_id: 'category-1',
          trip_id: 'trip-1',
          importance: 5,
          cover_media_id: null,
          created_by: 'user-1',
          created_at: '2025-06-14T13:00:00.000Z',
          updated_at: '2025-06-14T13:00:00.000Z',
        },
      ],
      error: null,
    });
    const firstOrder = vi.fn().mockReturnValue({ order: secondOrder });
    const eq = vi.fn().mockReturnValue({ order: firstOrder });
    const select = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ select });

    const memories = await TestBed.inject(MemoryService).getByTripId('trip-1');

    expect(eq).toHaveBeenCalledWith('trip_id', 'trip-1');
    expect(firstOrder).toHaveBeenCalledWith('memory_date', { ascending: true });
    expect(secondOrder).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(memories[0]).toMatchObject({ id: 'memory-trip-1', tripId: 'trip-1' });
  });
});
