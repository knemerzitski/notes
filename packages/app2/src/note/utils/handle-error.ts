import { ApolloCache } from '@apollo/client';
import { GraphQLError } from 'graphql';
import { Note } from '../../__generated__/graphql';
import { getOperationOrRequestUserId } from '../../graphql/link/current-user';
import { getUserNoteLinkId } from './id';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { isErrorCode } from '../../graphql/utils/is-error-code';
import { deleteNote } from '../models/note/delete';
import { getOperationUserId } from '../../graphql/utils/get-operation-user-id';

/**
 * Deletes note from cache if recevied error `NOT_FOUND`.
 */
export function handleNoteError(
  noteId: Note['id'],
  cache: Pick<
    ApolloCache<unknown>,
    'readQuery' | 'updateQuery' | 'identify' | 'gc' | 'evict' | 'modify' | 'writeQuery'
  >,
  errors: readonly GraphQLError[] | undefined,
  operation: Parameters<typeof getOperationOrRequestUserId>[0] | undefined
): boolean {
  if (!errors || !operation) {
    return false;
  }

  if (isErrorCode(errors, GraphQLErrorCode.NOT_FOUND)) {
    const userId = getOperationUserId(operation);
    deleteNote({ userNoteLinkId: getUserNoteLinkId(noteId, userId) }, cache);
    return true;
  }

  return false;
}
