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
    "\n  query Preferences {\n    preferences @client {\n      colorMode\n    }\n  }\n": types.PreferencesDocument,
    "\n  mutation UpdateColorMode($colorMode: ColorMode!) {\n    updateColorMode(colorMode: $colorMode) @client\n  }\n": types.UpdateColorModeDocument,
    "\n  mutation CreateNote($input: CreateNoteInput!)  {\n    createNote(input: $input) @session {\n      id\n      title\n      content\n    }\n  }\n": types.CreateNoteDocument,
    "\n  mutation DeleteNote($id: ID!) {\n    deleteNote(id: $id) @session\n  }\n": types.DeleteNoteDocument,
    "\n  query Note($id: String!) {\n    note(id: $id) @session {\n      id\n      title\n      content\n    }\n  }\n": types.NoteDocument,
    "\n  query Notes {\n    notes @session {\n      id\n      title\n      content\n    }\n  }\n": types.NotesDocument,
    "\n  subscription OnNoteCreated  {\n    noteCreated {\n      id\n      title\n      content\n    }\n  }\n": types.OnNoteCreatedDocument,
    "\n  subscription OnNoteDeleted  {\n    noteDeleted\n  }\n": types.OnNoteDeletedDocument,
    "\n  subscription OnNoteUpdated  {\n    noteUpdated {\n      id\n      title\n      content\n    }\n  }\n": types.OnNoteUpdatedDocument,
    "\n  mutation UpdateNote($input: UpdateNoteInput!)  {\n    updateNote(input: $input) @session\n  }\n": types.UpdateNoteDocument,
    "\n  mutation CreateLocalSession($displayName: String!)  {\n    createLocalSession(displayName: $displayName) @client\n  }\n": types.CreateLocalSessionDocument,
    "\n  mutation CreateRemoteSession($input: RemoteSessionInput!)  {\n    createRemoteSession(input: $input) @client\n  }\n": types.CreateRemoteSessionDocument,
    "\n  mutation DeleteClientSession($index: Int!)  {\n    deleteClientSession(index: $index) @client\n  }\n": types.DeleteClientSessionDocument,
    "\n  query SessionQuery {\n\n    clientSessions @client {\n      __typename\n      ... on LocalSession {\n        id\n        displayName\n      }\n      ... on RemoteSession {\n        cookieIndex\n        displayName\n        email\n      }\n    }\n\n    activeClientSessionIndex @client\n  }\n": types.SessionQueryDocument,
    "\n  mutation SignIn($input: SignInInput!)  {\n    signIn(input: $input)\n  }\n": types.SignInDocument,
    "\n  mutation SignOut {\n    signOut\n  }\n": types.SignOutDocument,
    "\n  mutation SwitchToClientSession($index: Int!)  {\n    switchToClientSession(index: $index) @client\n  }\n": types.SwitchToClientSessionDocument,
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
export function gql(source: "\n  query Preferences {\n    preferences @client {\n      colorMode\n    }\n  }\n"): (typeof documents)["\n  query Preferences {\n    preferences @client {\n      colorMode\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation UpdateColorMode($colorMode: ColorMode!) {\n    updateColorMode(colorMode: $colorMode) @client\n  }\n"): (typeof documents)["\n  mutation UpdateColorMode($colorMode: ColorMode!) {\n    updateColorMode(colorMode: $colorMode) @client\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation CreateNote($input: CreateNoteInput!)  {\n    createNote(input: $input) @session {\n      id\n      title\n      content\n    }\n  }\n"): (typeof documents)["\n  mutation CreateNote($input: CreateNoteInput!)  {\n    createNote(input: $input) @session {\n      id\n      title\n      content\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation DeleteNote($id: ID!) {\n    deleteNote(id: $id) @session\n  }\n"): (typeof documents)["\n  mutation DeleteNote($id: ID!) {\n    deleteNote(id: $id) @session\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query Note($id: String!) {\n    note(id: $id) @session {\n      id\n      title\n      content\n    }\n  }\n"): (typeof documents)["\n  query Note($id: String!) {\n    note(id: $id) @session {\n      id\n      title\n      content\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query Notes {\n    notes @session {\n      id\n      title\n      content\n    }\n  }\n"): (typeof documents)["\n  query Notes {\n    notes @session {\n      id\n      title\n      content\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  subscription OnNoteCreated  {\n    noteCreated {\n      id\n      title\n      content\n    }\n  }\n"): (typeof documents)["\n  subscription OnNoteCreated  {\n    noteCreated {\n      id\n      title\n      content\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  subscription OnNoteDeleted  {\n    noteDeleted\n  }\n"): (typeof documents)["\n  subscription OnNoteDeleted  {\n    noteDeleted\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  subscription OnNoteUpdated  {\n    noteUpdated {\n      id\n      title\n      content\n    }\n  }\n"): (typeof documents)["\n  subscription OnNoteUpdated  {\n    noteUpdated {\n      id\n      title\n      content\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation UpdateNote($input: UpdateNoteInput!)  {\n    updateNote(input: $input) @session\n  }\n"): (typeof documents)["\n  mutation UpdateNote($input: UpdateNoteInput!)  {\n    updateNote(input: $input) @session\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation CreateLocalSession($displayName: String!)  {\n    createLocalSession(displayName: $displayName) @client\n  }\n"): (typeof documents)["\n  mutation CreateLocalSession($displayName: String!)  {\n    createLocalSession(displayName: $displayName) @client\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation CreateRemoteSession($input: RemoteSessionInput!)  {\n    createRemoteSession(input: $input) @client\n  }\n"): (typeof documents)["\n  mutation CreateRemoteSession($input: RemoteSessionInput!)  {\n    createRemoteSession(input: $input) @client\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation DeleteClientSession($index: Int!)  {\n    deleteClientSession(index: $index) @client\n  }\n"): (typeof documents)["\n  mutation DeleteClientSession($index: Int!)  {\n    deleteClientSession(index: $index) @client\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query SessionQuery {\n\n    clientSessions @client {\n      __typename\n      ... on LocalSession {\n        id\n        displayName\n      }\n      ... on RemoteSession {\n        cookieIndex\n        displayName\n        email\n      }\n    }\n\n    activeClientSessionIndex @client\n  }\n"): (typeof documents)["\n  query SessionQuery {\n\n    clientSessions @client {\n      __typename\n      ... on LocalSession {\n        id\n        displayName\n      }\n      ... on RemoteSession {\n        cookieIndex\n        displayName\n        email\n      }\n    }\n\n    activeClientSessionIndex @client\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation SignIn($input: SignInInput!)  {\n    signIn(input: $input)\n  }\n"): (typeof documents)["\n  mutation SignIn($input: SignInInput!)  {\n    signIn(input: $input)\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation SignOut {\n    signOut\n  }\n"): (typeof documents)["\n  mutation SignOut {\n    signOut\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation SwitchToClientSession($index: Int!)  {\n    switchToClientSession(index: $index) @client\n  }\n"): (typeof documents)["\n  mutation SwitchToClientSession($index: Int!)  {\n    switchToClientSession(index: $index) @client\n  }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;