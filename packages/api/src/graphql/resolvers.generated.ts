/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated';
    import    { CreateNotePayload } from './note/resolvers/CreateNotePayload';
import    { DeleteNotePayload } from './note/resolvers/DeleteNotePayload';
import    { createNote as Mutation_createNote } from './note/resolvers/Mutation/createNote';
import    { deleteNote as Mutation_deleteNote } from './note/resolvers/Mutation/deleteNote';
import    { signIn as Mutation_signIn } from './session/resolvers/Mutation/signIn';
import    { signOut as Mutation_signOut } from './session/resolvers/Mutation/signOut';
import    { switchToSession as Mutation_switchToSession } from './session/resolvers/Mutation/switchToSession';
import    { updateNote as Mutation_updateNote } from './note/resolvers/Mutation/updateNote';
import    { Note } from './note/resolvers/Note';
import    { NoteConnection } from './note/resolvers/NoteConnection';
import    { NoteCreatedPayload } from './note/resolvers/NoteCreatedPayload';
import    { NoteDeletedPayload } from './note/resolvers/NoteDeletedPayload';
import    { NoteEdge } from './note/resolvers/NoteEdge';
import    { NotePatch } from './note/resolvers/NotePatch';
import    { NotePreferences } from './note/resolvers/NotePreferences';
import    { NotePreferencesPatch } from './note/resolvers/NotePreferencesPatch';
import    { NoteUpdatedPayload } from './note/resolvers/NoteUpdatedPayload';
import    { OfflineMode } from './user/resolvers/OfflineMode';
import    { PageInfo } from './base/resolvers/PageInfo';
import    { Profile } from './user/resolvers/Profile';
import    { activeSessionIndex as Query_activeSessionIndex } from './session/resolvers/Query/activeSessionIndex';
import    { activeUserInfo as Query_activeUserInfo } from './user/resolvers/Query/activeUserInfo';
import    { note as Query_note } from './note/resolvers/Query/note';
import    { notesConnection as Query_notesConnection } from './note/resolvers/Query/notesConnection';
import    { sessionCount as Query_sessionCount } from './session/resolvers/Query/sessionCount';
import    { SignInPayload } from './session/resolvers/SignInPayload';
import    { SignOutPayload } from './session/resolvers/SignOutPayload';
import    { noteCreated as Subscription_noteCreated } from './note/resolvers/Subscription/noteCreated';
import    { noteDeleted as Subscription_noteDeleted } from './note/resolvers/Subscription/noteDeleted';
import    { noteUpdated as Subscription_noteUpdated } from './note/resolvers/Subscription/noteUpdated';
import    { SwitchToSessionPayload } from './session/resolvers/SwitchToSessionPayload';
import    { UpdateNotePayload } from './note/resolvers/UpdateNotePayload';
import    { UserInfo } from './user/resolvers/UserInfo';
import    { DateResolver,HexColorCodeResolver,NonNegativeIntResolver,PositiveIntResolver } from 'graphql-scalars';
    export const resolvers: Resolvers = {
      Query: { activeSessionIndex: Query_activeSessionIndex,activeUserInfo: Query_activeUserInfo,note: Query_note,notesConnection: Query_notesConnection,sessionCount: Query_sessionCount },
      Mutation: { createNote: Mutation_createNote,deleteNote: Mutation_deleteNote,signIn: Mutation_signIn,signOut: Mutation_signOut,switchToSession: Mutation_switchToSession,updateNote: Mutation_updateNote },
      Subscription: { noteCreated: Subscription_noteCreated,noteDeleted: Subscription_noteDeleted,noteUpdated: Subscription_noteUpdated },
      CreateNotePayload: CreateNotePayload,
DeleteNotePayload: DeleteNotePayload,
Note: Note,
NoteConnection: NoteConnection,
NoteCreatedPayload: NoteCreatedPayload,
NoteDeletedPayload: NoteDeletedPayload,
NoteEdge: NoteEdge,
NotePatch: NotePatch,
NotePreferences: NotePreferences,
NotePreferencesPatch: NotePreferencesPatch,
NoteUpdatedPayload: NoteUpdatedPayload,
OfflineMode: OfflineMode,
PageInfo: PageInfo,
Profile: Profile,
SignInPayload: SignInPayload,
SignOutPayload: SignOutPayload,
SwitchToSessionPayload: SwitchToSessionPayload,
UpdateNotePayload: UpdateNotePayload,
UserInfo: UserInfo,
Date: DateResolver,
HexColorCode: HexColorCodeResolver,
NonNegativeInt: NonNegativeIntResolver,
PositiveInt: PositiveIntResolver
    }