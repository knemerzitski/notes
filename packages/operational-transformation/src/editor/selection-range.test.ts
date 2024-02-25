import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SelectionRange } from './selection-range';

describe('SelectionRange', () => {
  let length = 0;
  let range: SelectionRange;

  beforeEach(() => {
    length = 20;
    range = new SelectionRange({
      getLength() {
        return length;
      },
    });
  });

  describe('setSelectionRange', () => {
    it.each([
      [0, 0, 0, 0],
      [-1, 0, 0, 0],
      [-10, -20, 20, 20],
      [0, -1, 0, 20],
      [-1, 8, 8, 8],
      [4, -1, 4, 20],
      [16, 4, 4, 4],
      [5, 25, 5, 20],
      [25, 25, 20, 20],
    ])('setSelectionRange(%s,%s) = (%s,%s)', (start, end, expectedStart, expectedEnd) => {
      range.setSelectionRange(start, end);
      expect(range.start).toStrictEqual(expectedStart);
      expect(range.end).toStrictEqual(expectedEnd);
    });
  });

  describe('set start', () => {
    it('calls setSelectionRange with start and maximum of existing and and start', () => {
      range.setSelectionRange(4, 7);

      const spySetSelectionRange = vi.spyOn(range, 'setSelectionRange');

      range.start = 5;
      expect(spySetSelectionRange).toHaveBeenCalledWith(5, 7);

      range.start = -2;
      expect(spySetSelectionRange).toHaveBeenCalledWith(-2, 7);

      range.start = 12;
      expect(spySetSelectionRange).toHaveBeenCalledWith(12, 12);
    });
  });

  describe('set end', () => {
    it('calls setSelectionRange with end and existing start value', () => {
      range.setSelectionRange(4, 7);

      const spySetSelectionRange = vi.spyOn(range, 'setSelectionRange');

      range.end = 9;
      expect(spySetSelectionRange).toHaveBeenCalledWith(4, 9);

      range.end = -6;
      expect(spySetSelectionRange).toHaveBeenCalledWith(4, -6);
    });
  });

  describe('selectAll', () => {
    it('calls selectionRange with 0 and length', () => {
      const spySetSelectionRange = vi.spyOn(range, 'setSelectionRange');

      range.selectAll();
      expect(spySetSelectionRange).toHaveBeenCalledWith(0, length);

      length = 5;
      range.selectAll();
      expect(spySetSelectionRange).toHaveBeenCalledWith(0, length);
    });
  });

  describe('setPosition', () => {
    it('calls selectionRange with specified argument', () => {
      const spySetSelectionRange = vi.spyOn(range, 'setSelectionRange');
      range.setPosition(33);
      expect(spySetSelectionRange).toHaveBeenCalledWith(33, 33);
      range.setPosition(-44);
      expect(spySetSelectionRange).toHaveBeenCalledWith(-44, -44);
    });
  });
});
