import {
  ApolloLink,
  Operation,
  NextLink,
  FetchResult,
  Observable,
  DocumentNode,
} from '@apollo/client';

import { DirectiveFlag } from '../utils/directive-flag';

const REMOTE_DIRECTIVE = 'remote';

const remoteDirective = new DirectiveFlag(REMOTE_DIRECTIVE);

export function hasRemoteDirective(document: DocumentNode) {
  return remoteDirective.has({
    query: document,
  });
}

/**
 * Removes client side `remote` directive from operation defintion at top level.
 */
export class RemoteDirectiveLink extends ApolloLink {
  public override request(
    operation: Operation,
    forward?: NextLink
  ): Observable<FetchResult> | null {
    if (forward == null) {
      return null;
    }

    if (remoteDirective.has(operation)) {
      remoteDirective.remove(operation);
    }

    return forward(operation);
  }
}
