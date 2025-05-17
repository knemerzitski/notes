import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import { Changeset } from '../../../common/changeset';
import { Selection } from '../../../common/selection';
import { ViewHistoryServiceRecord } from '../types';
import { emptyState } from '../utils/empty-state';

import { history_merge } from './add-local-typing';

describe('history_merge', () => {
  it('calculates correct inverse when prevRecord.inverse is empty', () => {
    const nextState = produce(
      {
        ...emptyState,
        undoStack: [
          {
            type: 'view',
            viewIndex: 0,
            externalChanges: [],
            changeset: Changeset.EMPTY,
            inverse: Changeset.EMPTY,
            selectionInverse: Selection.ZERO,
            selection: Selection.ZERO,
          } satisfies ViewHistoryServiceRecord,
        ],
      },
      (draft) => {
        history_merge(
          {
            history: 'merge',
            changeset: Changeset.fromText('abc'),
            selectionInverse: Selection.create(0),
            selection: Selection.create(3),
          },
          draft
        );
      }
    );

    expect(nextState.undoStack).toStrictEqual([
      {
        type: 'view',
        viewIndex: 0,
        externalChanges: [],
        changeset: Changeset.fromText('abc'),
        inverse: Changeset.create(3, []),
        selectionInverse: Selection.ZERO,
        selection: Selection.create(3),
      },
    ]);
  });
});
