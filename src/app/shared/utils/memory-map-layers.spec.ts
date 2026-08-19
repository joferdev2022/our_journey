import { getMemoryPointRadius } from './memory-map-layers';

describe('getMemoryPointRadius', () => {
  it('increases marker radius moderately with importance', () => {
    expect([1, 2, 3, 4, 5].map(getMemoryPointRadius)).toEqual([4.5, 5.5, 6.5, 7.5, 8.5]);
  });

  it('clamps importance outside the supported range', () => {
    expect(getMemoryPointRadius(-10)).toBe(4.5);
    expect(getMemoryPointRadius(99)).toBe(8.5);
  });
});
