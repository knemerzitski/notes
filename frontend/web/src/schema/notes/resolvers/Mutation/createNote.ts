import { GraphQLError } from 'graphql';

import { Mutation, MutationCreateNoteArgs, Note } from '../../../__generated__/graphql';
import { readActiveSession } from '../../../session/persistence';
import { readNextNodeId, readSessionNotes, saveSessionNotes } from '../../persistence';

export const createNote: (
  parent: unknown,
  args: MutationCreateNoteArgs
) => Mutation['createNote'] = (_parent, { input: { title, content } }) => {
  console.log('Mutation.createNote');

  const noteId = readNextNodeId();

  const newNote: Note = {
    __typename: 'Note',
    id: noteId,
    title: title,
    content: content,
  };

  const activeSession = readActiveSession();
  if (activeSession.__typename !== 'LocalSession') {
    throw new GraphQLError('Cannot mutate createNote for non-local session');
  }

  const notes = readSessionNotes(activeSession);
  saveSessionNotes(activeSession, [newNote, ...notes]);

  return newNote;
};
