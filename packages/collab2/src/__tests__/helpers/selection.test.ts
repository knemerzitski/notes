import { describe, expect, it } from 'vitest';

import { textWithSelection, textWithSelections } from './selection';
import { Selection } from '../../common/selection';

describe('textWithSelection', () => {
  it.each([
    ['', 0, 0, '│'],
    ['here:after', 5, 5, 'here:│after'],
    ['start SELECTED end', 6, 14, 'start │SELECTED│ end'],
  ])('marks at correct position: ("%s",%s,%s) = %s', (text, start, end, expectedText) => {
    expect(textWithSelection(text, Selection.create(start, end))).toStrictEqual(
      expectedText
    );
  });
});

describe('textsWithSelectionMerged', () => {
  it('handles single selection', () => {
    expect(
      textWithSelections('foo bar baz', [
        {
          label: 'A',
          selection: Selection.create(4, 7),
        },
      ])
    ).toStrictEqual('foo │A▸bar◂A│ baz');
  });

  it('handles multiple selections', () => {
    expect(
      textWithSelections('foo bar baz', [
        {
          label: 'A',
          selection: Selection.create(4, 7),
        },
        {
          label: 'B',
          selection: Selection.create(1, 9),
        },
      ])
    ).toStrictEqual('f│B▸oo │A▸bar◂A│ b◂B│az');
  });
});
