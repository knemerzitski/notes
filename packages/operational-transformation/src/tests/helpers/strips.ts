import { mock } from 'vitest-mock-extended';

import Strip from '../../strip';
import { Strips } from '../../strips';

/**
 * Temporary mocked strip that uses string to validate indices
 */
type MockStrip = Strip & { value: string };

export function createMockStrip(str: string): MockStrip {
  return mock<MockStrip>({
    value: str,
    length: str.length,
    slice(start, end) {
      return createMockStrip(str.slice(start, end));
    },
  });
}

export function createMockStrips(strs: string[]): Strips {
  return new Strips(strs.map((str) => createMockStrip(str)));
}

export function getMockStripValues(strips: Strips) {
  return strips.values.map((strip) => getMockStripValue(strip));
}

export function getMockStripValue(strip: Strip | undefined) {
  return (strip as MockStrip | undefined)?.value;
}
