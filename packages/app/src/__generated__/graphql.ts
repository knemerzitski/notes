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
  note?: InputMaybe<NotePatchInput>;
};

export type CreateNotePayload = {
  __typename?: 'CreateNotePayload';
  /** Created note */
  note: Note;
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

export type Edge = {
  /** Self descriptive */
  cursor: Scalars['String']['output'];
  /** Self descriptive */
  node: Node;
};

export type LocalNote = {
  __typename?: 'LocalNote';
  /** Self-descriptive */
  backgroundColor?: Maybe<Scalars['String']['output']>;
  /** Self-descriptive */
  id: Scalars['ID']['output'];
  /** Self-descriptive */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  /** Self-descriptive */
  textContent: Scalars['String']['output'];
  /** Self-descriptive */
  title: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Create a new note */
  createNote?: Maybe<CreateNotePayload>;
  /** Delete note */
  deleteNote: DeleteNotePayload;
  /** On successful sign in, session ID is stored in a http-only cookie. Returns null on failed sign in. */
  signIn?: Maybe<SignInPayload>;
  /** Returns signed out http-conly cookie session index or null if user was not signed in. */
  signOut: SignOutPayload;
  /** Switch session to new index which is tied to http-only session cookie. Returns switched to session index. */
  switchToSession: SwitchToSessionPayload;
  /** Update note */
  updateNote: UpdateNotePayload;
};


export type MutationCreateNoteArgs = {
  input: CreateNoteInput;
};


export type MutationDeleteNoteArgs = {
  input: DeleteNoteInput;
};


export type MutationSignInArgs = {
  input: SignInInput;
};


export type MutationSwitchToSessionArgs = {
  input: SwitchToSessionInput;
};


export type MutationUpdateNoteArgs = {
  input: UpdateNoteInput;
};

export type Node = {
  /** Self descriptive */
  id: Scalars['ID']['output'];
};

export type Note = Node & {
  __typename?: 'Note';
  /** Self-descriptive */
  id: Scalars['ID']['output'];
  /** Note preferences such as note color */
  preferences: NotePreferences;
  /** Is note locked in a read-only state. null => readOnly: false */
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  /** Note plain text content */
  textContent: Scalars['String']['output'];
  /** Note title to summarize note contents */
  title: Scalars['String']['output'];
};

export type NoteConnection = Connection & {
  __typename?: 'NoteConnection';
  /** Self descriptive */
  edges: Array<NoteEdge>;
  /** Query notes directly without edges */
  notes: Array<Note>;
  /** Self descriptive */
  pageInfo: PageInfo;
};

export type NoteCreatedPayload = {
  __typename?: 'NoteCreatedPayload';
  /** Created note info */
  note: Note;
};

export type NoteDeletedPayload = {
  __typename?: 'NoteDeletedPayload';
  /** ID of deleted note */
  id: Scalars['ID']['output'];
};

export type NoteEdge = Edge & {
  __typename?: 'NoteEdge';
  /** Self descriptive */
  cursor: Scalars['String']['output'];
  /** Self descriptive */
  node: Note;
};

export type NotePatch = {
  __typename?: 'NotePatch';
  /** Changed preferences */
  preferences?: Maybe<NotePreferencesPatch>;
  /** Changed note text content */
  textContent?: Maybe<Scalars['String']['output']>;
  /** Changed note title */
  title?: Maybe<Scalars['String']['output']>;
};

export type NotePatchInput = {
  preferences?: InputMaybe<NotePreferencesPatchInput>;
  textContent?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type NotePreferences = {
  __typename?: 'NotePreferences';
  /** Note background color */
  backgroundColor?: Maybe<Scalars['HexColorCode']['output']>;
};

export type NotePreferencesPatch = {
  __typename?: 'NotePreferencesPatch';
  /** Changed note background color */
  backgroundColor?: Maybe<Scalars['HexColorCode']['output']>;
};

export type NotePreferencesPatchInput = {
  backgroundColor?: InputMaybe<Scalars['HexColorCode']['input']>;
};

export type NoteUpdatedPayload = {
  __typename?: 'NoteUpdatedPayload';
  /** ID of note that was updated */
  id: Scalars['ID']['output'];
  /** Changes made to the note */
  patch: NotePatch;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  /** Self descriptive */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Self descriptive */
  hasNextPage: Scalars['Boolean']['output'];
  /** Self descriptive */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** Self descriptive */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type Preferences = {
  __typename?: 'Preferences';
  /** App UI color mode */
  colorMode: ColorMode;
};

export type Profile = {
  __typename?: 'Profile';
  /** User-friendly way to distinguish this user. Can be anything set by the user. */
  displayName: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** savedSessions[currrentSavedSessionIndex] */
  currentSavedSession?: Maybe<SavedSession>;
  /** Current session index. Cached index of session index stored in http-only cookie */
  currentSavedSessionIndex?: Maybe<Scalars['Int']['output']>;
  /** Currently active session index saved in http-only cookie */
  currentSessionIndex: Scalars['NonNegativeInt']['output'];
  /** Currently active user info */
  currentUserInfo: UserInfo;
  /** Currently logged in */
  isLoggedIn: Scalars['Boolean']['output'];
  /** Get note by ID from localStorage */
  localNote: LocalNote;
  /** Get all notes from localStorage */
  localNotes: Array<LocalNote>;
  /** Get note by ID */
  note: Note;
  /** Paginate notes */
  notesConnection: NoteConnection;
  /** User local preferences */
  preferences?: Maybe<Preferences>;
  /** Client only saved session info. Server uses http-only cookie to store an array of session ids. */
  savedSessions: Array<SavedSession>;
  /** Count of sessions saved in http-only cookie */
  sessionCount: Scalars['PositiveInt']['output'];
};


export type QueryLocalNoteArgs = {
  id: Scalars['ID']['input'];
};


export type QueryNoteArgs = {
  id: Scalars['ID']['input'];
};


export type QueryNotesConnectionArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['NonNegativeInt']['input']>;
  last?: InputMaybe<Scalars['NonNegativeInt']['input']>;
};

export enum Role {
  User = 'USER'
}

export type SavedSession = {
  __typename?: 'SavedSession';
  /** Cached displayName of this session. */
  displayName: Scalars['String']['output'];
  /** Email of this session. Is stored only on client-side and not in server. */
  email: Scalars['String']['output'];
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
  currentSessionIndex?: Maybe<Scalars['NonNegativeInt']['output']>;
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

export type SwitchToSessionInput = {
  switchToSessionIndex: Scalars['NonNegativeInt']['input'];
};

export type SwitchToSessionPayload = {
  __typename?: 'SwitchToSessionPayload';
  /** Active session index in http-only cookie */
  currentSessionIndex: Scalars['NonNegativeInt']['output'];
};

export type UpdateNoteInput = {
  id: Scalars['ID']['input'];
  patch?: InputMaybe<NotePatchInput>;
};

export type UpdateNotePayload = {
  __typename?: 'UpdateNotePayload';
  /** Updated note */
  note: Note;
};

/** User information accessible by a query */
export type UserInfo = {
  __typename?: 'UserInfo';
  /** Self-descriptive */
  profile: Profile;
};

export type AppQueryVariables = Exact<{ [key: string]: never; }>;


export type AppQuery = { __typename?: 'Query', preferences?: { __typename?: 'Preferences', colorMode: ColorMode } | null };

export type UseCreateNoteMutationVariables = Exact<{
  input: CreateNoteInput;
}>;


export type UseCreateNoteMutation = { __typename?: 'Mutation', createNote?: { __typename?: 'CreateNotePayload', note: { __typename?: 'Note', id: string | number, title: string, textContent: string } } | null };

export type CreateNoteUpdateNotesConnectionQueryVariables = Exact<{ [key: string]: never; }>;


export type CreateNoteUpdateNotesConnectionQuery = { __typename?: 'Query', notesConnection: { __typename?: 'NoteConnection', notes: Array<{ __typename?: 'Note', id: string | number, title: string, textContent: string }> } };

export type UseDeleteNoteMutationVariables = Exact<{
  input: DeleteNoteInput;
}>;


export type UseDeleteNoteMutation = { __typename?: 'Mutation', deleteNote: { __typename?: 'DeleteNotePayload', deleted: boolean } };

export type UseUpdateNoteMutationVariables = Exact<{
  input: UpdateNoteInput;
}>;


export type UseUpdateNoteMutation = { __typename?: 'Mutation', updateNote: { __typename?: 'UpdateNotePayload', note: { __typename?: 'Note', id: string | number, title: string, textContent: string } } };

export type SessionSwitcherProviderQueryVariables = Exact<{ [key: string]: never; }>;


export type SessionSwitcherProviderQuery = { __typename?: 'Query', currentSavedSessionIndex?: number | null, savedSessions: Array<{ __typename?: 'SavedSession', displayName: string, email: string }> };

export type SignInMutationVariables = Exact<{
  input: SignInInput;
}>;


export type SignInMutation = { __typename?: 'Mutation', signIn?: { __typename?: 'SignInPayload', sessionIndex: number, userInfo: { __typename?: 'UserInfo', profile: { __typename?: 'Profile', displayName: string } } } | null };

export type SignOutMutationVariables = Exact<{ [key: string]: never; }>;


export type SignOutMutation = { __typename?: 'Mutation', signOut: { __typename?: 'SignOutPayload', signedOut: boolean, currentSessionIndex?: number | null } };

export type AccountButtonQueryVariables = Exact<{ [key: string]: never; }>;


export type AccountButtonQuery = { __typename?: 'Query', currentSavedSessionIndex?: number | null, savedSessions: Array<{ __typename?: 'SavedSession', displayName: string, email: string }>, currentSavedSession?: { __typename?: 'SavedSession', displayName: string, email: string } | null };

export type DrawerContentQueryVariables = Exact<{ [key: string]: never; }>;


export type DrawerContentQuery = { __typename?: 'Query', isLoggedIn: boolean };

export type NotesRouteNotesConnectionQueryVariables = Exact<{
  last: Scalars['NonNegativeInt']['input'];
  before?: InputMaybe<Scalars['String']['input']>;
}>;


export type NotesRouteNotesConnectionQuery = { __typename?: 'Query', notesConnection: { __typename?: 'NoteConnection', notes: Array<{ __typename?: 'Note', id: string | number, title: string, textContent: string }>, pageInfo: { __typename?: 'PageInfo', hasPreviousPage: boolean, startCursor?: string | null } } };

export type CommonRoutesQueryQueryVariables = Exact<{ [key: string]: never; }>;


export type CommonRoutesQueryQuery = { __typename?: 'Query', isLoggedIn: boolean };

export type LocalNotesRouteQueryVariables = Exact<{ [key: string]: never; }>;


export type LocalNotesRouteQuery = { __typename?: 'Query', localNotes: Array<{ __typename?: 'LocalNote', id: string | number, title: string, textContent: string }> };

export type LocalEditNoteDialogRouteQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type LocalEditNoteDialogRouteQuery = { __typename?: 'Query', localNote: { __typename?: 'LocalNote', id: string | number, title: string, textContent: string } };

export type EditNoteDialogRouteQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type EditNoteDialogRouteQuery = { __typename?: 'Query', note: { __typename?: 'Note', id: string | number, title: string, textContent: string } };


export const AppDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"App"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"preferences"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"colorMode"}}]}}]}}]} as unknown as DocumentNode<AppQuery, AppQueryVariables>;
export const UseCreateNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UseCreateNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}}]}}]}}]} as unknown as DocumentNode<UseCreateNoteMutation, UseCreateNoteMutationVariables>;
export const CreateNoteUpdateNotesConnectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CreateNoteUpdateNotesConnection"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notesConnection"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}}]}}]}}]} as unknown as DocumentNode<CreateNoteUpdateNotesConnectionQuery, CreateNoteUpdateNotesConnectionQueryVariables>;
export const UseDeleteNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UseDeleteNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DeleteNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleted"}}]}}]}}]} as unknown as DocumentNode<UseDeleteNoteMutation, UseDeleteNoteMutationVariables>;
export const UseUpdateNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UseUpdateNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}}]}}]}}]} as unknown as DocumentNode<UseUpdateNoteMutation, UseUpdateNoteMutationVariables>;
export const SessionSwitcherProviderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SessionSwitcherProvider"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"savedSessions"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"currentSavedSessionIndex"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]}]}}]} as unknown as DocumentNode<SessionSwitcherProviderQuery, SessionSwitcherProviderQueryVariables>;
export const SignInDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SignIn"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SignInInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signIn"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sessionIndex"}},{"kind":"Field","name":{"kind":"Name","value":"userInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}}]}}]}}]} as unknown as DocumentNode<SignInMutation, SignInMutationVariables>;
export const SignOutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SignOut"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signOut"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signedOut"}},{"kind":"Field","name":{"kind":"Name","value":"currentSessionIndex"}}]}}]}}]} as unknown as DocumentNode<SignOutMutation, SignOutMutationVariables>;
export const AccountButtonDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountButton"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"savedSessions"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"currentSavedSessionIndex"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]},{"kind":"Field","name":{"kind":"Name","value":"currentSavedSession"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]} as unknown as DocumentNode<AccountButtonQuery, AccountButtonQueryVariables>;
export const DrawerContentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DrawerContent"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isLoggedIn"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]}]}}]} as unknown as DocumentNode<DrawerContentQuery, DrawerContentQueryVariables>;
export const NotesRouteNotesConnectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"NotesRouteNotesConnection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"last"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NonNegativeInt"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"before"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notesConnection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"last"},"value":{"kind":"Variable","name":{"kind":"Name","value":"last"}}},{"kind":"Argument","name":{"kind":"Name","value":"before"},"value":{"kind":"Variable","name":{"kind":"Name","value":"before"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasPreviousPage"}},{"kind":"Field","name":{"kind":"Name","value":"startCursor"}}]}}]}}]}}]} as unknown as DocumentNode<NotesRouteNotesConnectionQuery, NotesRouteNotesConnectionQueryVariables>;
export const CommonRoutesQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CommonRoutesQuery"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isLoggedIn"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]}]}}]} as unknown as DocumentNode<CommonRoutesQueryQuery, CommonRoutesQueryQueryVariables>;
export const LocalNotesRouteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LocalNotesRoute"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"localNotes"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}}]}}]} as unknown as DocumentNode<LocalNotesRouteQuery, LocalNotesRouteQueryVariables>;
export const LocalEditNoteDialogRouteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LocalEditNoteDialogRoute"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"localNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}}]}}]} as unknown as DocumentNode<LocalEditNoteDialogRouteQuery, LocalEditNoteDialogRouteQueryVariables>;
export const EditNoteDialogRouteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"EditNoteDialogRoute"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}}]}}]} as unknown as DocumentNode<EditNoteDialogRouteQuery, EditNoteDialogRouteQueryVariables>;