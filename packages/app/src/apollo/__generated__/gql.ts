/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 */
const documents = {
    "\n  query App {\n    preferences @client {\n      colorMode\n    }\n  }\n": types.AppDocument,
    "\n  mutation CreateUserNote($input: CreateNoteInput!)  {\n    createUserNote(input: $input) @session {\n      note {\n        id\n        note {\n          id\n          title\n          textContent\n        }\n      }\n    }\n  }\n": types.CreateUserNoteDocument,
    "\n  mutation DeleteUserNote($input: DeleteNoteInput!) {\n    deleteUserNote(input: $input) @session {\n      deleted\n    }\n  }\n": types.DeleteUserNoteDocument,
    "\n  query UserNote($id: ID!) {\n    userNote(id: $id) @session {\n      note {\n        id\n        title\n        textContent\n      }\n    }\n  }\n": types.UserNoteDocument,
    "\n  query UserNotesConnection($first: NonNegativeInt!, $after: String) {\n    userNotesConnection(first: $first, after: $after) @session {\n      notes {\n        note {\n          id\n          title\n          textContent\n        }\n      }\n    }\n  }\n": types.UserNotesConnectionDocument,
    "\n  subscription OnNoteCreated  {\n    noteCreated {\n      note {\n        id\n        note {\n          id\n          title\n          textContent\n        }\n      }\n    }\n  }\n": types.OnNoteCreatedDocument,
    "\n  subscription OnNoteDeleted  {\n    noteDeleted {\n      id\n    }\n  }\n": types.OnNoteDeletedDocument,
    "\n  subscription OnNoteUpdated  {\n    noteUpdated {\n      id\n      patch {\n        note {\n          title\n          textContent\n        }\n        preferences {\n          backgroundColor\n        }\n      }\n    }\n  }\n": types.OnNoteUpdatedDocument,
    "\n  mutation UpdateUserNote($input: UpdateNoteInput!)  {\n    updateUserNote(input: $input) @session{ \n      note {\n        note {\n          id\n          title\n          textContent\n        }\n      }\n    }\n  }\n": types.UpdateUserNoteDocument,
    "\n  query SessionSwitcherProvider {\n    savedSessions @client {\n      displayName\n      email\n    }\n    currentSavedSessionIndex @client\n  }\n": types.SessionSwitcherProviderDocument,
    "\n  mutation SignIn($input: SignInInput!)  {\n    signIn(input: $input) {\n      sessionIndex\n      userInfo {\n        offlineMode {\n          id\n        }\n        profile {\n          displayName\n        }\n      }\n    }\n  }\n": types.SignInDocument,
    "\n  mutation SignOut {\n    signOut {\n      signedOut\n      activeSessionIndex\n    }\n  }\n": types.SignOutDocument,
    "\n  query AccountButton {\n    savedSessions @client {\n      displayName\n      email\n    }\n\n    currentSavedSessionIndex @client\n    \n    currentSavedSession @client {\n      displayName\n      email\n    }\n  }\n": types.AccountButtonDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query App {\n    preferences @client {\n      colorMode\n    }\n  }\n"): (typeof documents)["\n  query App {\n    preferences @client {\n      colorMode\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation CreateUserNote($input: CreateNoteInput!)  {\n    createUserNote(input: $input) @session {\n      note {\n        id\n        note {\n          id\n          title\n          textContent\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateUserNote($input: CreateNoteInput!)  {\n    createUserNote(input: $input) @session {\n      note {\n        id\n        note {\n          id\n          title\n          textContent\n        }\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation DeleteUserNote($input: DeleteNoteInput!) {\n    deleteUserNote(input: $input) @session {\n      deleted\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteUserNote($input: DeleteNoteInput!) {\n    deleteUserNote(input: $input) @session {\n      deleted\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query UserNote($id: ID!) {\n    userNote(id: $id) @session {\n      note {\n        id\n        title\n        textContent\n      }\n    }\n  }\n"): (typeof documents)["\n  query UserNote($id: ID!) {\n    userNote(id: $id) @session {\n      note {\n        id\n        title\n        textContent\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query UserNotesConnection($first: NonNegativeInt!, $after: String) {\n    userNotesConnection(first: $first, after: $after) @session {\n      notes {\n        note {\n          id\n          title\n          textContent\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query UserNotesConnection($first: NonNegativeInt!, $after: String) {\n    userNotesConnection(first: $first, after: $after) @session {\n      notes {\n        note {\n          id\n          title\n          textContent\n        }\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  subscription OnNoteCreated  {\n    noteCreated {\n      note {\n        id\n        note {\n          id\n          title\n          textContent\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  subscription OnNoteCreated  {\n    noteCreated {\n      note {\n        id\n        note {\n          id\n          title\n          textContent\n        }\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  subscription OnNoteDeleted  {\n    noteDeleted {\n      id\n    }\n  }\n"): (typeof documents)["\n  subscription OnNoteDeleted  {\n    noteDeleted {\n      id\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  subscription OnNoteUpdated  {\n    noteUpdated {\n      id\n      patch {\n        note {\n          title\n          textContent\n        }\n        preferences {\n          backgroundColor\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  subscription OnNoteUpdated  {\n    noteUpdated {\n      id\n      patch {\n        note {\n          title\n          textContent\n        }\n        preferences {\n          backgroundColor\n        }\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation UpdateUserNote($input: UpdateNoteInput!)  {\n    updateUserNote(input: $input) @session{ \n      note {\n        note {\n          id\n          title\n          textContent\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateUserNote($input: UpdateNoteInput!)  {\n    updateUserNote(input: $input) @session{ \n      note {\n        note {\n          id\n          title\n          textContent\n        }\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query SessionSwitcherProvider {\n    savedSessions @client {\n      displayName\n      email\n    }\n    currentSavedSessionIndex @client\n  }\n"): (typeof documents)["\n  query SessionSwitcherProvider {\n    savedSessions @client {\n      displayName\n      email\n    }\n    currentSavedSessionIndex @client\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation SignIn($input: SignInInput!)  {\n    signIn(input: $input) {\n      sessionIndex\n      userInfo {\n        offlineMode {\n          id\n        }\n        profile {\n          displayName\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation SignIn($input: SignInInput!)  {\n    signIn(input: $input) {\n      sessionIndex\n      userInfo {\n        offlineMode {\n          id\n        }\n        profile {\n          displayName\n        }\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation SignOut {\n    signOut {\n      signedOut\n      activeSessionIndex\n    }\n  }\n"): (typeof documents)["\n  mutation SignOut {\n    signOut {\n      signedOut\n      activeSessionIndex\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query AccountButton {\n    savedSessions @client {\n      displayName\n      email\n    }\n\n    currentSavedSessionIndex @client\n    \n    currentSavedSession @client {\n      displayName\n      email\n    }\n  }\n"): (typeof documents)["\n  query AccountButton {\n    savedSessions @client {\n      displayName\n      email\n    }\n\n    currentSavedSessionIndex @client\n    \n    currentSavedSession @client {\n      displayName\n      email\n    }\n  }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;