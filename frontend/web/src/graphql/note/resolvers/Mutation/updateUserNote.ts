import { GraphQLError } from 'graphql';

import { Mutation, MutationUpdateNoteArgs } from '../../../__generated__/graphql';
import { readActiveSession } from '../../../session/persistence';
import { readSessionNotes, saveSessionNotes } from '../../persistence';

export const updateUserNote: (
  parent: unknown,
  args: MutationUpdateNoteArgs
) => Mutation['deleteNote'] = (_parent, { input: note }) => {
  console.log('Mutation.updateNote');

  const activeSession = readActiveSession();
  if (activeSession.__typename !== 'LocalSession') {
    throw new GraphQLError('Cannot mutate updateNote for non-local session');
  }

  const notes = readSessionNotes(activeSession);
  saveSessionNotes(
    activeSession,
    notes.map((existingNote) => (existingNote.id === note.id ? note : existingNote))
  );

  return true;
};
