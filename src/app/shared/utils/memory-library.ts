import type { Memory } from '../../core/models/memory.model';

export type MemorySortOrder = 'newest' | 'oldest';

export interface MemoryLibraryFilters {
  query: string;
  categoryId: string | null;
  year: number | null;
  sortOrder: MemorySortOrder;
}

export interface MemoryMonthGroup {
  key: string;
  month: number;
  label: string;
  memories: Memory[];
}

export interface MemoryYearGroup {
  year: number;
  months: MemoryMonthGroup[];
}

const monthFormatter = new Intl.DateTimeFormat('es-PE', {
  month: 'long',
  timeZone: 'UTC',
});

export function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? '')
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function filterAndSortMemories(
  memories: readonly Memory[],
  filters: MemoryLibraryFilters,
): Memory[] {
  const terms = normalizeSearchText(filters.query).split(/\s+/).filter(Boolean);

  return memories
    .filter((memory) => {
      if (filters.categoryId && memory.categoryId !== filters.categoryId) return false;
      if (filters.year !== null && memoryYear(memory) !== filters.year) return false;

      if (terms.length > 0) {
        const searchable = normalizeSearchText(
          [memory.title, memory.placeName, memory.description].filter(Boolean).join(' '),
        );
        if (!terms.every((term) => searchable.includes(term))) return false;
      }

      return true;
    })
    .sort(memoryComparator(filters.sortOrder));
}

export function getMemoryYears(memories: readonly Memory[]): number[] {
  return [...new Set(memories.map(memoryYear).filter((year) => year !== null))].sort(
    (left, right) => right - left,
  );
}

export function groupMemoriesByYearMonth(
  memories: readonly Memory[],
  sortOrder: MemorySortOrder,
): MemoryYearGroup[] {
  const groups = new Map<number, Map<number, Memory[]>>();

  for (const memory of [...memories].sort(memoryComparator(sortOrder))) {
    const date = parseMemoryDate(memory.memoryDate);
    if (!date) continue;
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const months = groups.get(year) ?? new Map<number, Memory[]>();
    const monthMemories = months.get(month) ?? [];
    monthMemories.push(memory);
    months.set(month, monthMemories);
    groups.set(year, months);
  }

  return [...groups.entries()].map(([year, months]) => ({
    year,
    months: [...months.entries()].map(([month, monthMemories]) => ({
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      month,
      label: capitalize(monthFormatter.format(new Date(Date.UTC(year, month, 1)))),
      memories: monthMemories,
    })),
  }));
}

function memoryComparator(sortOrder: MemorySortOrder): (left: Memory, right: Memory) => number {
  const direction = sortOrder === 'newest' ? -1 : 1;

  return (left, right) =>
    direction *
    (left.memoryDate.localeCompare(right.memoryDate) ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id));
}

function memoryYear(memory: Memory): number | null {
  return parseMemoryDate(memory.memoryDate)?.getUTCFullYear() ?? null;
}

function parseMemoryDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function capitalize(value: string): string {
  return value.length > 0 ? value[0].toLocaleUpperCase('es') + value.slice(1) : value;
}
