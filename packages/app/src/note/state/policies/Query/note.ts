import { FieldPolicy, InMemoryCache, Reference } from '@apollo/client';
import { Query } from '../../../../__generated__/graphql';
import { readSessionContext } from '../../../../session/state/persistence';
import { gql } from '../../../../__generated__/gql';

const FRAGMENT_NOTE_ID = gql(`
fragment NoteFromContentId on UserNoteMapping {
  note {
    id
  }
}
`);

export const note: FieldPolicy<Query['note'], Query['note'] | Reference> = {
  // Read single note from previously cached list of notes
  read(existing, { args, toReference, cache }) {
    if (typeof args?.contentId === 'string') {
      const noteId = noteContentIdToNoteId(args.contentId, cache);
      return toReference({
        __typename: 'Note',
        id: noteId,
      });
    }
    return existing;
  },
};

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
        __typename: 'User',
      },
      note: {
        contentId: noteContentId,
        __typename: 'Note',
      },
      __typename: 'UserNoteMapping',
    }),
    fragment: FRAGMENT_NOTE_ID,
  });

  return data?.note.id;
}
