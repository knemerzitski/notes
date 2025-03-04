import { ApolloLink, FetchResult, NextLink, Observable, Operation } from '@apollo/client';

import { Maybe } from '../../../../utils/src/types';

function _passthrough(op: Operation, forward: Maybe<NextLink>): Observable<FetchResult> {
  return forward ? forward(op) : Observable.of();
}

export function passthrough() {
  return new ApolloLink(_passthrough);
}
