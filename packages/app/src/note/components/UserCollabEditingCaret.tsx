import { useApolloClient, useFragment } from '@apollo/client';

import { RefObject, useState, useRef, useEffect } from 'react';

import { SelectionRange } from '~collab/client/selection-range';

import { gql } from '../../__generated__';
import { useUserId } from '../../user/context/user-id';
import { useLogger } from '../../utils/context/logger';
import { stringToColor } from '../../utils/string-to-color';
import { useNoteId } from '../context/note-id';
import { useCollabService } from '../hooks/useCollabService';
import { useNoteTextFieldEditor } from '../hooks/useNoteTextFieldEditor';
import { getCollabTextRecords } from '../models/record-connection/get';
import { getUserNoteLinkId } from '../utils/id';


import { InputCaret } from './InputCaret';


const UserCollabEditingCaret_UserNoteLinkFragment = gql(`
  fragment UserCollabEditingCaret_UserNoteLinkFragment on UserNoteLink {
    id
    user {
      id
      profile {
        displayName
      }
    }
    open {
      active @client
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

export function UserCollabEditingCaret({ inputRef }: { inputRef: RefObject<unknown> }) {
  const logger = useLogger('UserCollabEditingCaret');
  const service = useCollabService();
  const client = useApolloClient();
  const editor = useNoteTextFieldEditor();

  const [_rerenderCounter, setRerenderCounter] = useState(0);
  const resetBlinkRef = useRef(-1);

  const prevCollabEditingRef = useRef<{
    revision: number;
    selection: SelectionRange;
  }>();

  useEffect(() => {
    return service.eventBus.on(['appliedTypingOperation', 'headRevisionChanged'], () => {
      setRerenderCounter((prev) => prev + 1);
    });
  }, [service]);

  const noteId = useNoteId();
  const userId = useUserId();
  const { complete, data: userNoteLink } = useFragment({
    fragment: UserCollabEditingCaret_UserNoteLinkFragment,
    from: {
      __typename: 'UserNoteLink',
      id: getUserNoteLinkId(noteId, userId),
    },
  });

  if (!complete) {
    return;
  }

  // No openNote field
  const openNote = userNoteLink.open;
  if (!openNote) {
    return null;
  }

  // User is not present
  if (!openNote.active) {
    return null;
  }

  // Not editing field
  if (!openNote.collabTextEditing) {
    return null;
  }

  // Caret position and revision
  const { latestSelection: probablyPastSelection, revision: selectionRevision } =
    openNote.collabTextEditing;

  // Name for color
  const displayName = userNoteLink.user.profile.displayName;

  const revisionOffset = service.headRevision - selectionRevision;

  if (revisionOffset < 0) {
    // Selection is in the future, cannot transform
    return null;
  }

  // Get required records for transformation from cache
  const transformChangesets = [];
  if (revisionOffset >= 1) {
    const needRecordsCount = revisionOffset;
    const records = getCollabTextRecords(
      noteId,
      {
        after: selectionRevision,
        first: needRecordsCount,
      },
      client
    );
    if (!records) {
      // Missing records, can't transform selection to match current view
      return null;
    }
    transformChangesets.push(...records.map((record) => record.change.changeset));
  }

  if (revisionOffset >= 0) {
    transformChangesets.push(service.client.submitted, service.client.local);
  }

  // Transform selection to match local view
  const initialSelection = SelectionRange.from(probablyPastSelection);

  // When selection moves, reset blink start animation
  const selectionChanged =
    prevCollabEditingRef.current &&
    (prevCollabEditingRef.current.revision !== selectionRevision ||
      !SelectionRange.isEqual(initialSelection, prevCollabEditingRef.current.selection));
  if (selectionChanged) {
    resetBlinkRef.current += 1;
  }
  prevCollabEditingRef.current = {
    revision: selectionRevision,
    selection: initialSelection,
  };

  const currentServiceSelection = transformChangesets.reduce(
    SelectionRange.closestRetainedPosition,
    initialSelection
  );

  if (logger) {
    logger.info('transformToEditorSelection:before', {
      editorValue: editor.value,
      input: {
        revision: selectionRevision,
        selection: initialSelection,
      },
      transformChangesets: transformChangesets.map((c) => c.toString()),
      transformedSelection: currentServiceSelection,
    });
  }

  // Transform selection to match editor
  const editorSelection = editor.transformToEditorSelection(currentServiceSelection);

  if (!editorSelection) {
    // Selection is not inside editor
    return null;
  }

  return (
    <InputCaret
      aria-label={`caret-${displayName}`}
      caret={{
        inputRef,
        selection: editorSelection.end,
        resetBlink: resetBlinkRef.current,
        color: stringToColor(displayName),
        heightPercentage: 0.85,
        leftOffset: -0.5,
        topOffset: -1.5,
      }}
    />
  );
}
