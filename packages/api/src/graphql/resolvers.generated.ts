/* This file was automatically generated. DO NOT UPDATE MANUALLY. */
    import type   { Resolvers } from './types.generated';
    import    { CreateNotePayload } from './note/resolvers/CreateNotePayload';
import    { DeleteNotePayload } from './note/resolvers/DeleteNotePayload';
import    { createUserNote as Mutation_createUserNote } from './note/resolvers/Mutation/createUserNote';
import    { deleteUserNote as Mutation_deleteUserNote } from './note/resolvers/Mutation/deleteUserNote';
import    { signIn as Mutation_signIn } from './session/resolvers/Mutation/signIn';
import    { signOut as Mutation_signOut } from './session/resolvers/Mutation/signOut';
import    { switchToSession as Mutation_switchToSession } from './session/resolvers/Mutation/switchToSession';
import    { updateUserNote as Mutation_updateUserNote } from './note/resolvers/Mutation/updateUserNote';
import    { Note } from './note/resolvers/Note';
import    { NoteCreatedPayload } from './note/resolvers/NoteCreatedPayload';
import    { NoteDeletedPayload } from './note/resolvers/NoteDeletedPayload';
import    { NotePatch } from './note/resolvers/NotePatch';
import    { NoteUpdatedPayload } from './note/resolvers/NoteUpdatedPayload';
import    { OfflineMode } from './user/resolvers/OfflineMode';
import    { PageInfo } from './base/resolvers/PageInfo';
import    { Profile } from './user/resolvers/Profile';
import    { activeSessionIndex as Query_activeSessionIndex } from './session/resolvers/Query/activeSessionIndex';
import    { activeUserInfo as Query_activeUserInfo } from './user/resolvers/Query/activeUserInfo';
import    { sessionCount as Query_sessionCount } from './session/resolvers/Query/sessionCount';
import    { userNote as Query_userNote } from './note/resolvers/Query/userNote';
import    { userNotesConnection as Query_userNotesConnection } from './note/resolvers/Query/userNotesConnection';
import    { SignInPayload } from './session/resolvers/SignInPayload';
import    { SignOutPayload } from './session/resolvers/SignOutPayload';
import    { noteCreated as Subscription_noteCreated } from './note/resolvers/Subscription/noteCreated';
import    { noteDeleted as Subscription_noteDeleted } from './note/resolvers/Subscription/noteDeleted';
import    { noteUpdated as Subscription_noteUpdated } from './note/resolvers/Subscription/noteUpdated';
import    { SwitchToSessionPayload } from './session/resolvers/SwitchToSessionPayload';
import    { UpdateNotePayload } from './note/resolvers/UpdateNotePayload';
import    { UserInfo } from './user/resolvers/UserInfo';
import    { UserNote } from './note/resolvers/UserNote';
import    { UserNoteConnection } from './note/resolvers/UserNoteConnection';
import    { UserNoteEdge } from './note/resolvers/UserNoteEdge';
import    { UserNotePatch } from './note/resolvers/UserNotePatch';
import    { UserNotePreferences } from './note/resolvers/UserNotePreferences';
import    { UserNotePreferencesPatch } from './note/resolvers/UserNotePreferencesPatch';
import    { DateResolver,HexColorCodeResolver,NonNegativeIntResolver,PositiveIntResolver } from 'graphql-scalars';
    export const resolvers: Resolvers = {
      Query: { activeSessionIndex: Query_activeSessionIndex,activeUserInfo: Query_activeUserInfo,sessionCount: Query_sessionCount,userNote: Query_userNote,userNotesConnection: Query_userNotesConnection },
      Mutation: { createUserNote: Mutation_createUserNote,deleteUserNote: Mutation_deleteUserNote,signIn: Mutation_signIn,signOut: Mutation_signOut,switchToSession: Mutation_switchToSession,updateUserNote: Mutation_updateUserNote },
      Subscription: { noteCreated: Subscription_noteCreated,noteDeleted: Subscription_noteDeleted,noteUpdated: Subscription_noteUpdated },
      CreateNotePayload: CreateNotePayload,
DeleteNotePayload: DeleteNotePayload,
Note: Note,
NoteCreatedPayload: NoteCreatedPayload,
NoteDeletedPayload: NoteDeletedPayload,
NotePatch: NotePatch,
NoteUpdatedPayload: NoteUpdatedPayload,
OfflineMode: OfflineMode,
PageInfo: PageInfo,
Profile: Profile,
SignInPayload: SignInPayload,
SignOutPayload: SignOutPayload,
SwitchToSessionPayload: SwitchToSessionPayload,
UpdateNotePayload: UpdateNotePayload,
UserInfo: UserInfo,
UserNote: UserNote,
UserNoteConnection: UserNoteConnection,
UserNoteEdge: UserNoteEdge,
UserNotePatch: UserNotePatch,
UserNotePreferences: UserNotePreferences,
UserNotePreferencesPatch: UserNotePreferencesPatch,
Date: DateResolver,
HexColorCode: HexColorCodeResolver,
NonNegativeInt: NonNegativeIntResolver,
PositiveInt: PositiveIntResolver
    }