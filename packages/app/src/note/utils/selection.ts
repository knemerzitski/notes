import { ApolloCache } from '@apollo/client';


import { Logger } from '../../../../utils/src/logging';
import { Maybe } from '../../../../utils/src/types';

import { Changeset, CollabService, Selection } from '../../../../collab2/src';

import { gql } from '../../__generated__';
import { Note, User } from '../../__generated__/graphql';
import { getCollabTextRecords } from '../models/record-connection/get';

import { NoteTextFieldEditor } from '../types';

import { getUserNoteLinkId } from './id';

const CollabTextEditingSelection_UserNoteLinkFragment = gql(`
  fragment CollabTextEditingSelection_UserNoteLinkFragment on UserNoteLink {
    id
    open {
      collabTextEditing {
        revision
        latestSelection
      }
    }
  }
`);

interface SelectionRecord {
  readonly revision: number;
  readonly selection: Selection;
}

/**
 * @returns Last known user headText selection
 */
export function getUserHeadTextSelection(
  noteId: Note['id'],
  userId: User['id'],
  serverRevision: number,
  ctx: {
    cache: Pick<ApolloCache<unknown>, 'identify' | 'readFragment' | 'readQuery'>;
    logger?: Maybe<Logger>;
  }
): SelectionRecord | undefined {
  const userNoteLink = ctx.cache.readFragment({
    fragment: CollabTextEditingSelection_UserNoteLinkFragment,
    id: ctx.cache.identify({
      __typename: 'UserNoteLink',
      id: getUserNoteLinkId(noteId, userId),
    }),
  });

  if (!userNoteLink) {
    ctx.logger?.debug('noUserNoteLink');
    return;
  }

  // No openNote field
  const openNote = userNoteLink.open;
  if (!openNote) {
    ctx.logger?.debug('notOpen');
    return;
  }

  // Not editing field
  if (!openNote.collabTextEditing) {
    ctx.logger?.debug('noField:collabTextEditing');
    return;
  }

  // Last known caret position and revision
  let selectionRecord: Readonly<SelectionRecord> = {
    selection: openNote.collabTextEditing.latestSelection,
    revision: openNote.collabTextEditing.revision,
  };

  const initialRevision = selectionRecord.revision;

  const revisionOffset = serverRevision - initialRevision;

  if (revisionOffset < 0) {
    ctx.logger?.debug('selectionInFuture');
    // Selection is in the future, cannot transform
    return;
  }

  if (revisionOffset >= 1) {
    const needRecordsCount = revisionOffset;
    const records = getCollabTextRecords(
      noteId,
      {
        after: initialRevision,
        first: needRecordsCount,
      },
      ctx.cache
    );
    if (!records) {
      ctx.logger?.debug('missingRecords');
      // Missing records, can't transform selection to match current revision
      return;
    }

    for (const record of records) {
      const isOwnRecord = record.author.id === userId;
      if (isOwnRecord) {
        // User selection in collabTextEditing field is old, have record that replaces it
        selectionRecord = {
          revision: record.revision,
          selection: record.selection,
        };
      } else {
        // Adjust selection to other user record
        selectionRecord = {
          revision: record.revision,
          selection: selectionRecord.selection.follow(record.changeset, true),
        };
      }
    }
  }

  // Ensure selection matches serverRevision
  if (selectionRecord.revision !== serverRevision) {
    ctx.logger?.debug('invalidRevision');
    return;
  }

  // Adjust to submitted and local changes?

  return selectionRecord;
}

/**
 * @returns Transformed editor selection to headText selection
 */
export function editorSelectionToHeadTextSelection(
  localTyperSelection: Selection,
  {
    service,
    editor,
  }: {
    editor: NoteTextFieldEditor;
    service: CollabService;
  }
): SelectionRecord | undefined {
  const localServiceSelection = editor.toServiceSelection(localTyperSelection);
  if (!localServiceSelection) {
    return;
  }

  const undoLocal = Changeset.inverse(
    service.localChanges,
    Changeset.compose(service.serverText, service.submittedChanges)
  );
  const undoSubmitted = Changeset.inverse(service.submittedChanges, service.serverText);

  // Current selection applies to localChanges, transform it to serverText
  const serverSelection = [undoLocal, undoSubmitted].reduce(
    // TODO is true/left correct?
    (a, b) => a.follow(b, true),
    localServiceSelection
  );

  return {
    revision: service.serverRevision,
    selection: serverSelection,
  };
}

export function headTextSelectionToEditorSelection(
  serverServiceSelection: Selection,
  {
    service,
    editor,
  }: {
    editor: NoteTextFieldEditor;
    service: CollabService;
  }
): Selection | undefined {
  const localServiceSelection = [service.submittedChanges, service.localChanges].reduce(
    // TODO is true/left correct?
    (a, b) => a.follow(b, true),
    serverServiceSelection
  );

  const localTyperSelection = editor.toTyperSelection(localServiceSelection);

  return localTyperSelection;
}

export function isSelectionRecordEqual(a: SelectionRecord, b: SelectionRecord) {
  if (a.revision !== b.revision) {
    return false;
  }

  return a.selection.isEqual(b.selection);
}
