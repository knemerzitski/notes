import { castDraft, WritableDraft } from 'immer';

import { Changeset } from '../../../common/changeset';
import { INSERT_BIAS } from '../../../common/utils/insert-bias';
import { Properties, ServiceServerRecord, State } from '../types';
import { asComputed } from '../utils/as-computed';
import { getLastHistoryRecord } from '../utils/history-record';

export function processExternalTyping(
  externalRecord: Pick<
    ServiceServerRecord,
    'changeset' | 'selection' | 'selectionInverse' | 'revision' | 'authorId'
  >,
  props: Pick<Properties, 'isExternalTypingHistory'>
) {
  return (draft: WritableDraft<State>) => {
    const computedDraft = asComputed(draft);

    const serverText = draft.serverText;
    const localChanges = computedDraft.localChanges;
    const submittedChanges = computedDraft.submittedChanges;

    const externalChanges = externalRecord.changeset;
    const externalAdjustedForSubmitted = Changeset.follow(
      externalChanges,
      submittedChanges,
      !INSERT_BIAS
    );

    const newServerText = Changeset.compose(serverText, externalChanges);
    const newSubmittedChanges = Changeset.follow(
      submittedChanges,
      externalChanges,
      INSERT_BIAS
    );
    const newLocalChanges = Changeset.follow(
      localChanges,
      externalAdjustedForSubmitted,
      INSERT_BIAS
    );
    const viewComposableChange = Changeset.follow(
      externalAdjustedForSubmitted,
      localChanges,
      !INSERT_BIAS
    );
    const newViewText = castDraft(
      Changeset.compose(draft.viewText, viewComposableChange)
    );

    draft.serverRevision = externalRecord.revision;
    draft.serverText = castDraft(newServerText);

    if (draft.submittedRecord) {
      draft.submittedRecord.changeset = castDraft(newSubmittedChanges);
      draft.submittedRecord.targetRevision = externalRecord.revision;
    }

    if (draft.localRecord) {
      // TODO fix this?
      const localInverse = Changeset.inverse(localChanges, draft.viewText);
      draft.localRecord = {
        changeset: castDraft(newLocalChanges),
        selection: draft.localRecord.selection.follow(viewComposableChange, true),
        selectionInverse: draft.localRecord.selectionInverse.follow(
          Changeset.follow(viewComposableChange, localInverse, true),
          true
        ),
      };
    }

    const viewComposableInverse = Changeset.inverse(viewComposableChange, draft.viewText);

    if (props.isExternalTypingHistory(externalRecord)) {
      // A * X * Y
      //   * B
      // A * B * X' * Y'
      // X' = f(X, B)
      // Y' = f(Y, f(B, X))
      // A * B * f(X, B) * f(Y, f(B, X))
      //   * X
      // B * X' * Y'
      //   * Bi
      // B * Bi * X'' * Y''
      // X'' = f(X', Bi)
      // Y'' = f(Y', f(Bi, X'))
      // A * B * Bi * f(X', Bi) * f(Y', f(Bi, X'))
      //       * X'
      // A = serverText
      // B = externalChanges
      // Bi = externalInverse
      // X' = newSubmittedChanges
      // Y'= newLocalChanges
      const externalInverse = Changeset.inverse(externalChanges, serverText);
      const inverseSubmitted = Changeset.follow(
        newSubmittedChanges,
        externalInverse,
        INSERT_BIAS
      );
      const inverseLocal = Changeset.follow(
        newLocalChanges,
        Changeset.follow(externalInverse, newSubmittedChanges, INSERT_BIAS),
        !INSERT_BIAS
      );

      draft.undoStack.push({
        type: 'view',
        viewIndex: draft.viewChanges.length + draft.viewIndexOffset,
        externalChanges: [],
        changeset: castDraft(viewComposableChange),
        inverse: castDraft(viewComposableInverse),
        // TODO is selection bias correct?
        selectionInverse: externalRecord.selectionInverse
          .follow(inverseSubmitted, true)
          .follow(inverseLocal, true),
        selection: externalRecord.selection
          .follow(newSubmittedChanges, true)
          .follow(newLocalChanges, true),
      });
    } else {
      // Add external change previous undo only if its not part of history
      const lastUndoRecord = getLastHistoryRecord(draft.undoStack, 'view');
      if (lastUndoRecord) {
        lastUndoRecord.externalChanges.push(castDraft(viewComposableChange));
      }
    }

    // Undo and redo records must know that an external change is applied to view to adjust
    const lastRedoRecord = getLastHistoryRecord(draft.redoStack, 'view');
    if (lastRedoRecord) {
      lastRedoRecord.externalChanges.push(castDraft(viewComposableChange));
    }

    const nextViewRevision = draft.viewRevision + 1;

    draft.viewChanges.push({
      viewRevision: nextViewRevision,
      changeset: castDraft(viewComposableChange),
      inverse: castDraft(viewComposableInverse),
    });
    draft.viewText = newViewText;

    draft.tmpRecipeResults.externalTypings.push({
      viewRevision: nextViewRevision,
      changeset: castDraft(viewComposableChange),
    });

    draft.viewRevision = nextViewRevision;
  };
}
