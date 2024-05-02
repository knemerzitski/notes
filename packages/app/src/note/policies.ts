import { FieldPolicy, InMemoryCache, TypePolicies } from '@apollo/client';
import { Reference, isReference, relayStylePagination } from '@apollo/client/utilities';

import {
  AllNotes,
  CollabText,
  Note,
  NoteTextFieldEntry,
  Query,
} from '../__generated__/graphql';
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

export const Query_note: FieldPolicy<Query['note'], Query['note'] | Reference> = {
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
};

export const AllNotes_active: FieldPolicy<AllNotes['active'], AllNotes['active']> = {
  read(existing = []) {
    return existing as Note[];
  },
};

export const Note_id: FieldPolicy<Note['id'], Note['id']> = {
  merge(_existing, incoming, { cache, toReference }) {
    const noteRef = toReference({
      id: incoming,
      __typename: 'Note',
    });
    if (!noteRef) return incoming;

    cache.modify<{ active: Reference[] }>({
      id: cache.identify({
        __typename: 'AllNotes',
      }),
      fields: {
        active(existingRefs) {
          if (existingRefs.some((val) => val === noteRef)) {
            return existingRefs;
          }

          return [...existingRefs, noteRef];
        },
      },
    });

    return incoming;
  },
};

export const Note_textFields: FieldPolicy<Note['textFields'], Note['textFields']> = {
  merge(existing, incoming) {
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
};

const notePolicies: TypePolicies = {
  Query: {
    fields: {
      note: Query_note,
      notesConnection: relayStylePagination(),
    },
  },
  UserNoteMapping: {
    keyFields: ['user', ['id'], 'note', ['contentId']],
  },
  AllNotes: {
    keyFields: [],
    fields: {
      active: AllNotes_active,
    },
  },
  Note: {
    fields: {
      id: Note_id,
      textFields: Note_textFields,
    },
  },
};

export default notePolicies;
