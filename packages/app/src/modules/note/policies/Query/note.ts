import { FieldPolicy } from '@apollo/client';
import { EvictFieldPolicy, EvictTag } from '../../../apollo-client/policy/evict';
import { getCurrentUserId } from '../../../auth/user';
import { gql } from '../../../../__generated__/gql';

const FRAGMENT = gql(`
  fragment QueryNoteUserByContentId on User {
    note(contentId: $contentId) {
      id
    }
  }
`);

export const note: FieldPolicy & EvictFieldPolicy = {
  // Read single note from previously cached list of notes
  read(existing, { args, cache, toReference }) {
    // Attempt to read noteId from User type
    if (typeof args?.contentId === 'string') {
      const userId = getCurrentUserId(cache);
      const noteId = cache.readFragment({
        id: cache.identify({
          __typename: 'User',
          id: userId,
        }),
        fragment: FRAGMENT,
        variables: {
          contentId: args.contentId,
        },
      })?.note?.id;

      if (noteId) {
        return toReference({
          __typename: 'Note',
          id: noteId,
        });
      }
    }

    return existing;
  },
  evictTag: EvictTag.UserSpecific,
  keyArgs: false,
  merge: false,
};
