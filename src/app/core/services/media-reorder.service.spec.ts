import { TestBed } from '@angular/core/testing';

import { MediaService } from './media.service';
import { SupabaseService } from './supabase.service';

describe('MediaService atomic reorder', () => {
  const rpc = vi.fn();

  beforeEach(() => {
    rpc.mockReset();
    TestBed.configureTestingModule({
      providers: [MediaService, { provide: SupabaseService, useValue: { client: { rpc } } }],
    });
  });

  it('sends the complete ordered list to the atomic reorder RPC', async () => {
    rpc.mockResolvedValue({ error: null });

    await TestBed.inject(MediaService).updateSortOrders('memory-1', [
      'photo-3',
      'photo-1',
      'photo-2',
    ]);

    expect(rpc).toHaveBeenCalledWith('reorder_memory_media', {
      p_memory_id: 'memory-1',
      p_ordered_media_ids: ['photo-3', 'photo-1', 'photo-2'],
    });
  });
});
