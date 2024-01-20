import {
  ApolloLink,
  Operation,
  NextLink,
  Observer,
  FetchResult,
  Observable,
} from '@apollo/client';

interface WaitLinkOptions {
  /**
   * Wait time in milliseconds
   * @default 1000
   */
  waitTime?: number;
}

type Subscription = ReturnType<Observable<FetchResult>['subscribe']>;

/**
 * Wait a period of time before forwarding operation.
 * Useful for debugging slow connections.
 */
export default class WaitLink extends ApolloLink {
  private waitTime: number;

  constructor(options: WaitLinkOptions) {
    super();

    this.waitTime = options.waitTime ?? 1000;
  }

  request(operation: Operation, forward: NextLink) {
    const subs = new Map<Observer<FetchResult>, Subscription | undefined>();

    let observable: Observable<FetchResult> | null = null;
    setTimeout(() => {
      observable = forward(operation);
      for (const observer of subs.keys()) {
        if (!subs.get(observer)) {
          subs.set(observer, observable.subscribe(observer));
        }
      }
    }, this.waitTime);

    return new Observable<FetchResult>((observer: Observer<FetchResult>) => {
      subs.set(observer, observable?.subscribe(observer));
      return () => {
        subs.get(observer)?.unsubscribe();
        subs.delete(observer);
      };
    });
  }
}
