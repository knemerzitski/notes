import { gql, FieldPolicy, InMemoryCache } from '@apollo/client';
import { ToReferenceFunction } from '@apollo/client/cache/core/types/common';
import { AddUserNoteMappingQuery, Note } from '../../../../__generated__/graphql';
import { readSessionContext } from '../../../../session/state/persistence';
import { activeNotesVar } from '../../reactive-vars';

const QUERY_USER_NOTE_MAPPING = gql(`
  query AddUserNoteMapping {
    userNoteMappings {
      user {
        id
        __typename
      }
      note {
        id
        contentId
        __typename
      }
      __typename
    }
  }
`);

export const id: FieldPolicy<Note['id'], Note['id']> = {
  read(existing, { cache, toReference, readField }) {
    const noteRef = toReference({
      id: existing,
      __typename: 'Note',
    });

    if (noteRef) {
      const activeNotes = activeNotesVar();
      if (!(noteRef.__ref in activeNotes)) {
        activeNotesVar({
          ...activeNotes,
          [noteRef.__ref]: noteRef,
        });
      }
    }

    const contentId = readField('contentId');
    if (contentId) {
      addUserNoteMapping(String(existing), String(contentId), cache, toReference);
    }

    return existing;
  },
};

function addUserNoteMapping(
  noteId: string,
  noteContentId: string,
  cache: InMemoryCache,
  toReference: ToReferenceFunction
) {
  const sessions = readSessionContext();
  const userId = sessions?.currentSession.id;
  if (!userId) return;
  const newMapping: AddUserNoteMappingQuery['userNoteMappings'][0] = {
    __typename: 'UserNoteMapping',
    note: {
      __typename: 'Note',
      id: noteId,
      contentId: noteContentId,
    },
    user: {
      __typename: 'User',
      id: userId,
    },
  };
  const newMappingRef = toReference(newMapping);
  if (!newMappingRef) return;

  setTimeout(() => {
    cache.writeQuery({
      query: QUERY_USER_NOTE_MAPPING,
      data: {
        userNoteMappings: [newMapping],
      },
    });
  }, 0);
}
