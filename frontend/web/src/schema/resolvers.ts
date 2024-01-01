import { createUserNote } from './note/resolvers/Mutation/createUserNote';
import { deleteUserNote } from './note/resolvers/Mutation/deleteUserNote';
import { updateUserNote } from './note/resolvers/Mutation/updateUserNote';
import { note } from './note/resolvers/Query/note';
import { notes } from './note/resolvers/Query/notes';
import { updateColorMode } from './preferences/resolvers/Mutation/updateColorMode';
import { preferences } from './preferences/resolvers/Query/preferences';
import { createLocalSession } from './session/resolvers/Mutation/createLocalSession';
import { createRemoteSession } from './session/resolvers/Mutation/createRemoteSession';
import { deleteClientSession } from './session/resolvers/Mutation/deleteClientSession';
import { switchToClientSession } from './session/resolvers/Mutation/switchToClientSession';
import { activeClientSessionIndex } from './session/resolvers/Query/activeClientSessionIndex';
import { clientSessions } from './session/resolvers/Query/clientSessions';

export const resolvers = {
  Query: {
    preferences,

    clientSessions,
    activeClientSessionIndex,

    notes,
    note,
  },
  Mutation: {
    updateColorMode,

    createLocalSession,
    createRemoteSession,
    switchToClientSession,
    deleteClientSession,

    createNote: createUserNote,
    updateNote: updateUserNote,
    deleteNote: deleteUserNote,
  },
};
