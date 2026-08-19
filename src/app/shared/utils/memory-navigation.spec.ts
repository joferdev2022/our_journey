import type { Memory } from '../../core/models/memory.model';
import { createMemoryMapNavigation, resolveRequestedMemory } from './memory-navigation';

const memory = { id: 'memory-1' } as Memory;

describe('memory map navigation', () => {
  it('builds /journey?memory=id from a memory detail', () => {
    expect(createMemoryMapNavigation('memory-1')).toEqual({
      commands: ['/journey'],
      queryParams: { memory: 'memory-1' },
    });
  });

  it('lets Journey resolve only an existing requested memory', () => {
    expect(resolveRequestedMemory([memory], 'memory-1')).toBe(memory);
    expect(resolveRequestedMemory([memory], 'missing')).toBeNull();
    expect(resolveRequestedMemory([memory], null)).toBeNull();
  });
});
