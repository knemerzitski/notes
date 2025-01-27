import { ApolloCache, DocumentNode } from '@apollo/client';

import { isObjectLike } from '~utils/type-guards/is-object-like';
import { Maybe } from '~utils/types';

import { gql } from '../../__generated__';
import { hasNoAuthDirective } from '../link/current-user';

const IsRemoteOperation_Query = gql(`
  query IsRemoteOperation_Query($id: ID!) {
    signedInUser(by: { id: $id }) @client {
      id
      localOnly
    }
  }
`);

/**
 * Document is remote operation if
 * user is not local or document has \@noauth directive
 */
export function isRemoteOperation(
  document: DocumentNode,
  localOnly: boolean | undefined
): boolean;
export function isRemoteOperation(
  document: DocumentNode,
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  objOrLocalOnly: { cache: ApolloCache<unknown>; userId: Maybe<string> }
): boolean;
export function isRemoteOperation(
  document: DocumentNode,
  objOrLocalOnly:
    | { cache: ApolloCache<unknown>; userId: Maybe<string> }
    | boolean
    | undefined
): boolean {
  let localOnly: boolean | undefined;
  if (isObjectLike(objOrLocalOnly)) {
    const { userId, cache } = objOrLocalOnly;
    const data = cache.readQuery({
      query: IsRemoteOperation_Query,
      variables: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: userId!,
      },
    });

    localOnly = data?.signedInUser?.localOnly;
  } else {
    localOnly = objOrLocalOnly;
  }

  if (localOnly === true && !hasNoAuthDirective(document)) {
    return false;
  }

  return true;
}
