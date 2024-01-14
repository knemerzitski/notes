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
    "\n  mutation UseCreateNote($input: CreateNoteInput!)  {\n    createNote(input: $input) {\n      note {\n        id\n        title\n        textContent\n      }\n    }\n  }\n": types.UseCreateNoteDocument,
    "\n              query CreateNoteUpdateNotesConnection {\n                notesConnection {\n                  notes {\n                    id\n                    title\n                    textContent\n                  }\n                }\n              }\n          ": types.CreateNoteUpdateNotesConnectionDocument,
    "\n  mutation UseDeleteNote($input: DeleteNoteInput!) {\n    deleteNote(input: $input) {\n      deleted\n    }\n  }\n": types.UseDeleteNoteDocument,
    "\n  mutation UseUpdateNote($input: UpdateNoteInput!)  {\n    updateNote(input: $input) {\n      note {\n        id\n        title\n        textContent\n      }\n    }\n  }\n": types.UseUpdateNoteDocument,
    "\n  query SessionSwitcherProvider {\n    savedSessions @client {\n      displayName\n      email\n    }\n    currentSavedSessionIndex @client\n  }\n": types.SessionSwitcherProviderDocument,
    "\n  mutation SignIn($input: SignInInput!)  {\n    signIn(input: $input) {\n      sessionIndex\n      userInfo {\n        profile {\n          displayName\n        }\n      }\n    }\n  }\n": types.SignInDocument,
    "\n  mutation SignOut {\n    signOut {\n      signedOut\n      currentSessionIndex\n    }\n  }\n": types.SignOutDocument,
    "\n  query AccountButton {\n    savedSessions @client {\n      displayName\n      email\n    }\n\n    currentSavedSessionIndex @client\n    \n    currentSavedSession @client {\n      displayName\n      email\n    }\n  }\n": types.AccountButtonDocument,
    "\n  query DrawerContent {\n    isLoggedIn @client\n  }\n": types.DrawerContentDocument,
    "\n  query NotesRouteNotesConnection($last: NonNegativeInt!, $before: String) {\n    notesConnection(last: $last, before: $before) {\n      notes {\n        id\n        title\n        textContent\n      }\n      pageInfo {\n        hasPreviousPage\n        startCursor\n      }\n    }\n  }\n": types.NotesRouteNotesConnectionDocument,
    "\n  query CommonRoutesQuery {\n    isLoggedIn @client\n  }\n": types.CommonRoutesQueryDocument,
    "\n  query LocalNotesRoute {\n    localNotes @client {\n      id\n      title\n      textContent\n    }\n  }\n": types.LocalNotesRouteDocument,
    "\n  query LocalEditNoteDialogRoute($id: ID!) {\n    localNote(id: $id) @client {\n      id\n      title\n      textContent\n    }\n  }\n": types.LocalEditNoteDialogRouteDocument,
    "\n  query EditNoteDialogRoute($id: ID!) {\n    note(id: $id) {\n      id\n      title\n      textContent\n    }\n  }\n": types.EditNoteDialogRouteDocument,
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
export function gql(source: "\n  mutation UseCreateNote($input: CreateNoteInput!)  {\n    createNote(input: $input) {\n      note {\n        id\n        title\n        textContent\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UseCreateNote($input: CreateNoteInput!)  {\n    createNote(input: $input) {\n      note {\n        id\n        title\n        textContent\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n              query CreateNoteUpdateNotesConnection {\n                notesConnection {\n                  notes {\n                    id\n                    title\n                    textContent\n                  }\n                }\n              }\n          "): (typeof documents)["\n              query CreateNoteUpdateNotesConnection {\n                notesConnection {\n                  notes {\n                    id\n                    title\n                    textContent\n                  }\n                }\n              }\n          "];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation UseDeleteNote($input: DeleteNoteInput!) {\n    deleteNote(input: $input) {\n      deleted\n    }\n  }\n"): (typeof documents)["\n  mutation UseDeleteNote($input: DeleteNoteInput!) {\n    deleteNote(input: $input) {\n      deleted\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation UseUpdateNote($input: UpdateNoteInput!)  {\n    updateNote(input: $input) {\n      note {\n        id\n        title\n        textContent\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UseUpdateNote($input: UpdateNoteInput!)  {\n    updateNote(input: $input) {\n      note {\n        id\n        title\n        textContent\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query SessionSwitcherProvider {\n    savedSessions @client {\n      displayName\n      email\n    }\n    currentSavedSessionIndex @client\n  }\n"): (typeof documents)["\n  query SessionSwitcherProvider {\n    savedSessions @client {\n      displayName\n      email\n    }\n    currentSavedSessionIndex @client\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation SignIn($input: SignInInput!)  {\n    signIn(input: $input) {\n      sessionIndex\n      userInfo {\n        profile {\n          displayName\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation SignIn($input: SignInInput!)  {\n    signIn(input: $input) {\n      sessionIndex\n      userInfo {\n        profile {\n          displayName\n        }\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation SignOut {\n    signOut {\n      signedOut\n      currentSessionIndex\n    }\n  }\n"): (typeof documents)["\n  mutation SignOut {\n    signOut {\n      signedOut\n      currentSessionIndex\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query AccountButton {\n    savedSessions @client {\n      displayName\n      email\n    }\n\n    currentSavedSessionIndex @client\n    \n    currentSavedSession @client {\n      displayName\n      email\n    }\n  }\n"): (typeof documents)["\n  query AccountButton {\n    savedSessions @client {\n      displayName\n      email\n    }\n\n    currentSavedSessionIndex @client\n    \n    currentSavedSession @client {\n      displayName\n      email\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query DrawerContent {\n    isLoggedIn @client\n  }\n"): (typeof documents)["\n  query DrawerContent {\n    isLoggedIn @client\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query NotesRouteNotesConnection($last: NonNegativeInt!, $before: String) {\n    notesConnection(last: $last, before: $before) {\n      notes {\n        id\n        title\n        textContent\n      }\n      pageInfo {\n        hasPreviousPage\n        startCursor\n      }\n    }\n  }\n"): (typeof documents)["\n  query NotesRouteNotesConnection($last: NonNegativeInt!, $before: String) {\n    notesConnection(last: $last, before: $before) {\n      notes {\n        id\n        title\n        textContent\n      }\n      pageInfo {\n        hasPreviousPage\n        startCursor\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query CommonRoutesQuery {\n    isLoggedIn @client\n  }\n"): (typeof documents)["\n  query CommonRoutesQuery {\n    isLoggedIn @client\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query LocalNotesRoute {\n    localNotes @client {\n      id\n      title\n      textContent\n    }\n  }\n"): (typeof documents)["\n  query LocalNotesRoute {\n    localNotes @client {\n      id\n      title\n      textContent\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query LocalEditNoteDialogRoute($id: ID!) {\n    localNote(id: $id) @client {\n      id\n      title\n      textContent\n    }\n  }\n"): (typeof documents)["\n  query LocalEditNoteDialogRoute($id: ID!) {\n    localNote(id: $id) @client {\n      id\n      title\n      textContent\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query EditNoteDialogRoute($id: ID!) {\n    note(id: $id) {\n      id\n      title\n      textContent\n    }\n  }\n"): (typeof documents)["\n  query EditNoteDialogRoute($id: ID!) {\n    note(id: $id) {\n      id\n      title\n      textContent\n    }\n  }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;