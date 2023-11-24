/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
import type { Resolvers } from './types.generated';
import { createNote as Mutation_createNote } from './note/resolvers/Mutation/createNote';
import { deleteNote as Mutation_deleteNote } from './note/resolvers/Mutation/deleteNote';
import { signIn as Mutation_signIn } from './session/resolvers/Mutation/signIn';
import { signOut as Mutation_signOut } from './session/resolvers/Mutation/signOut';
import { switchToSession as Mutation_switchToSession } from './session/resolvers/Mutation/switchToSession';
import { updateNote as Mutation_updateNote } from './note/resolvers/Mutation/updateNote';
import { Note } from './note/resolvers/Note';
import { activeSessionIndex as Query_activeSessionIndex } from './session/resolvers/Query/activeSessionIndex';
import { note as Query_note } from './note/resolvers/Query/note';
import { notes as Query_notes } from './note/resolvers/Query/notes';
import { sessionCount as Query_sessionCount } from './session/resolvers/Query/sessionCount';
import { Session } from './session/resolvers/Session';
import { noteCreated as Subscription_noteCreated } from './note/resolvers/Subscription/noteCreated';
import { noteDeleted as Subscription_noteDeleted } from './note/resolvers/Subscription/noteDeleted';
import { noteUpdated as Subscription_noteUpdated } from './note/resolvers/Subscription/noteUpdated';
import { User } from './user/resolvers/User';
export const resolvers: Resolvers = {
  Query: {
    activeSessionIndex: Query_activeSessionIndex,
    note: Query_note,
    notes: Query_notes,
    sessionCount: Query_sessionCount,
  },
  Mutation: {
    createNote: Mutation_createNote,
    deleteNote: Mutation_deleteNote,
    signIn: Mutation_signIn,
    signOut: Mutation_signOut,
    switchToSession: Mutation_switchToSession,
    updateNote: Mutation_updateNote,
  },
  Subscription: {
    noteCreated: Subscription_noteCreated,
    noteDeleted: Subscription_noteDeleted,
    noteUpdated: Subscription_noteUpdated,
  },
  Note: Note,
  Session: Session,
  User: User,
};
