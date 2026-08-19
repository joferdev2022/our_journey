import type { Memory } from '../../core/models/memory.model';

export interface MemoryMapNavigation {
  commands: ['/journey'];
  queryParams: { memory: string };
}

export function createMemoryMapNavigation(memoryId: string): MemoryMapNavigation {
  return { commands: ['/journey'], queryParams: { memory: memoryId } };
}

export function resolveRequestedMemory(
  memories: readonly Memory[],
  requestedId: string | null,
): Memory | null {
  if (!requestedId) return null;
  return memories.find((memory) => memory.id === requestedId) ?? null;
}
