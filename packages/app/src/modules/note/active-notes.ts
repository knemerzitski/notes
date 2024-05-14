import { ApolloCache, Reference, makeVar } from '@apollo/client';
import isDefined from '~utils/type-guards/isDefined';
import { Note } from '../../__generated__/graphql';

/**
 * Active notes local changes are submitted and external changes are processed.
 */
export const activeNotesVar = makeVar<Record<string, Reference>>({});

interface NoteOnlyId {
  id: Note['id'];
}

export function addActiveNotes<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  notes: NoteOnlyId[]
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
  notes: NoteOnlyId[]
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

function noteToReference<TCacheShape>(cache: ApolloCache<TCacheShape>, note: NoteOnlyId) {
  const noteRef = toReference(
    cache.identify({
      id: note.id,
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
