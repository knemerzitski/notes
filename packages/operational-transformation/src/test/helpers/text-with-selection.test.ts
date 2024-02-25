import { describe, expect, it } from 'vitest';

import { SelectionDirection, SelectionRange } from '../../editor/selection-range';

import {
  parseTextWithMultipleSelections,
  textWithSelection,
} from './text-with-selection';

describe('text-with-selection', () => {
  describe('textWithSelection', () => {
    it.each([
      ['', 0, 0, '>'],
      ['here:after', 5, 5, 'here:>after'],
      ['start SELECTED end', 6, 14, 'start >SELECTED> end'],
    ])('marks at correct position: ("%s",%s) = %s', (text, start, end, expectedText) => {
      const selection = new SelectionRange({
        getLength() {
          return text.length;
        },
      });
      selection.setSelectionRange(start, end);
      expect(textWithSelection(text, selection)).toStrictEqual(expectedText);
    });

    it('uses provided mapping', () => {
      const text = 'random text';
      const selection = new SelectionRange({
        getLength() {
          return text.length;
        },
      });
      const mapping = {
        [SelectionDirection.Forward]: '[f]',
        [SelectionDirection.Backward]: '[b]',
        [SelectionDirection.None]: '[n]',
      };

      selection.setSelectionRange(1, 4);
      expect(textWithSelection(text, selection, mapping)).toStrictEqual(
        'r[f]and[f]om text'
      );
      selection.direction = SelectionDirection.Backward;
      expect(textWithSelection(text, selection, mapping)).toStrictEqual(
        'r[b]and[b]om text'
      );
      selection.direction = SelectionDirection.None;
      expect(textWithSelection(text, selection, mapping)).toStrictEqual(
        'r[n]and[n]om text'
      );
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
