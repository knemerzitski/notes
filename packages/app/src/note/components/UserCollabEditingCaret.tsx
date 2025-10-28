import { useApolloClient, useFragment } from '@apollo/client';

import { RefObject, useState, useRef, useEffect, useMemo } from 'react';

import { Selection } from '../../../../collab/src';

import { gql } from '../../__generated__';
import { User } from '../../__generated__/graphql';
import { useLogger } from '../../utils/context/logger';
import { stringToColor } from '../../utils/string-to-color';
import { useNoteId } from '../context/note-id';
import { useCollabService } from '../hooks/useCollabService';
import { useNoteTextFieldEditor } from '../hooks/useNoteTextFieldEditor';
import { getUserNoteLinkId } from '../utils/id';

import { SelectionTransformer } from '../utils/selection-transformer';

import { InputCaret } from './InputCaret';

const UserCollabEditingCaret_UserNoteLinkFragment = gql(`
  fragment UserCollabEditingCaret_UserNoteLinkFragment on UserNoteLink {
    id
    user {
      id
      profile {
        displayName
        avatarColor
      }
    }
    open {
      active @client
      collabTextEditing {
        revision
        latestSelection
      }
    }
  }
`);

export function UserCollabEditingCaret({
  inputRef,
  userId,
}: {
  inputRef: RefObject<unknown>;
  userId: User['id'];
}) {
  const logger = useLogger('UserCollabEditingCaret');
  const service = useCollabService();
  const client = useApolloClient();
  const editor = useNoteTextFieldEditor();

  const [_rerenderCounter, setRerenderCounter] = useState(0);
  const resetBlinkRef = useRef(-1);

  const prevRevisionSelectionRef = useRef<{
    revision: number;
    selection: Selection;
  }>();

  useEffect(() => {
    return service.on(['localTyping:applied', 'serverRevision:changed'], () => {
      setRerenderCounter((prev) => prev + 1);
    });
  }, [service]);

  const noteId = useNoteId();
  const { complete, data: userNoteLink } = useFragment({
    fragment: UserCollabEditingCaret_UserNoteLinkFragment,
    from: {
      __typename: 'UserNoteLink',
      id: getUserNoteLinkId(noteId, userId),
    },
  });

  const selectionTransformer = useMemo(
    () =>
      new SelectionTransformer({
        cache: client.cache,
        editor,
        service,
        noteId,
        logger,
      }),
    [client, editor, service, noteId, logger]
  );

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

  const serverSelection = selectionTransformer.userAtRevision(
    userId,
    service.serverRevision
  );
  if (!serverSelection) {
    logger?.debug('userAtRevision:undefined');
    // Selection for user is not known
    return null;
  }
  if (serverSelection.revision !== service.serverRevision) {
    logger?.debug('userAtRevision:invalidRevision');
    return null;
  }

  const editorSelection = selectionTransformer.serverToEditor(serverSelection);
  if (!editorSelection) {
    logger?.debug('serverToEditor:undefined', serverSelection);
    // Selection is not inside editor
    return null;
  }

  // When selection moves, reset blink start animation
  const latestRevision = openNote.collabTextEditing.revision;
  const latestSelection = openNote.collabTextEditing.latestSelection;
  const selectionChanged =
    prevRevisionSelectionRef.current &&
    (prevRevisionSelectionRef.current.revision !== latestRevision ||
      !latestSelection.isEqual(prevRevisionSelectionRef.current.selection));
  if (selectionChanged) {
    resetBlinkRef.current += 1;
  }
  prevRevisionSelectionRef.current = {
    revision: latestRevision,
    selection: latestSelection,
  };

  // Name for color
  const displayName = userNoteLink.user.profile.displayName;
  const avatarColor = userNoteLink.user.profile.avatarColor ?? stringToColor(displayName);

  return (
    <InputCaret
      aria-label="caret"
      data-user-name={displayName}
      data-user-id={userNoteLink.user.id}
      data-index={editorSelection.selection.end}
      overrideInputValue={editor.value}
      caret={{
        inputRef,
        selection: editorSelection.selection.end,
        resetBlink: resetBlinkRef.current,
        color: avatarColor,
        heightPercentage: 0.85,
        leftOffset: -0.5,
        topOffset: -1.5,
      }}
    />
  );
}
