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
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Date: { input: any; output: any; }
  HexColorCode: { input: any; output: any; }
  /** int >= 0 */
  NonNegativeInt: { input: any; output: any; }
  /** int > 0 */
  PositiveInt: { input: any; output: any; }
};

export enum AuthProvider {
  Google = 'GOOGLE'
}

export type ClientSession = LocalSession | RemoteSession;

export enum ColorMode {
  Dark = 'DARK',
  Light = 'LIGHT'
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

export type LocalSession = {
  __typename?: 'LocalSession';
  /** Displayed name */
  displayName: Scalars['String']['output'];
  /** Generated id for local session */
  id: Scalars['ID']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Creates new local session with provided display name. Returns session index. */
  createLocalSession: Scalars['Int']['output'];
  /** Call this mutation after successful remote sign in. Returns session index. */
  createRemoteSession: Scalars['Int']['output'];
  /** Create a new note to current user */
  createUserNote?: Maybe<CreateNotePayload>;
  /** Deletes client session and returns deleted session ID */
  deleteClientSession: Scalars['Boolean']['output'];
  /** Delete note */
  deleteUserNote: DeleteNotePayload;
  /** On successful sign in, session ID is stored in a http-only cookie. Returns null on failed sign in. */
  signIn?: Maybe<SignInPayload>;
  /** Returns signed out http-conly cookie session index or null if user was not signed in. */
  signOut: SignOutPayload;
  /** Switch client session and returns switched to session index. */
  switchToClientSession: Scalars['Boolean']['output'];
  /** Switch session to new index which is tied to http-only session cookie. Returns switched to session index. */
  switchToSession: SwitchToSessionPayload;
  /** Updates user preferred color mode */
  updateColorMode: Scalars['Boolean']['output'];
  /** Update note */
  updateUserNote: UpdateNotePayload;
};


export type MutationCreateLocalSessionArgs = {
  displayName: Scalars['String']['input'];
};


export type MutationCreateRemoteSessionArgs = {
  input: RemoteSessionInput;
};


export type MutationCreateUserNoteArgs = {
  input: CreateNoteInput;
};


export type MutationDeleteClientSessionArgs = {
  index: Scalars['Int']['input'];
};


export type MutationDeleteUserNoteArgs = {
  input: DeleteNoteInput;
};


export type MutationSignInArgs = {
  input: SignInInput;
};


export type MutationSwitchToClientSessionArgs = {
  index: Scalars['Int']['input'];
};


export type MutationSwitchToSessionArgs = {
  input: SwitchToSessionInput;
};


export type MutationUpdateColorModeArgs = {
  colorMode: ColorMode;
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
  colorMode?: Maybe<ColorMode>;
};

export type Profile = {
  __typename?: 'Profile';
  /** User-friendly way to distinguish this user. Can be anything set by the user. */
  displayName: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Active session. If no session exists, a new local session is created. */
  activeClientSessionIndex: Scalars['Int']['output'];
  /** Currently active session index saved in http-only cookie */
  activeSessionIndex: Scalars['NonNegativeInt']['output'];
  /** Currently active user info */
  activeUserInfo: UserInfo;
  /** Session information stored on client-side. Both local and remote sessions */
  clientSessions: Array<ClientSession>;
  /** Get user preferences, such as color mode */
  preferences?: Maybe<Preferences>;
  /** Count of sessions saved in http-only cookie */
  sessionCount: Scalars['PositiveInt']['output'];
  /** Get current user note by ID */
  userNote: UserNote;
  /** Paginate current user notes */
  userNotesConnection: UserNoteConnection;
};


export type QueryUserNoteArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserNotesConnectionArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['NonNegativeInt']['input'];
};

export type RemoteSession = {
  __typename?: 'RemoteSession';
  /** Index of session stored in http-only cookie */
  cookieIndex: Scalars['Int']['output'];
  displayName: Scalars['String']['output'];
  /** Email tied to current session */
  email: Scalars['String']['output'];
};

export type RemoteSessionInput = {
  cookieIndex: Scalars['Int']['input'];
  displayName: Scalars['String']['input'];
  email: Scalars['String']['input'];
};

export enum Role {
  User = 'USER'
}

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

export type SwitchToSessionInput = {
  switchToSessionIndex: Scalars['NonNegativeInt']['input'];
};

export type SwitchToSessionPayload = {
  __typename?: 'SwitchToSessionPayload';
  /** Active session index in http-only cookie */
  activeSessionIndex: Scalars['NonNegativeInt']['output'];
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


export type PreferencesQuery = { __typename?: 'Query', preferences?: { __typename?: 'Preferences', colorMode?: ColorMode | null } | null };

export type UpdateColorModeMutationVariables = Exact<{
  colorMode: ColorMode;
}>;


export type UpdateColorModeMutation = { __typename?: 'Mutation', updateColorMode: boolean };

export type CreateUserNoteMutationVariables = Exact<{
  input: CreateNoteInput;
}>;


export type CreateUserNoteMutation = { __typename?: 'Mutation', createUserNote?: { __typename?: 'CreateNotePayload', note: { __typename?: 'UserNote', id: string, note: { __typename?: 'Note', id: string, title: string, textContent: string } } } | null };

export type DeleteUserNoteMutationVariables = Exact<{
  input: DeleteNoteInput;
}>;


export type DeleteUserNoteMutation = { __typename?: 'Mutation', deleteUserNote: { __typename?: 'DeleteNotePayload', deleted: boolean } };

export type UserNoteQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UserNoteQuery = { __typename?: 'Query', userNote: { __typename?: 'UserNote', note: { __typename?: 'Note', id: string, title: string, textContent: string } } };

export type UserNotesConnectionQueryVariables = Exact<{
  first: Scalars['NonNegativeInt']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type UserNotesConnectionQuery = { __typename?: 'Query', userNotesConnection: { __typename?: 'UserNoteConnection', notes: Array<{ __typename?: 'UserNote', note: { __typename?: 'Note', id: string, title: string, textContent: string } }> } };

export type OnNoteCreatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnNoteCreatedSubscription = { __typename?: 'Subscription', noteCreated: { __typename?: 'NoteCreatedPayload', note: { __typename?: 'UserNote', id: string, note: { __typename?: 'Note', id: string, title: string, textContent: string } } } };

export type OnNoteDeletedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnNoteDeletedSubscription = { __typename?: 'Subscription', noteDeleted: { __typename?: 'NoteDeletedPayload', id: string } };

export type OnNoteUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnNoteUpdatedSubscription = { __typename?: 'Subscription', noteUpdated: { __typename?: 'NoteUpdatedPayload', id: string, patch: { __typename?: 'UserNotePatch', note?: { __typename?: 'NotePatch', title?: string | null, textContent?: string | null } | null, preferences?: { __typename?: 'UserNotePreferencesPatch', backgroundColor?: any | null } | null } } };

export type UpdateUserNoteMutationVariables = Exact<{
  input: UpdateNoteInput;
}>;


export type UpdateUserNoteMutation = { __typename?: 'Mutation', updateUserNote: { __typename?: 'UpdateNotePayload', note: { __typename?: 'UserNote', note: { __typename?: 'Note', id: string, title: string, textContent: string } } } };

export type CreateLocalSessionMutationVariables = Exact<{
  displayName: Scalars['String']['input'];
}>;


export type CreateLocalSessionMutation = { __typename?: 'Mutation', createLocalSession: number };

export type CreateRemoteSessionMutationVariables = Exact<{
  input: RemoteSessionInput;
}>;


export type CreateRemoteSessionMutation = { __typename?: 'Mutation', createRemoteSession: number };

export type DeleteClientSessionMutationVariables = Exact<{
  index: Scalars['Int']['input'];
}>;


export type DeleteClientSessionMutation = { __typename?: 'Mutation', deleteClientSession: boolean };

export type ClientSessionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ClientSessionsQuery = { __typename?: 'Query', activeClientSessionIndex: number, clientSessions: Array<{ __typename: 'LocalSession', id: string, displayName: string } | { __typename: 'RemoteSession', cookieIndex: number, displayName: string, email: string }> };

export type SignInMutationVariables = Exact<{
  input: SignInInput;
}>;


export type SignInMutation = { __typename?: 'Mutation', signIn?: { __typename?: 'SignInPayload', sessionIndex: any, userInfo: { __typename?: 'UserInfo', offlineMode: { __typename?: 'OfflineMode', id: string }, profile: { __typename?: 'Profile', displayName: string } } } | null };

export type SignOutMutationVariables = Exact<{ [key: string]: never; }>;


export type SignOutMutation = { __typename?: 'Mutation', signOut: { __typename?: 'SignOutPayload', signedOut: boolean, activeSessionIndex?: any | null } };

export type SwitchToClientSessionMutationVariables = Exact<{
  index: Scalars['Int']['input'];
}>;


export type SwitchToClientSessionMutation = { __typename?: 'Mutation', switchToClientSession: boolean };


export const PreferencesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Preferences"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"preferences"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"colorMode"}}]}}]}}]} as unknown as DocumentNode<PreferencesQuery, PreferencesQueryVariables>;
export const UpdateColorModeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateColorMode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"colorMode"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ColorMode"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateColorMode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"colorMode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"colorMode"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]}]}}]} as unknown as DocumentNode<UpdateColorModeMutation, UpdateColorModeMutationVariables>;
export const CreateUserNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateUserNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createUserNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"session"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}}]}}]}}]}}]} as unknown as DocumentNode<CreateUserNoteMutation, CreateUserNoteMutationVariables>;
export const DeleteUserNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteUserNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DeleteNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteUserNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"session"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleted"}}]}}]}}]} as unknown as DocumentNode<DeleteUserNoteMutation, DeleteUserNoteMutationVariables>;
export const UserNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"session"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}}]}}]}}]} as unknown as DocumentNode<UserNoteQuery, UserNoteQueryVariables>;
export const UserNotesConnectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserNotesConnection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"NonNegativeInt"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userNotesConnection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"session"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}}]}}]}}]}}]} as unknown as DocumentNode<UserNotesConnectionQuery, UserNotesConnectionQueryVariables>;
export const OnNoteCreatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OnNoteCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"noteCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}}]}}]}}]}}]} as unknown as DocumentNode<OnNoteCreatedSubscription, OnNoteCreatedSubscriptionVariables>;
export const OnNoteDeletedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OnNoteDeleted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"noteDeleted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<OnNoteDeletedSubscription, OnNoteDeletedSubscriptionVariables>;
export const OnNoteUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OnNoteUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"noteUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"patch"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}},{"kind":"Field","name":{"kind":"Name","value":"preferences"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"backgroundColor"}}]}}]}}]}}]}}]} as unknown as DocumentNode<OnNoteUpdatedSubscription, OnNoteUpdatedSubscriptionVariables>;
export const UpdateUserNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"session"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"textContent"}}]}}]}}]}}]}}]} as unknown as DocumentNode<UpdateUserNoteMutation, UpdateUserNoteMutationVariables>;
export const CreateLocalSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateLocalSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"displayName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createLocalSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"displayName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"displayName"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]}]}}]} as unknown as DocumentNode<CreateLocalSessionMutation, CreateLocalSessionMutationVariables>;
export const CreateRemoteSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateRemoteSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RemoteSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createRemoteSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]}]}}]} as unknown as DocumentNode<CreateRemoteSessionMutation, CreateRemoteSessionMutationVariables>;
export const DeleteClientSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteClientSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"index"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteClientSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"index"},"value":{"kind":"Variable","name":{"kind":"Name","value":"index"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]}]}}]} as unknown as DocumentNode<DeleteClientSessionMutation, DeleteClientSessionMutationVariables>;
export const ClientSessionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ClientSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"clientSessions"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LocalSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RemoteSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cookieIndex"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"activeClientSessionIndex"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]}]}}]} as unknown as DocumentNode<ClientSessionsQuery, ClientSessionsQueryVariables>;
export const SignInDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SignIn"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SignInInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signIn"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sessionIndex"}},{"kind":"Field","name":{"kind":"Name","value":"userInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"offlineMode"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"profile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}}]}}]}}]} as unknown as DocumentNode<SignInMutation, SignInMutationVariables>;
export const SignOutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SignOut"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signOut"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signedOut"}},{"kind":"Field","name":{"kind":"Name","value":"activeSessionIndex"}}]}}]}}]} as unknown as DocumentNode<SignOutMutation, SignOutMutationVariables>;
export const SwitchToClientSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SwitchToClientSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"index"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"switchToClientSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"index"},"value":{"kind":"Variable","name":{"kind":"Name","value":"index"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]}]}}]} as unknown as DocumentNode<SwitchToClientSessionMutation, SwitchToClientSessionMutationVariables>;