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
import { getUserNoteLinkId } from '../utils/id';

import {
  getUserHeadTextSelection,
  headTextSelectionToEditorSelection,
} from '../utils/selection';

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

  const prevRevisionSelectionRef = useRef<{
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
    logger?.debug('notComplete');
    return null;
  }

  // No openNote field
  const openNote = userNoteLink.open;
  if (!openNote) {
    logger?.debug('notOpen');
    return null;
  }

  // User is not present
  if (!openNote.active) {
    logger?.debug('notActive');
    return null;
  }

  // Not editing field
  if (!openNote.collabTextEditing) {
    logger?.debug('noField:collabTextEditing');
    return null;
  }

  const headTextSelection = getUserHeadTextSelection(noteId, userId, {
    cache: client.cache,
    service,
    logger,
  });
  if (!headTextSelection) {
    logger?.debug('getUserHeadTextSelection:noHeadTextSelection');
    // Selection for user is not known
    return null;
  }
  if (headTextSelection.revision !== service.headRevision) {
    logger?.debug('headTextSelection:invalidRevision');
    return null;
  }

  const editorSelection = headTextSelectionToEditorSelection(
    headTextSelection.selection,
    {
      service,
      editor,
    }
  );
  if (!editorSelection) {
    logger?.debug('noEditorSelection', headTextSelection);
    // Selection is not inside editor
    return null;
  }

  // When selection moves, reset blink start animation
  const latestRevision = openNote.collabTextEditing.revision;
  const latestSelection = SelectionRange.from(openNote.collabTextEditing.latestSelection);
  const selectionChanged =
    prevRevisionSelectionRef.current &&
    (prevRevisionSelectionRef.current.revision !== latestRevision ||
      !SelectionRange.isEqual(
        latestSelection,
        prevRevisionSelectionRef.current.selection
      ));
  if (selectionChanged) {
    resetBlinkRef.current += 1;
  }
  prevRevisionSelectionRef.current = {
    revision: latestRevision,
    selection: latestSelection,
  };

  // Name for color
  const displayName = userNoteLink.user.profile.displayName;

  return (
    <InputCaret
      aria-label="other user caret"
      data-user={displayName}
      data-index={editorSelection.end}
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
