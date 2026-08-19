import { isTripDateRangeValid } from './trip-date';

describe('isTripDateRangeValid', () => {
  it('accepts a start date before the end date', () => {
    expect(isTripDateRangeValid('2025-06-12', '2025-06-18')).toBe(true);
  });

  it('accepts the same start and end date', () => {
    expect(isTripDateRangeValid('2025-06-12', '2025-06-12')).toBe(true);
  });

  it('rejects a start date after the end date', () => {
    expect(isTripDateRangeValid('2025-06-18', '2025-06-12')).toBe(false);
  });
});
