import { ApolloCache } from '@apollo/client';
import { GraphQLError } from 'graphql';

import { GraphQLErrorCode } from '../../../../api-app-shared/src/graphql/error-codes';

import { Note, User } from '../../__generated__/graphql';
import { isErrorCode } from '../../graphql/utils/is-error-code';

import { deleteNote } from '../models/note/delete';

import { getUserNoteLinkId } from './id';

/**
 * Deletes note from cache if recevied error `NOT_FOUND`.
 */
export function handleNoteError(
  userId: User['id'],
  noteId: Note['id'],
  cache: Pick<
    ApolloCache<unknown>,
    'readQuery' | 'updateQuery' | 'identify' | 'gc' | 'evict' | 'modify' | 'writeQuery'
  >,
  errors: readonly GraphQLError[] | undefined
): boolean {
  if (isErrorCode(errors, GraphQLErrorCode.NOT_FOUND)) {
    deleteNote({ userNoteLinkId: getUserNoteLinkId(noteId, userId) }, cache);
    return true;
  }

  return false;
}
