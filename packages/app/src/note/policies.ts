import { InMemoryCache, TypePolicies } from '@apollo/client';
import { relayStylePagination } from '@apollo/client/utilities';

import { NoteTextFieldEntry } from '../__generated__/graphql';
import { gql } from '../__generated__';
import { readSessionContext } from '../session/state/persistence';

const FRAGMENT_NOTE_ID = gql(`
fragment UserNoteContentIdToNoteId on UserNoteMapping {
  note {
    id
  }
}
`);

/**
 * Uses current session userId and noteContentId to find noteId
 */
function noteContentIdToNoteId(
  noteContentId: string,
  cache: InMemoryCache
): string | number | undefined {
  const sessions = readSessionContext();

  const data = cache.readFragment({
    id: cache.identify({
      user: {
        id: sessions?.currentSession.id ?? '',
      },
      note: {
        contentId: noteContentId,
      },
      __typename: 'UserNoteMapping',
    }),
    fragment: FRAGMENT_NOTE_ID,
  });

  return data?.note.id;
}

const notePolicies: TypePolicies = {
  Query: {
    fields: {
      note: {
        // Read single note from previously cached list of notes
        read(_, { args, toReference, cache }) {
          if (typeof args?.contentId === 'string') {
            const noteId = noteContentIdToNoteId(args.contentId, cache);
            return toReference({
              __typename: 'Note',
              id: noteId,
            });
          }
        },
      },
      notesConnection: relayStylePagination(),
    },
  },
  Note: {
    fields: {
      textFields: {
        merge(
          existing: NoteTextFieldEntry[] | undefined,
          incoming: NoteTextFieldEntry[]
        ) {
          if (!existing) {
            return incoming;
          }

          // Overwrite existing with incoming by the same key
          const mergedResult: NoteTextFieldEntry[] = [...existing];
          incoming.forEach((entry) => {
            const sameKeyIndex = existing.findIndex(({ key }) => key === entry.key);
            if (sameKeyIndex !== -1) {
              mergedResult[sameKeyIndex] = entry;
            } else {
              mergedResult.push(entry);
            }
          });

          return incoming;
        },
      },
    },
  },
  AllNotes: {
    keyFields: [],
  },
  UserNoteMapping: {
    keyFields: ['user', ['id'], 'note', ['contentId']],
  },
};

export default notePolicies;
