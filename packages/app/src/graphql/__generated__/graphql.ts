/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string | number; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Date: { input: Date; output: Date | string; }
  HexColorCode: { input: string; output: string; }
  /** int >= 0 */
  NonNegativeInt: { input: number; output: number; }
  /** int > 0 */
  PositiveInt: { input: number; output: number; }
};

export enum AuthProvider {
  Google = 'GOOGLE'
}

export enum ColorMode {
  Dark = 'DARK',
  Light = 'LIGHT',
  System = 'SYSTEM'
}

export type Connection = {
  /** Self descriptive */
  edges: Array<Edge>;
  /** Self descriptive */
  pageInfo: PageInfo;
};

export type CreateNoteInput = {
  newNote?: InputMaybe<NotePatchInput>;
};

export type CreateNotePayload = {
  __typename?: 'CreateNotePayload';
  /** Note to create */
  note: UserNote;
};

export type CreateSavedSessionInput = {
  index: Scalars['Int']['input'];
  profile: SessionProfileInput;
};

export type CreateSavedSessionPayload = {
  __typename?: 'CreateSavedSessionPayload';
  /** Self-descriptive */
  savedSession: SavedSession;
};

export type CredentialsInput = {
  token?: InputMaybe<Scalars['String']['input']>;
};

export type DeleteNoteInput = {
  id: Scalars['ID']['input'];
};

export type DeleteNotePayload = {
  __typename?: 'DeleteNotePayload';
  /** Was note deleted */
  deleted: Scalars['Boolean']['output'];
};

export type DeleteSavedSessionInput = {
  /** Index of saved session to be deleted. */
  index: Scalars['Int']['input'];
};

export type DeleteSavedSessionPayload = {
  __typename?: 'DeleteSavedSessionPayload';
  /** Was saved session deletion successful. */
  deleted: Scalars['Boolean']['output'];
};

export type Edge = {
  /** Self descriptive */
  cursor: Scalars['String']['output'];
  /** Self descriptive */
  node: Node;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Create a new note that is saved in localStorage */
  createLocalNote?: Maybe<CreateNotePayload>;
  /** Call this mutation after successful remote sign in to remember the session. */
  createSavedSession?: Maybe<CreateSavedSessionPayload>;
  /** Create a new note to current user */
  createUserNote?: Maybe<CreateNotePayload>;
  /** Delete note in localStorage */
  deleteLocalNote?: Maybe<DeleteNotePayload>;
  /** Deletes client session and returns deleted session ID. */
  deleteSavedSession?: Maybe<DeleteSavedSessionPayload>;
  /** Delete note */
  deleteUserNote: DeleteNotePayload;
  /** On successful sign in, session ID is stored in a http-only cookie. Returns null on failed sign in. */
  signIn?: Maybe<SignInPayload>;
  /** Returns signed out http-conly cookie session index or null if user was not signed in. */
  signOut: SignOutPayload;
  /** Deletes client session and returns deleted session ID. */
  switchToSavedSession?: Maybe<SwitchToSavedSessionPayload>;
  /** Switch session to new index which is tied to http-only session cookie. Returns switched to session index. */
  switchToSession: SwitchToSessionPayload;
  /** Update note in localStorage */
  updateLocalNote?: Maybe<UpdateNotePayload>;
  /** Updates user preferred color mode */
  updatePreferences?: Maybe<UpdatePreferencesPayload>;
  /** Call this mutation after successful remote sign in to remember the session. */
  updateSavedSession?: Maybe<UpdateSavedSessionPayload>;
  /** Update note */
  updateUserNote: UpdateNotePayload;
};


export type MutationCreateLocalNoteArgs = {
  input: CreateNoteInput;
};


export type MutationCreateSavedSessionArgs = {
  input: CreateSavedSessionInput;
};


export type MutationCreateUserNoteArgs = {
  input: CreateNoteInput;
};


export type MutationDeleteLocalNoteArgs = {
  input: DeleteNoteInput;
};


export type MutationDeleteSavedSessionArgs = {
  input: DeleteSavedSessionInput;
};


export type MutationDeleteUserNoteArgs = {
  input: DeleteNoteInput;
};


export type MutationSignInArgs = {
  input: SignInInput;
};


export type MutationSwitchToSavedSessionArgs = {
  input: SwitchToSavedSessionInput;
};


export type MutationSwitchToSessionArgs = {
  input: SwitchToSessionInput;
};


export type MutationUpdateLocalNoteArgs = {
  input: UpdateNoteInput;
};


export type MutationUpdatePreferencesArgs = {
  input: UpdatePreferencesPatchInput;
};


export type MutationUpdateSavedSessionArgs = {
  input: UpdateSavedSessionPatchInput;
};


export type MutationUpdateUserNoteArgs = {
  input: UpdateNoteInput;
};

export type Node = {
  /** Self descriptive */
  id: Scalars['ID']['output'];
};

export type Note = {
  __typename?: 'Note';
  /** Note unique ID */
  id: Scalars['ID']['output'];
  /** Note text contents */
  textContent: Scalars['String']['output'];
  /** Note title */
  title: Scalars['String']['output'];
};

export type NoteCreatedPayload = {
  __typename?: 'NoteCreatedPayload';
  /** Created note info */
  note: UserNote;
};

export type NoteDeletedPayload = {
  __typename?: 'NoteDeletedPayload';
  /** ID of deleted note */
  id: Scalars['ID']['output'];
};

export type NotePatch = {
  __typename?: 'NotePatch';
  /** Note text */
  textContent?: Maybe<Scalars['String']['output']>;
  /** Note title */
  title?: Maybe<Scalars['String']['output']>;
};

export type NotePatchInput = {
  textContent?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type NoteUpdatedPayload = {
  __typename?: 'NoteUpdatedPayload';
  /** ID of note that was updated */
  id: Scalars['ID']['output'];
  /** Changes made to the note */
  patch: UserNotePatch;
};

export type OfflineMode = {
  __typename?: 'OfflineMode';
  /** Offline ID to be used to store offline (only one device) notes. */
  id: Scalars['ID']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  /** Self descriptive */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Self descriptive */
  hasNextPage: Scalars['Boolean']['output'];
};

export type Preferences = {
  __typename?: 'Preferences';
  /** Color mode of the app */
  colorMode: ColorMode;
};

export type PreferencesPatchInput = {
  colorMode?: InputMaybe<ColorMode>;
};

export type Profile = {
  __typename?: 'Profile';
  /** User-friendly way to distinguish this user. Can be anything set by the user. */
  displayName: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Currently active session index saved in http-only cookie */
  activeSessionIndex: Scalars['NonNegativeInt']['output'];
  /** Currently active user info */
  activeUserInfo: UserInfo;
  /** Client-side current session */
  currentSavedSession?: Maybe<SavedSession>;
  /** Get note by ID from localStorage */
  localNote: UserNote;
  /** Get all notes from localStorage */
  localNotes: Array<Maybe<UserNote>>;
  /** Get local preferences, such as interface color mode */
  preferences?: Maybe<Preferences>;
  /** All saved sessions information stored on client-side. */
  savedSessions: Array<SavedSession>;
  /** Count of sessions saved in http-only cookie */
  sessionCount: Scalars['PositiveInt']['output'];
  test: Test;
  /** Get current user note by ID */
  userNote: UserNote;
  /** Paginate current user notes */
  userNotesConnection: UserNoteConnection;
};


export type QueryLocalNoteArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserNoteArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserNotesConnectionArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['NonNegativeInt']['input'];
};

export enum Role {
  User = 'USER'
}

export type SavedSession = {
  __typename?: 'SavedSession';
  /** Index of session stored in http-only cookie */
  index: Scalars['Int']['output'];
  /** Self-descriptive */
  profile: SessionProfile;
};

export type SessionProfile = {
  __typename?: 'SessionProfile';
  /** Self-descriptive */
  displayName: Scalars['String']['output'];
  /** Self-descriptive */
  email: Scalars['String']['output'];
};

export type SessionProfileInput = {
  displayName: Scalars['String']['input'];
  email: Scalars['String']['input'];
};

export type SessionProfilePatchInput = {
  displayName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
};

export type SignInInput = {
  credentials: CredentialsInput;
  provider: AuthProvider;
};

export type SignInPayload = {
  __typename?: 'SignInPayload';
  /** Index of saved session in http-only cookie */
  sessionIndex: Scalars['NonNegativeInt']['output'];
  /** Signed in user info */
  userInfo: UserInfo;
};

export type SignOutPayload = {
  __typename?: 'SignOutPayload';
  /** Session index after signing out of current account, if any sessions still exist. */
  activeSessionIndex?: Maybe<Scalars['NonNegativeInt']['output']>;
  /** Was user just signed out */
  signedOut: Scalars['Boolean']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** A new note was created */
  noteCreated: NoteCreatedPayload;
  /** A note was deleted */
  noteDeleted: NoteDeletedPayload;
  /** An existing note was updated */
  noteUpdated: NoteUpdatedPayload;
};

export type SwitchToSavedSessionInput = {
  /** New session index */
  index: Scalars['Int']['input'];
};

export type SwitchToSavedSessionPayload = {
  __typename?: 'SwitchToSavedSessionPayload';
  /** Index of saved session to be deleted. */
  session: SavedSession;
};

export type SwitchToSessionInput = {
  switchToSessionIndex: Scalars['NonNegativeInt']['input'];
};

export type SwitchToSessionPayload = {
  __typename?: 'SwitchToSessionPayload';
  /** Active session index in http-only cookie */
  activeSessionIndex: Scalars['NonNegativeInt']['output'];
};

export type Test = {
  __typename?: 'Test';
  date: Scalars['Date']['output'];
  hexColorCode: Scalars['HexColorCode']['output'];
  nonNegativeInt: Scalars['NonNegativeInt']['output'];
  positiveInt: Scalars['PositiveInt']['output'];
};

export type UpdateNoteInput = {
  id: Scalars['ID']['input'];
  patch?: InputMaybe<UserNotePatchInput>;
};

export type UpdateNotePayload = {
  __typename?: 'UpdateNotePayload';
  /** Note to update */
  note: UserNote;
};

export type UpdatePreferencesPatchInput = {
  patch: PreferencesPatchInput;
};

export type UpdatePreferencesPayload = {
  __typename?: 'UpdatePreferencesPayload';
  /** Index of saved session to be deleted. */
  preferences: Preferences;
};

export type UpdateSavedSessionPatchInput = {
  index: Scalars['Int']['input'];
  patch: SessionProfilePatchInput;
};

export type UpdateSavedSessionPayload = {
  __typename?: 'UpdateSavedSessionPayload';
  /** Self-descriptive */
  savedSession: SavedSession;
};

/** User information accessible by a query */
export type UserInfo = {
  __typename?: 'UserInfo';
  /** Self-descriptive */
  offlineMode: OfflineMode;
  /** Self-descriptive */
  profile: Profile;
};

/** Note with additional user related metadata */
export type UserNote = Node & {
  __typename?: 'UserNote';
  /** Note id. Same as in note field */
  id: Scalars['ID']['output'];
  /** Actual Note data */
  note: Note;
  /** Preferences is individual to the user */
  preferences: UserNotePreferences;
  /** If not defined then note is writable */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
};

export type UserNoteConnection = Connection & {
  __typename?: 'UserNoteConnection';
  /** Self descriptive */
  edges: Array<UserNoteEdge>;
  /** Self descriptive */
  notes: Array<UserNote>;
  /** Self descriptive */
  pageInfo: PageInfo;
};

export type UserNoteEdge = Edge & {
  __typename?: 'UserNoteEdge';
  /** Self descriptive */
  cursor: Scalars['String']['output'];
  /** Self descriptive */
  node: UserNote;
};

export type UserNotePatch = {
  __typename?: 'UserNotePatch';
  /** Note to patch */
  note?: Maybe<NotePatch>;
  /** Preferences to patch */
  preferences?: Maybe<UserNotePreferencesPatch>;
};

export type UserNotePatchInput = {
  note?: InputMaybe<NotePatchInput>;
  preferences?: InputMaybe<UserNotePreferencesPatchInput>;
};

export type UserNotePreferences = {
  __typename?: 'UserNotePreferences';
  /** Note background color for the user */
  backgroundColor?: Maybe<Scalars['HexColorCode']['output']>;
};

export type UserNotePreferencesPatch = {
  __typename?: 'UserNotePreferencesPatch';
  /** Note background color for the user */
  backgroundColor?: Maybe<Scalars['HexColorCode']['output']>;
};

export type UserNotePreferencesPatchInput = {
  backgroundColor?: InputMaybe<Scalars['HexColorCode']['input']>;
};

export type PreferencesQueryVariables = Exact<{ [key: string]: never; }>;


export type PreferencesQuery = { __typename?: 'Query', preferences?: { __typename?: 'Preferences', colorMode: ColorMode } | null };

export type UpdateColorModeMutationVariables = Exact<{
  input: UpdatePreferencesPatchInput;
}>;


export type UpdateColorModeMutation = { __typename?: 'Mutation', updatePreferences?: { __typename?: 'UpdatePreferencesPayload', preferences: { __typename?: 'Preferences', colorMode: ColorMode } } | null };

export type CreateUserNoteMutationVariables = Exact<{
  input: CreateNoteInput;
}>;


export type CreateUserNoteMutation = { __typename?: 'Mutation', createUserNote?: { __typename?: 'CreateNotePayload', note: { __typename?: 'UserNote', id: string | number, note: { __typename?: 'Note', id: string | number, title: string, textContent: string } } } | null };

export type DeleteUserNoteMutationVariables = Exact<{
  input: DeleteNoteInput;
}>;


export type DeleteUserNoteMutation = { __typename?: 'Mutation', deleteUserNote: { __typename?: 'DeleteNotePayload', deleted: boolean } };

export type UserNoteQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UserNoteQuery = { __typename?: 'Query', userNote: { __typename?: 'UserNote', note: { __typename?: 'Note', id: string | number, title: string, textContent: string } } };

export type UserNotesConnectionQueryVariables = Exact<{
  first: Scalars['NonNegativeInt']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type UserNotesConnectionQuery = { __typename?: 'Query', userNotesConnection: { __typename?: 'UserNoteConnection', notes: Array<{ __typename?: 'UserNote', note: { __typename?: 'Note', id: string | number, title: string, textContent: string } }> } };

export type OnNoteCreatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnNoteCreatedSubscription = { __typename?: 'Subscription', noteCreated: { __typename?: 'NoteCreatedPayload', note: { __typename?: 'UserNote', id: string | number, note: { __typename?: 'Note', id: string | number, title: string, textContent: string } } } };

export type OnNoteDeletedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnNoteDeletedSubscription = { __typename?: 'Subscription', noteDeleted: { __typename?: 'NoteDeletedPayload', id: string | number } };

export type OnNoteUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnNoteUpdatedSubscription = { __typename?: 'Subscription', noteUpdated: { __typename?: 'NoteUpdatedPayload', id: string | number, patch: { __typename?: 'UserNotePatch', note?: { __typename?: 'NotePatch', title?: string | null, textContent?: string | null } | null, preferences?: { __typename?: 'UserNotePreferencesPatch', backgroundColor?: string | null } | null } } };

export type UpdateUserNoteMutationVariables = Exact<{
  input: UpdateNoteInput;
}>;


export type UpdateUserNoteMutation = { __typename?: 'Mutation', updateUserNote: { __typename?: 'UpdateNotePayload', note: { __typename?: 'UserNote', note: { __typename?: 'Note', id: string | number, title: string, textContent: string } } } };

export type CreateSavedSessionMutationVariables = Exact<{
  input: CreateSavedSessionInput;
}>;


export type CreateSavedSessionMutation = { __typename?: 'Mutation', createSavedSession?: { __typename?: 'CreateSavedSessionPayload', savedSession: { __typename?: 'SavedSession', index: number, profile: { __typename?: 'SessionProfile', displayName: string, email: string } } } | null };

export type DeleteClientSessionMutationVariables = Exact<{
  input: DeleteSavedSessionInput;
}>;


export type DeleteClientSessionMutation = { __typename?: 'Mutation', deleteSavedSession?: { __typename?: 'DeleteSavedSessionPayload', deleted: boolean } | null };

export type SavedSessionsQueryVariables = Exact<{ [key: string]: never; }>;


export type SavedSessionsQuery = { __typename?: 'Query', savedSessions: Array<{ __typename?: 'SavedSession', index: number, profile: { __typename?: 'SessionProfile', displayName: string, email: string } }>, currentSavedSession?: { __typename?: 'SavedSession', index: number, profile: { __typename?: 'SessionProfile', displayName: string, email: string } } | null };

export type SignInMutationVariables = Exact<{
  input: SignInInput;
}>;


export type SignInMutation = { __typename?: 'Mutation', signIn?: { __typename?: 'SignInPayload', sessionIndex: number, userInfo: { __typename?: 'UserInfo', offlineMode: { __typename?: 'OfflineMode', id: string | number }, profile: { __typename?: 'Profile', displayName: string } } } | null };

export type SignOutMutationVariables = Exact<{ [key: string]: never; }>;


export type SignOutMutation = { __typename?: 'Mutation', signOut: { __typename?: 'SignOutPayload', signedOut: boolean, activeSessionIndex?: number | null } };

export type SwitchToSavedSessionMutationVariables = Exact<{
  input: SwitchToSavedSessionInput;
}>;


export type SwitchToSavedSessionMutation = { __typename?: 'Mutation', switchToSavedSession?: { __typename?: 'SwitchToSavedSessionPayload', session: { __typename?: 'SavedSession', index: number } } | null };


export const PreferencesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Preferences"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"preferences"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"colorMode"}}]}}]}}]} as unknown as DocumentNode<PreferencesQuery, PreferencesQueryVariables>;
export const UpdateColorModeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateColorMode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdatePreferencesPatchInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePreferences"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"preferences"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"colorMode"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateColorModeMutation, UpdateColorModeMutationVariables>;
export const CreateUserNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateUserNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createUserNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"session"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}}]}}]}}]}}]} as unknown as DocumentNode<CreateUserNoteMutation, CreateUserNoteMutationVariables>;
export const DeleteUserNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteUserNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DeleteNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteUserNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"session"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleted"}}]}}]}}]} as unknown as DocumentNode<DeleteUserNoteMutation, DeleteUserNoteMutationVariables>;
export const UserNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"session"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}}]}}]}}]} as unknown as DocumentNode<UserNoteQuery, UserNoteQueryVariables>;
export const UserNotesConnectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserNotesConnection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NonNegativeInt"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userNotesConnection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"session"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}}]}}]}}]}}]} as unknown as DocumentNode<UserNotesConnectionQuery, UserNotesConnectionQueryVariables>;
export const OnNoteCreatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OnNoteCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"noteCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}}]}}]}}]}}]} as unknown as DocumentNode<OnNoteCreatedSubscription, OnNoteCreatedSubscriptionVariables>;
export const OnNoteDeletedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OnNoteDeleted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"noteDeleted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<OnNoteDeletedSubscription, OnNoteDeletedSubscriptionVariables>;
export const OnNoteUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OnNoteUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"noteUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"patch"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}},{"kind":"Field","name":{"kind":"Name","value":"preferences"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"backgroundColor"}}]}}]}}]}}]}}]} as unknown as DocumentNode<OnNoteUpdatedSubscription, OnNoteUpdatedSubscriptionVariables>;
export const UpdateUserNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"session"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}}]}}]}}]}}]} as unknown as DocumentNode<UpdateUserNoteMutation, UpdateUserNoteMutationVariables>;
export const CreateSavedSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSavedSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateSavedSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSavedSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"savedSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"index"}},{"kind":"Field","name":{"kind":"Name","value":"profile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]}}]}}]} as unknown as DocumentNode<CreateSavedSessionMutation, CreateSavedSessionMutationVariables>;
export const DeleteClientSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteClientSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DeleteSavedSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteSavedSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleted"}}]}}]}}]} as unknown as DocumentNode<DeleteClientSessionMutation, DeleteClientSessionMutationVariables>;
export const SavedSessionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SavedSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"savedSessions"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"index"}},{"kind":"Field","name":{"kind":"Name","value":"profile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"currentSavedSession"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"index"}},{"kind":"Field","name":{"kind":"Name","value":"profile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]}}]} as unknown as DocumentNode<SavedSessionsQuery, SavedSessionsQueryVariables>;
export const SignInDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SignIn"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SignInInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signIn"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sessionIndex"}},{"kind":"Field","name":{"kind":"Name","value":"userInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"offlineMode"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"profile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}}]}}]}}]} as unknown as DocumentNode<SignInMutation, SignInMutationVariables>;
export const SignOutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SignOut"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signOut"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signedOut"}},{"kind":"Field","name":{"kind":"Name","value":"activeSessionIndex"}}]}}]}}]} as unknown as DocumentNode<SignOutMutation, SignOutMutationVariables>;
export const SwitchToSavedSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SwitchToSavedSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SwitchToSavedSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"switchToSavedSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"session"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"index"}}]}}]}}]}}]} as unknown as DocumentNode<SwitchToSavedSessionMutation, SwitchToSavedSessionMutationVariables>;