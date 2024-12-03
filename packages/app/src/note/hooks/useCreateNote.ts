import { useApolloClient } from '@apollo/client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { getFragmentData } from '../../__generated__';
import {
  CreateNotePayloadFragmentDoc,
  Note,
  NoteCategory,
  NotePendingStatus,
} from '../../__generated__/graphql';
import { useMutation } from '../../graphql/hooks/useMutation';
import { useUserId } from '../../user/context/user-id';
import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';
import { clearExcludeNoteFromConnection } from '../models/local-note/clear-exclude';
import { getOrCreatePendingNote } from '../models/local-note/get-or-create-pending';
import { getNotePendingStatus } from '../models/local-note/get-status';
import { setNotePendingStatus } from '../models/local-note/set-status';
import { getCollabService } from '../models/note/get-collab-service';
import { addNoteToConnection } from '../models/note-connection/add';
import { CreateNote } from '../mutations/CreateNote';

import { getUserNoteLinkId } from '../utils/id';

import { useCategoryChanged } from './useCategoryChanged';


export function useCreateNote(): {
  noteId: Note['id'];
  /**
   * Creates the note. If remote note then sumbits it to the server.
   */
  create: () => Promise<boolean>;
  /**
   * Add note to connection.
   */
  complete: () => boolean;
} {
  const client = useApolloClient();
  const [createNoteMutation] = useMutation(CreateNote);

  const userId = useUserId();
  const isLocalOnlyUser = useIsLocalOnlyUser();

  const [overrideNoteId, setOverrideNoteId] = useState<Note['id'] | null>();

  // State to trigger a rendender to create a newLocalNoteId
  const [newNoteIdCounter, setNewNoteIdCounter] = useState(0);

  const newLocalNoteId = useMemo(
    () => getOrCreatePendingNote(userId, client.cache),
    // Using newNoteIdCounter to invoke getOrAddEmptyCreateNoteId again
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, client, newNoteIdCounter]
  );
  const latestNewLocalNoteIdRef = useRef(newLocalNoteId);
  latestNewLocalNoteIdRef.current = newLocalNoteId;

  const noteId = overrideNoteId ?? newLocalNoteId;

  useCategoryChanged(noteId, (categoryName) => {
    const isNoteDeleted = categoryName === false;
    if (isNoteDeleted || categoryName === NoteCategory.TRASH) {
      const currentStatus = getNotePendingStatus({ noteId }, client.cache);
      if (currentStatus !== NotePendingStatus.EMPTY) {
        if (!isNoteDeleted) {
          setTimeout(() => {
            clearExcludeNoteFromConnection(
              {
                userNoteLinkId: getUserNoteLinkId(noteId, userId),
              },
              client.cache
            );
          }, 0);
        }

        setNewNoteIdCounter((prev) => prev + 1);
        setOverrideNoteId(null);
      }
    }
  });

  const create = useCallback(() => {
    const currentStatus = getNotePendingStatus({ noteId }, client.cache);
    if (currentStatus !== NotePendingStatus.EMPTY) {
      return Promise.resolve(false);
    }

    if (isLocalOnlyUser) {
      setNotePendingStatus({ noteId }, NotePendingStatus.DONE, client.cache);
      return Promise.resolve(true);
    }

    const service = getCollabService({ noteId }, client.cache);
    const submittedRecord = service.submitChanges();

    setNotePendingStatus({ noteId }, NotePendingStatus.SUBMITTING, client.cache);

    return createNoteMutation({
      variables: {
        input: {
          collabText: {
            initialText: submittedRecord?.changeset.joinInsertions() ?? '',
          },
        },
      },
      context: {
        localNoteId: noteId,
      },
    }).then((value) => {
      const data = value.data;
      if (!data) {
        return false;
      }

      if (latestNewLocalNoteIdRef.current === noteId) {
        // Override noteId only if latest localNoteId is same as at start
        const payload = getFragmentData(CreateNotePayloadFragmentDoc, data.createNote);
        // This noteId is no longer local
        const noteId = payload.userNoteLink.note.id;
        setOverrideNoteId(noteId);
      }

      return true;
    });
  }, [client, noteId, createNoteMutation, isLocalOnlyUser]);

  const complete = useCallback(() => {
    const currentStatus = getNotePendingStatus({ noteId }, client.cache);

    if (currentStatus !== NotePendingStatus.EMPTY) {
      clearExcludeNoteFromConnection(
        {
          noteId,
        },
        client.cache
      );
      addNoteToConnection(
        {
          noteId,
        },
        client.cache
      );

      setNewNoteIdCounter((prev) => prev + 1);
      setOverrideNoteId(null);
      setNotePendingStatus({ noteId }, null, client.cache);
    }

    return false;
  }, [client, noteId]);

  return {
    noteId,
    create,
    complete,
  };
}
