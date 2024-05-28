import {
  ApolloLink,
  Operation,
  NextLink,
  FetchResult,
  Context,
  ApolloCache,
} from '@apollo/client';
import { Observable, Observer } from '@apollo/client/utilities';
import forEachDeep from '~utils/object/forEachDeep';

export type LinkTypePolicies<TCacheShape> = Record<
  string,
  { link?: LinkTypePolicy<TCacheShape> }
>;

export interface LinkTypePolicy<TCacheShape> {
  next: TypeLinkInitHandler<TCacheShape>;
}

interface TypeLinkInitHandlerOptions<TCacheShape> {
  context: Context;
  cache: ApolloCache<TCacheShape>;
}

type TypeLinkInitHandler<TCacheShape> = (
  options: TypeLinkInitHandlerOptions<TCacheShape>
) => TypeLinkHandler | undefined;
type TypeLinkHandler = (value: { __typename: string }) => void;

interface TypeLinkParams<TCacheShape> {
  typePolicies: LinkTypePolicies<TCacheShape>;
}

/**
 * Runs defined link in typePolicies per type
 */
export default class TypeLink<TCacheShape> extends ApolloLink {
  private params: TypeLinkParams<TCacheShape>;

  constructor(params: TypeLinkParams<TCacheShape>) {
    super();
    this.params = params;
  }

  public request(operation: Operation, forward: NextLink) {
    return new Observable<FetchResult>((observer: Observer<FetchResult>) => {
      const sub = forward(operation).subscribe({
        start(subscription) {
          return observer.start?.(subscription);
        },
        next: (data) => {
          try {
            const context = operation.getContext();
            const cache = context.cache instanceof ApolloCache ? context.cache : null;
            if (!cache) return;
            const { typePolicies } = this.params;

            const handlersByType = new Map<string, TypeLinkHandler[]>();
            Object.entries(typePolicies).forEach(([__typename, { link }]) => {
              if (!link) return;

              let handlersArr = handlersByType.get(__typename);
              if (!handlersArr) {
                handlersArr = [];
                handlersByType.set(__typename, handlersArr);
              }
              const handler = link.next({ context, cache });
              if (handler) {
                handlersArr.push(handler);
              }
            });

            forEachDeep(data, ([_key, value]) => {
              if (!isType(value)) {
                return typeof value !== 'object' ? false : undefined;
              }

              const handlers = handlersByType.get(value.__typename);
              if (!handlers) return;
              for (const handler of handlers) {
                handler(value);
              }
            });
          } finally {
            observer.next?.(data);
          }
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
}

function isType<T>(value: T): value is T & { __typename: string } {
  if (!value || !(typeof value === 'object')) {
    return false;
  }

  return typeof (value as { __typename?: unknown }).__typename === 'string';
}
