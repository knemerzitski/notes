import { ApolloLink, Operation, NextLink, FetchResult, Context } from '@apollo/client';
import { Observable, Observer } from '@apollo/client/utilities';
import { GraphQLError } from 'graphql';
import mitt from 'mitt';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

interface ErrorEvents {
  error: {
    readonly value: FetchResult;
    readonly firstError: GraphQLError;
    readonly context: Context;
    /**
     * Set to true to let other listeners know what error has been handled
     * @default false
     */
    handled: boolean;
  };
}

export class ErrorLink extends ApolloLink {
  readonly eventBus;

  /**
   * Operation context key to use for skipping
   * emitting certain errors.
   *
   * E.g. do not emit resource not found for the operation: \
   * `context: {
   *  [Error.NO_EMIT]: [GraphQLErrorCode.NOT_FOUND]
   * }`
   */
  static NO_EMIT = '_ErrorLink-no_emit';

  constructor() {
    super();
    this.eventBus = mitt<ErrorEvents>();
  }

  public override request(
    operation: Operation,
    forward?: NextLink
  ): Observable<FetchResult> | null {
    if (forward == null) {
      return null;
    }

    const ctx = operation.getContext();

    return new Observable<FetchResult>((observer: Observer<FetchResult>) => {
      const sub = forward(operation).subscribe({
        start(subscription) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return observer.start?.(subscription);
        },
        next: (value) => {
          this.processNext(value, ctx);

          observer.next?.(value);
        },
        error(errorValue) {
          observer.error?.(errorValue);
        },
        complete() {
          observer.complete?.();
        },
      });
      return () => {
        sub.unsubscribe();
      };
    });
  }

  private processNext(value: FetchResult, ctx: Context) {
    const firstError = value.errors?.[0];
    if (firstError) {
      this.handleError(value, firstError, ctx);
    }
  }

  private handleError(value: FetchResult, firstError: GraphQLError, ctx: Context) {
    const code = firstError.extensions.code;
    if (this.getNoEmitCodesFromContext(ctx).includes(code as GraphQLErrorCode)) {
      return;
    }

    this.eventBus.emit('error', {
      value,
      firstError,
      context: ctx,
      handled: false,
    });
  }

  private getNoEmitCodesFromContext(ctx: Context) {
    const noEmitCodes: unknown = ctx[ErrorLink.NO_EMIT];
    if (Array.isArray(noEmitCodes)) {
      return noEmitCodes as GraphQLErrorCode[];
    }
    return [noEmitCodes as GraphQLErrorCode];
  }
}
