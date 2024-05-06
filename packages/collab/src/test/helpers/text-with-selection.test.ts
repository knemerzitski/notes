import { describe, expect, it } from 'vitest';

import {
  parseTextWithMultipleSelections,
  textWithSelection,
} from './text-with-selection';

describe('text-with-selection', () => {
  describe('textWithSelection', () => {
    it.each([
      ['', 0, 0, '>'],
      ['here:after', 5, 5, 'here:>after'],
      ['start SELECTED end', 6, 14, 'start >SELECTED< end'],
    ])('marks at correct position: ("%s",%s) = %s', (text, start, end, expectedText) => {
      expect(textWithSelection(text, { start, end })).toStrictEqual(expectedText);
    });
  });

  describe('parseTextWithMultipleSelections', () => {
    it('parses two selections overlapping', () => {
      expect(
        parseTextWithMultipleSelections('both [1<]typing[0>] at the [1<]same time[0>]')
      ).toStrictEqual({
        rawText: 'both typing at the same time',
        textWithSelection: [
          'both typing> at the same time>',
          'both <typing at the <same time',
        ],
      });
    });
  });
});
