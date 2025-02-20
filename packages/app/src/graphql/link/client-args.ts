import { ApolloLink, Operation, NextLink, FetchResult, Observable } from '@apollo/client';

import { ClientArgsTransform } from '../utils/client-args';

const CLIENT_ARGS_DIRECTIVE = 'clientArgs';
const CLIENT_ARGS_ARGUMENT = 'paths';

/**
 * Removes `clientArgs` directive and associated arguments from fields.
 *  directive @clientArgs(paths: [String!]!) on FIELD
 */
export class ClientArgsLink extends ApolloLink {
  private readonly clientArgsTransform = new ClientArgsTransform({
    directiveName: CLIENT_ARGS_DIRECTIVE,
    argumentName: CLIENT_ARGS_ARGUMENT,
  });

  public override request(
    operation: Operation,
    forward?: NextLink
  ): Observable<FetchResult> | null {
    if (forward == null) {
      return null;
    }

    operation.query = this.clientArgsTransform.transform(operation.query);

    return forward(operation);
  }
}
