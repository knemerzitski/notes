import { GraphQLError } from 'graphql';

import {
  CreateNotePayload,
  Mutation,
  MutationCreateUserNoteArgs,
} from '../../../__generated__/graphql';
import { readActiveSession } from '../../../session/persistence';
import { readNextNodeId, readSessionNotes, saveSessionNotes } from '../../persistence';

export const createUserNote: (
  parent: unknown,
  args: MutationCreateUserNoteArgs
) => Mutation['createUserNote'] = (_parent, { input: { newNote } }) => {
  console.log('Mutation.createNote');

  const noteId = readNextNodeId();

  const newNoteResult: CreateNotePayload = {
    note: {
      id: noteId,
      note: {
        __typename: 'Note',
        id: noteId,
        title: newNote?.title ?? '',
        textContent: newNote?.textContent ?? '',
      },
      preferences: {},
    },
  };

  const activeSession = readActiveSession();
  if (activeSession.__typename !== 'LocalSession') {
    throw new GraphQLError('Cannot mutate createNote for non-local session');
  }

  const notes = readSessionNotes(activeSession);
  saveSessionNotes(activeSession, [newNoteResult, ...notes]);

  return newNoteResult;
};
