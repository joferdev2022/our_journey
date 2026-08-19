const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isTripDateRangeValid(startDate: string, endDate: string): boolean {
  return (
    DATE_ONLY_PATTERN.test(startDate) && DATE_ONLY_PATTERN.test(endDate) && startDate <= endDate
  );
}

export function formatTripDateRange(startDate: string, endDate: string | null): string {
  const start = parseDateOnly(startDate);
  const end = endDate ? parseDateOnly(endDate) : null;
  const format = new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (!end) return format.format(start);
  if (startDate === endDate) return format.format(start);

  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    const monthYear = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(
      end,
    );
    return `${start.getDate()}–${end.getDate()} ${monthYear}`;
  }

  return `${format.format(start)} – ${format.format(end)}`;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
