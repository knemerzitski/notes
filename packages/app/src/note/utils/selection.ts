import { ApolloCache } from '@apollo/client';

import { CollabService } from '../../../../collab/src/client/collab-service';
import { SelectionRange } from '../../../../collab/src/client/selection-range';

import { SimpleText } from '../../../../collab/src/types';
import { Logger } from '../../../../utils/src/logging';
import { Maybe } from '../../../../utils/src/types';

import { gql } from '../../__generated__';
import { Note, User } from '../../__generated__/graphql';
import { getCollabTextRecords } from '../models/record-connection/get';

import { getUserNoteLinkId } from './id';

const GetTmp_UserNoteLinkFragment = gql(`
  fragment GetTmp_UserNoteLinkFragment on UserNoteLink {
    id
    open {
      collabTextEditing {
        revision
        latestSelection {
          start
          end
        }
      }
    }
  }
`);

export interface RevisionSelectionRange {
  selection: SelectionRange;
  revision: number;
}

/**
 * @returns Last known user headText selection
 */
export function getUserHeadTextSelection(
  noteId: Note['id'],
  userId: User['id'],
  ctx: {
    cache: Pick<ApolloCache<unknown>, 'identify' | 'readFragment' | 'readQuery'>;
    service: CollabService;
    logger?: Maybe<Logger>;
  }
): Readonly<RevisionSelectionRange> | undefined {
  const userNoteLink = ctx.cache.readFragment({
    fragment: GetTmp_UserNoteLinkFragment,
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
  let serviceSelection: Readonly<RevisionSelectionRange> = {
    selection: SelectionRange.from(openNote.collabTextEditing.latestSelection),
    revision: openNote.collabTextEditing.revision,
  };

  const initialSelectionRevision = serviceSelection.revision;

  const revisionOffset = ctx.service.headRevision - initialSelectionRevision;

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
        after: initialSelectionRevision,
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
      const isOwnRecord = record.creatorUser.id === userId;
      if (isOwnRecord) {
        // User selection in collabTextEditing field is old, have record that replaces it
        serviceSelection = {
          revision: record.change.revision,
          selection: SelectionRange.from(record.afterSelection),
        };
      } else {
        // Adjust selection to other user record
        serviceSelection = {
          revision: record.change.revision,
          selection: SelectionRange.closestRetainedPosition(
            serviceSelection.selection,
            record.change.changeset
          ),
        };
      }
    }
  }

  // Ensure selection matches headRevision
  if (serviceSelection.revision !== ctx.service.headRevision) {
    ctx.logger?.debug('invalidRevision');
    return;
  }

  // Adjust to submitted and local changes?

  return serviceSelection;
}

/**
 * @returns Transformed editor selection to headText selection
 */
export function editorSelectionToHeadTextSelection(
  editorSelection: SelectionRange,
  {
    service,
    editor,
  }: {
    editor: SimpleText;
    service: CollabService;
  }
): Readonly<RevisionSelectionRange> {
  const localTextSelection = editor.transformToServiceSelection(editorSelection);
  const submittedText = service.client.server.compose(service.client.submitted);
  const undoLocal = service.client.local.inverse(submittedText);
  const undoSubmitted = service.client.submitted.inverse(service.client.server);

  // Current selection applies to localText, transform it for headText
  const headTextSelection = [undoLocal, undoSubmitted].reduce(
    SelectionRange.closestRetainedPosition,
    localTextSelection
  );

  return {
    selection: headTextSelection,
    revision: service.headRevision,
  };
}

export function headTextSelectionToEditorSelection(
  headTextSelection: Readonly<SelectionRange>,
  {
    service,
    editor,
  }: {
    editor: SimpleText;
    service: CollabService;
  }
): SelectionRange | undefined {
  const localTextSelection = [service.client.submitted, service.client.local].reduce(
    SelectionRange.closestRetainedPosition,
    headTextSelection
  );

  const editorSelection = editor.transformToEditorSelection(localTextSelection);

  return editorSelection;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace RevisionSelectionRange {
  export function isEqual(a: RevisionSelectionRange, b: RevisionSelectionRange) {
    if (a.revision !== b.revision) {
      return false;
    }
    return SelectionRange.isEqual(a.selection, b.selection);
  }
}
