import { FieldPolicy, InMemoryCache, TypePolicies, makeVar } from '@apollo/client';
import { Reference, relayStylePagination } from '@apollo/client/utilities';

import { Note, NoteTextFieldEntry, Query } from '../__generated__/graphql';
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

const activeNotesVar = makeVar<Reference[]>([]);

export const Note_id: FieldPolicy<Note['id'], Note['id']> = {
  merge(_existing, incoming, { toReference }) {
    const noteRef = toReference({
      id: incoming,
      __typename: 'Note',
    });
    if (!noteRef) return incoming;

    const activeNotes = activeNotesVar();
    if (!activeNotes.some((val) => val.__ref === noteRef.__ref)) {
      activeNotesVar([...activeNotes, noteRef]);
    }

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
      allActiveNotes: {
        read() {
          return activeNotesVar();
        },
      },
      note: Query_note,
      notesConnection: relayStylePagination(),
    },
  },
  UserNoteMapping: {
    keyFields: ['user', ['id'], 'note', ['contentId']],
  },
  Note: {
    fields: {
      id: Note_id,
      textFields: Note_textFields,
    },
  },
};

export default notePolicies;
