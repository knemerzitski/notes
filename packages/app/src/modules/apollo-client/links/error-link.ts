import { ApolloLink, Operation, NextLink, FetchResult, Context } from '@apollo/client';
import { Observable, Observer } from '@apollo/client/utilities';
import { GraphQLError } from 'graphql';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

/**
 * Used for preventing recursive requests from continous errors.
 */
const ERROR_LINK_SYMBOL = Symbol('ErrorLink');

/**
 * If error is handled then any next handlers wont be called and operation
 * is completed.
 * @param firstError First error in GraphQL response errors array.
 * @param context Context to use during any GraphQL operation inside handler. Prevent's infinite loops
 * if operation itself has error too.
 * @returns Error was handled.
 */
type Handler = (
  value: FetchResult,
  firstError: GraphQLError,
  context: Context
) => Promise<boolean>;

interface ErrorLinkOptions {
  ignoreCodes: GraphQLErrorCode[];
}

export default class ErrorLink extends ApolloLink {
  private handlers = new Set<Handler>();
  private ignoreCodes: GraphQLErrorCode[];

  static IGNORE_CONTEXT_KEY = 'handleErrorCodes';

  constructor(options?: ErrorLinkOptions) {
    super();
    this.ignoreCodes = options?.ignoreCodes ?? [];
  }

  /**
   * Adds a new handler that can intercept errors and handle or ignore them.
   * @returns Function to remove handler on call.
   */
  addHandler(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  public request(operation: Operation, forward: NextLink) {
    const ctx = operation.getContext();
    if (ERROR_LINK_SYMBOL in ctx) {
      return forward(operation);
    }

    return new Observable<FetchResult>((observer: Observer<FetchResult>) => {
      const sub = forward(operation).subscribe({
        start(subscription) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return observer.start?.(subscription);
        },
        next: (value) => {
          void (async () => {
            const isHandled = await this.handleNext(value, ctx);
            if (isHandled) {
              observer.complete?.();
            } else {
              observer.next?.(value);
            }
          })();
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

  private handleNext(value: FetchResult, ctx: Context): Promise<boolean> {
    const firstError = value.errors?.[0];
    if (firstError) {
      return this.handleError(value, firstError, ctx);
    }
    return Promise.resolve(false);
  }

  private async handleError(
    value: FetchResult,
    firstError: GraphQLError,
    ctx: Context
  ): Promise<boolean> {
    const ctxHandleCodes: unknown = ctx[ErrorLink.IGNORE_CONTEXT_KEY];
    const ignoreCodes = [
      ...this.ignoreCodes,
      ...(Array.isArray(ctxHandleCodes) ? (ctxHandleCodes as GraphQLErrorCode[]) : []),
    ];
    const code = firstError.extensions.code;
    if (ignoreCodes.includes(code as GraphQLErrorCode)) {
      return false;
    }

    for (const handler of this.handlers) {
      if (
        await handler(value, firstError, {
          [ERROR_LINK_SYMBOL]: true,
        })
      ) {
        return true;
      }
    }
    return false;
  }
}
