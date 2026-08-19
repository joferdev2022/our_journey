const memoryDateFormatter = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatMemoryDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : memoryDateFormatter.format(date);
}
