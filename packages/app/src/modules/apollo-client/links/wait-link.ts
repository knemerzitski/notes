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

  override request(operation: Operation, forward: NextLink) {
    const subs = new Map<Observer<FetchResult>, Subscription | undefined>();

    let sub: Observable<FetchResult> | null = null;
    setTimeout(() => {
      sub = forward(operation);
      for (const existingSub of subs.keys()) {
        if (!subs.get(existingSub)) {
          subs.set(existingSub, sub.subscribe(existingSub));
        }
      }
    }, this.waitTime);

    return new Observable<FetchResult>((observer: Observer<FetchResult>) => {
      subs.set(observer, sub?.subscribe(observer));
      return () => {
        subs.get(observer)?.unsubscribe();
        subs.delete(observer);
      };
    });
  }
}
