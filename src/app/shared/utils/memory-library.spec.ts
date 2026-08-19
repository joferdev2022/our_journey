import type { Memory } from '../../core/models/memory.model';
import {
  type MemoryLibraryFilters,
  filterAndSortMemories,
  groupMemoriesByYearMonth,
  normalizeSearchText,
} from './memory-library';

function memory(
  id: string,
  title: string,
  memoryDate: string,
  options: Partial<Memory> = {},
): Memory {
  return {
    id,
    title,
    description: null,
    memoryDate,
    placeName: null,
    latitude: -12,
    longitude: -77,
    categoryId: 'category-1',
    tripId: null,
    importance: 3,
    coverMediaId: null,
    createdBy: 'user-1',
    createdAt: memoryDate,
    updatedAt: memoryDate,
    ...options,
  };
}

const defaultFilters: MemoryLibraryFilters = {
  query: '',
  categoryId: null,
  year: null,
  sortOrder: 'newest',
};

const memories = [
  memory('one', 'Nuestra primera cita', '2024-05-17T12:00:00Z', {
    placeName: 'Plaza de Armas',
    description: 'Una tarde inolvidable.',
    categoryId: 'date',
  }),
  memory('two', 'Catarata escondida', '2025-08-10T12:00:00Z', {
    placeName: 'Tingo María',
    description: 'Aventura entre árboles.',
    categoryId: 'adventure',
  }),
  memory('three', 'Cena especial', '2025-07-01T12:00:00Z', {
    placeName: 'Cusco',
    description: 'Probamos comida local.',
    categoryId: 'food',
  }),
];

function ids(filters: Partial<MemoryLibraryFilters>): string[] {
  return filterAndSortMemories(memories, { ...defaultFilters, ...filters }).map((item) => item.id);
}

describe('memory library filters', () => {
  it('normalizes case and diacritics', () => {
    expect(normalizeSearchText('  Árbol CUSCO  ')).toBe('arbol cusco');
  });

  it('searches by title', () => {
    expect(ids({ query: 'primera' })).toEqual(['one']);
  });

  it('searches by place', () => {
    expect(ids({ query: 'plaza de armas' })).toEqual(['one']);
  });

  it('searches by description', () => {
    expect(ids({ query: 'inolvidable' })).toEqual(['one']);
  });

  it('ignores uppercase differences', () => {
    expect(ids({ query: 'CATARATA' })).toEqual(['two']);
  });

  it('ignores accent differences', () => {
    expect(ids({ query: 'tingo maria arboles' })).toEqual(['two']);
  });

  it('filters by category', () => {
    expect(ids({ categoryId: 'food' })).toEqual(['three']);
  });

  it('filters by year', () => {
    expect(ids({ year: 2024 })).toEqual(['one']);
  });

  it('combines query, category and year', () => {
    expect(ids({ query: 'cusco local', categoryId: 'food', year: 2025 })).toEqual(['three']);
    expect(ids({ query: 'cusco', categoryId: 'adventure', year: 2025 })).toEqual([]);
  });
});

describe('memory year and month grouping', () => {
  const groupedMemories = [
    memory('august-2026', 'Agosto', '2026-08-10T12:00:00Z'),
    memory('july-2026', 'Julio', '2026-07-10T12:00:00Z'),
    memory('december-2025', 'Diciembre', '2025-12-10T12:00:00Z'),
  ];

  it('groups multiple years and months from newest to oldest', () => {
    const groups = groupMemoriesByYearMonth(groupedMemories, 'newest');

    expect(groups.map((group) => group.year)).toEqual([2026, 2025]);
    expect(groups[0].months.map((group) => group.label)).toEqual(['Agosto', 'Julio']);
    expect(groups[1].months[0].memories[0].id).toBe('december-2025');
  });

  it('reverses years and months coherently for oldest first', () => {
    const groups = groupMemoriesByYearMonth(groupedMemories, 'oldest');

    expect(groups.map((group) => group.year)).toEqual([2025, 2026]);
    expect(groups[1].months.map((group) => group.label)).toEqual(['Julio', 'Agosto']);
  });
});
