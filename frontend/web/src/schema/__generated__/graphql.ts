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
};

export enum AuthProvider {
  Google = 'GOOGLE'
}

export type ClientSession = LocalSession | RemoteSession;

export enum ColorMode {
  Dark = 'DARK',
  Light = 'LIGHT'
}

export type CreateNoteInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type LocalSession = {
  __typename?: 'LocalSession';
  displayName: Scalars['String']['output'];
  /** Generated id for local session */
  id: Scalars['ID']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Creates new local session with provided display name. Returns session index. */
  createLocalSession: Scalars['Int']['output'];
  /** Create a new note belonging to a user of active session */
  createNote?: Maybe<Note>;
  /** Call this mutation after successful remote sign in. Returns session index. */
  createRemoteSession: Scalars['Int']['output'];
  /** Deletes client session and returns deleted session ID */
  deleteClientSession: Scalars['Boolean']['output'];
  /** Delete note by ID belonging to a user of active session */
  deleteNote: Scalars['Boolean']['output'];
  /** On successful sign in, session id is stored in a http-only cookie. Index of that id is returned. If couldn't sign in, -1 is returned instead. */
  signIn: Scalars['Int']['output'];
  /** Returns signed out cookie session index or -1 was not signed in. */
  signOut: Scalars['Int']['output'];
  /** Switch client session and returns switched to session index. */
  switchToClientSession: Scalars['Boolean']['output'];
  /** Switch session to new index which is tied to http-only session cookie. Returns switched to session index. */
  switchToSession: Scalars['Int']['output'];
  updateColorMode: Scalars['Boolean']['output'];
  /** Update note by ID belonging to a user of active session */
  updateNote: Scalars['Boolean']['output'];
};


export type MutationCreateLocalSessionArgs = {
  displayName: Scalars['String']['input'];
};


export type MutationCreateNoteArgs = {
  input: CreateNoteInput;
};


export type MutationCreateRemoteSessionArgs = {
  input: RemoteSessionInput;
};


export type MutationDeleteClientSessionArgs = {
  index: Scalars['Int']['input'];
};


export type MutationDeleteNoteArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSignInArgs = {
  input: SignInInput;
};


export type MutationSwitchToClientSessionArgs = {
  index: Scalars['Int']['input'];
};


export type MutationSwitchToSessionArgs = {
  index: Scalars['Int']['input'];
};


export type MutationUpdateColorModeArgs = {
  colorMode: ColorMode;
};


export type MutationUpdateNoteArgs = {
  input: UpdateNoteInput;
};

export type Note = {
  __typename?: 'Note';
  /** Note text contents */
  content?: Maybe<Scalars['String']['output']>;
  /** Note unique ID */
  id: Scalars['ID']['output'];
  /** Note title */
  title?: Maybe<Scalars['String']['output']>;
};

export type Preferences = {
  __typename?: 'Preferences';
  colorMode?: Maybe<ColorMode>;
};

export type Query = {
  __typename?: 'Query';
  /** Active session. If no session exists, a new local session is created. */
  activeClientSessionIndex: Scalars['Int']['output'];
  /** Currently active session index saved in http-only cookie */
  activeSessionIndex?: Maybe<Scalars['Int']['output']>;
  /** Session information stored on client-side. Both local and remote sessions */
  clientSessions: Array<ClientSession>;
  /** Get note by ID belonging to a user of active session */
  note?: Maybe<Note>;
  /** Get all notes belonging to a user of active session */
  notes?: Maybe<Array<Note>>;
  /** Get user preferences, such as color mode */
  preferences?: Maybe<Preferences>;
  /** Count of sessions saved in http-only cookie */
  sessionCount?: Maybe<Scalars['Int']['output']>;
};


export type QueryNoteArgs = {
  id: Scalars['String']['input'];
};

export type RemoteSession = {
  __typename?: 'RemoteSession';
  /** Index of session stored in http-only cookie */
  cookieIndex: Scalars['Int']['output'];
  displayName: Scalars['String']['output'];
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

export type Session = {
  __typename?: 'Session';
  /** Session ID */
  id: Scalars['ID']['output'];
  /** User that is using this session */
  userId: Scalars['ID']['output'];
};

export type SignInInput = {
  provider: AuthProvider;
  token: Scalars['String']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** New created note TODO subscriptions only for testing, lacking auth... */
  noteCreated: Note;
  /** Removed note ID TODO subscriptions only for testing, lacking auth... */
  noteDeleted: Scalars['ID']['output'];
  /** Updated note TODO subscriptions only for testing, lacking auth... */
  noteUpdated: Note;
};

export type UpdateNoteInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  /** User unique ID */
  id: Scalars['ID']['output'];
};

export type PreferencesQueryVariables = Exact<{ [key: string]: never; }>;


export type PreferencesQuery = { __typename?: 'Query', preferences?: { __typename?: 'Preferences', colorMode?: ColorMode | null } | null };

export type UpdateColorModeMutationVariables = Exact<{
  colorMode: ColorMode;
}>;


export type UpdateColorModeMutation = { __typename?: 'Mutation', updateColorMode: boolean };

export type CreateNoteMutationVariables = Exact<{
  input: CreateNoteInput;
}>;


export type CreateNoteMutation = { __typename?: 'Mutation', createNote?: { __typename?: 'Note', id: string, title?: string | null, content?: string | null } | null };

export type DeleteNoteMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteNoteMutation = { __typename?: 'Mutation', deleteNote: boolean };

export type NoteQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type NoteQuery = { __typename?: 'Query', note?: { __typename?: 'Note', id: string, title?: string | null, content?: string | null } | null };

export type NotesQueryVariables = Exact<{ [key: string]: never; }>;


export type NotesQuery = { __typename?: 'Query', notes?: Array<{ __typename?: 'Note', id: string, title?: string | null, content?: string | null }> | null };

export type OnNoteCreatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnNoteCreatedSubscription = { __typename?: 'Subscription', noteCreated: { __typename?: 'Note', id: string, title?: string | null, content?: string | null } };

export type OnNoteDeletedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnNoteDeletedSubscription = { __typename?: 'Subscription', noteDeleted: string };

export type OnNoteUpdatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnNoteUpdatedSubscription = { __typename?: 'Subscription', noteUpdated: { __typename?: 'Note', id: string, title?: string | null, content?: string | null } };

export type UpdateNoteMutationVariables = Exact<{
  input: UpdateNoteInput;
}>;


export type UpdateNoteMutation = { __typename?: 'Mutation', updateNote: boolean };

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

export type SessionQueryQueryVariables = Exact<{ [key: string]: never; }>;


export type SessionQueryQuery = { __typename?: 'Query', activeClientSessionIndex: number, clientSessions: Array<{ __typename: 'LocalSession', id: string, displayName: string } | { __typename: 'RemoteSession', cookieIndex: number, displayName: string, email: string }> };

export type SignInMutationVariables = Exact<{
  input: SignInInput;
}>;


export type SignInMutation = { __typename?: 'Mutation', signIn: number };

export type SignOutMutationVariables = Exact<{ [key: string]: never; }>;


export type SignOutMutation = { __typename?: 'Mutation', signOut: number };

export type SwitchToClientSessionMutationVariables = Exact<{
  index: Scalars['Int']['input'];
}>;


export type SwitchToClientSessionMutation = { __typename?: 'Mutation', switchToClientSession: boolean };


export const PreferencesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Preferences"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"preferences"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"colorMode"}}]}}]}}]} as unknown as DocumentNode<PreferencesQuery, PreferencesQueryVariables>;
export const UpdateColorModeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateColorMode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"colorMode"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ColorMode"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateColorMode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"colorMode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"colorMode"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]}]}}]} as unknown as DocumentNode<UpdateColorModeMutation, UpdateColorModeMutationVariables>;
export const CreateNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"session"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}}]}}]}}]} as unknown as DocumentNode<CreateNoteMutation, CreateNoteMutationVariables>;
export const DeleteNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"session"}}]}]}}]} as unknown as DocumentNode<DeleteNoteMutation, DeleteNoteMutationVariables>;
export const NoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Note"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"note"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"session"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}}]}}]}}]} as unknown as DocumentNode<NoteQuery, NoteQueryVariables>;
export const NotesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Notes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notes"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"session"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}}]}}]}}]} as unknown as DocumentNode<NotesQuery, NotesQueryVariables>;
export const OnNoteCreatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OnNoteCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"noteCreated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}}]}}]}}]} as unknown as DocumentNode<OnNoteCreatedSubscription, OnNoteCreatedSubscriptionVariables>;
export const OnNoteDeletedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OnNoteDeleted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"noteDeleted"}}]}}]} as unknown as DocumentNode<OnNoteDeletedSubscription, OnNoteDeletedSubscriptionVariables>;
export const OnNoteUpdatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OnNoteUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"noteUpdated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}}]}}]}}]} as unknown as DocumentNode<OnNoteUpdatedSubscription, OnNoteUpdatedSubscriptionVariables>;
export const UpdateNoteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateNote"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateNoteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateNote"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"session"}}]}]}}]} as unknown as DocumentNode<UpdateNoteMutation, UpdateNoteMutationVariables>;
export const CreateLocalSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateLocalSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"displayName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createLocalSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"displayName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"displayName"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]}]}}]} as unknown as DocumentNode<CreateLocalSessionMutation, CreateLocalSessionMutationVariables>;
export const CreateRemoteSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateRemoteSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RemoteSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createRemoteSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]}]}}]} as unknown as DocumentNode<CreateRemoteSessionMutation, CreateRemoteSessionMutationVariables>;
export const DeleteClientSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteClientSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"index"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteClientSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"index"},"value":{"kind":"Variable","name":{"kind":"Name","value":"index"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]}]}}]} as unknown as DocumentNode<DeleteClientSessionMutation, DeleteClientSessionMutationVariables>;
export const SessionQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SessionQuery"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"clientSessions"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LocalSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RemoteSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cookieIndex"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"activeClientSessionIndex"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]}]}}]} as unknown as DocumentNode<SessionQueryQuery, SessionQueryQueryVariables>;
export const SignInDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SignIn"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SignInInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signIn"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SignInMutation, SignInMutationVariables>;
export const SignOutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SignOut"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signOut"}}]}}]} as unknown as DocumentNode<SignOutMutation, SignOutMutationVariables>;
export const SwitchToClientSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SwitchToClientSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"index"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"switchToClientSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"index"},"value":{"kind":"Variable","name":{"kind":"Name","value":"index"}}}],"directives":[{"kind":"Directive","name":{"kind":"Name","value":"client"}}]}]}}]} as unknown as DocumentNode<SwitchToClientSessionMutation, SwitchToClientSessionMutationVariables>;