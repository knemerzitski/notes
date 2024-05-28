import { FieldPolicy } from '@apollo/client';
import { Note } from '../../../../__generated__/graphql';
import { getCurrentUserId } from '../../../auth/user';
import { gql } from '../../../../__generated__/gql';

const FRAGMENT = gql(`
  fragment NoteIdUserByContentId on User {
    note(contentId: $contentId) {
      id
      __typename
    }
  }
`);

// Assign note to user only once
const assignedIdsToUser = new Set<string>();

export const id: FieldPolicy<Note['id'], Note['id']> = {
  read(id, { readField, cache }) {
    if (!id) return id;

    const contentId = readField('contentId');
    if (!contentId) return id;

    const userId = getCurrentUserId(cache);
    if (!userId) return id;

    const strId = String(id);

    if (!assignedIdsToUser.has(strId)) {
      assignedIdsToUser.add(strId);
      setTimeout(() => {
        cache.writeFragment({
          id: cache.identify({
            __typename: 'User',
            id: userId,
          }),
          fragment: FRAGMENT,
          data: {
            note: {
              __typename: 'Note',
              id,
            },
          },
          variables: {
            contentId,
          },
        });
      }, 0);
    }

    return id;
  },
};
