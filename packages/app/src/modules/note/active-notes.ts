import { ApolloCache, Reference, makeVar } from '@apollo/client';
import isDefined from '~utils/type-guards/isDefined';
import { Note } from '../../__generated__/graphql';
import { getCurrentUserId } from '../auth/user';

/**
 * Active notes local changes are submitted and external changes are processed.
 */
export const activeNotesVar = makeVar<Record<string, Reference>>({});

interface NoteIdentifiable {
  contentId: Note['contentId'];
}

export function addActiveNotes<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  notes: NoteIdentifiable[]
) {
  const refsList = notes.map((note) => noteToReference(cache, note)).filter(isDefined);

  const { ...activeNotes } = activeNotesVar();
  refsList.forEach((noteRef) => {
    activeNotes[noteRef.__ref] = noteRef;
  });
  activeNotesVar(activeNotes);

  return true;
}

export function removeActiveNotes<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  notes: NoteIdentifiable[]
) {
  const refsList = notes.map((note) => noteToReference(cache, note)).filter(isDefined);

  const { ...activeNotes } = activeNotesVar();

  refsList.forEach((noteRef) => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete activeNotes[noteRef.__ref];
  });

  activeNotesVar(activeNotes);

  return true;
}

function noteToReference<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  note: NoteIdentifiable
) {
  const noteRef = toReference(
    cache.identify({
      contentId: note.contentId,
      userId: getCurrentUserId(cache),
      __typename: 'Note',
    })
  );
  return noteRef;
}

function toReference(value: string | Reference | undefined): Reference | undefined {
  if (typeof value === 'string') {
    return {
      __ref: value,
    };
  }
  return value;
}
