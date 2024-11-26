import { useApolloClient } from '@apollo/client';
import { gql } from '../../__generated__';
import {
  Note,
  NoteCategory,
  NoteCreateStatus,
  UserNoteLink,
} from '../../__generated__/graphql';
import { useEffect, useRef } from 'react';
import { useUserId } from '../../user/context/user-id';
import { getUserNoteLinkId } from '../utils/id';

const UseCategoryChanged_UserNoteLinkFragment = gql(`
  fragment UseCategoryChanged_UserNoteLinkFragment on UserNoteLink {
    categoryName
    createStatus
  }
`);

export function useCategoryChanged(
  noteId: Note['id'],
  /**
   * Invokes with current `categoryName` and whenever it changes.
   * Returns `false` if note doesn't exist
   */
  callback: (categoryName: UserNoteLink['categoryName'] | false) => void
) {
  const userId = useUserId();
  const client = useApolloClient();

  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const prevCategoryNameRef = useRef<NoteCategory | null>(null);

  useEffect(() => {
    const obs = client.watchFragment({
      fragment: UseCategoryChanged_UserNoteLinkFragment,
      from: {
        __typename: 'UserNoteLink',
        id: getUserNoteLinkId(noteId, userId),
      },
    });

    const sub = obs.subscribe((value) => {
      if (!value.complete) {
        callbackRef.current(false);
        return;
      }

      if (value.data.createStatus === NoteCreateStatus.CONVERTING) {
        // Do not trigger callback when local note is being replaced with a remote one
        return;
      }

      if (prevCategoryNameRef.current !== value.data.categoryName) {
        callbackRef.current(value.data.categoryName);
      }
      prevCategoryNameRef.current = value.data.categoryName;
    });

    return () => {
      sub.unsubscribe();
    };
  }, [client, noteId, userId]);
}
