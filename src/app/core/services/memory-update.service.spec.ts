import { TestBed } from '@angular/core/testing';

import { MemoryService } from './memory.service';
import { SupabaseService } from './supabase.service';

describe('MemoryService update', () => {
  const from = vi.fn();

  beforeEach(() => {
    from.mockReset();
    TestBed.configureTestingModule({
      providers: [MemoryService, { provide: SupabaseService, useValue: { client: { from } } }],
    });
  });

  it('maps editable camelCase fields to snake_case without changing created_by', async () => {
    const updatedRow = {
      id: 'memory-1',
      title: 'Título actualizado',
      description: 'Nueva descripción',
      memory_date: '2026-08-20T12:00:00.000Z',
      place_name: 'Nuevo lugar',
      latitude: -12.1,
      longitude: -77.1,
      category_id: 'category-2',
      trip_id: 'trip-1',
      importance: 5,
      cover_media_id: 'photo-2',
      created_by: 'original-user',
      created_at: '2026-01-01T12:00:00.000Z',
      updated_at: '2026-08-20T12:10:00.000Z',
    };
    const single = vi.fn().mockResolvedValue({ data: updatedRow, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ update });

    const result = await TestBed.inject(MemoryService).update('memory-1', {
      title: 'Título actualizado',
      description: 'Nueva descripción',
      memoryDate: '2026-08-20T12:00:00.000Z',
      placeName: 'Nuevo lugar',
      latitude: -12.1,
      longitude: -77.1,
      categoryId: 'category-2',
      tripId: 'trip-1',
      importance: 5,
      coverMediaId: 'photo-2',
    });

    expect(update).toHaveBeenCalledWith({
      title: 'Título actualizado',
      description: 'Nueva descripción',
      memory_date: '2026-08-20T12:00:00.000Z',
      place_name: 'Nuevo lugar',
      latitude: -12.1,
      longitude: -77.1,
      category_id: 'category-2',
      trip_id: 'trip-1',
      importance: 5,
      cover_media_id: 'photo-2',
    });
    expect(eq).toHaveBeenCalledWith('id', 'memory-1');
    expect(result).toMatchObject({
      id: 'memory-1',
      coverMediaId: 'photo-2',
      createdBy: 'original-user',
    });
    expect(update.mock.calls[0][0]).not.toHaveProperty('created_by');
  });
});
