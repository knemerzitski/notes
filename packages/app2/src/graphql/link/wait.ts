import {
  ApolloLink,
  Operation,
  NextLink,
  Observer,
  FetchResult,
  Observable,
} from '@apollo/client';
import { Subscription } from 'zen-observable-ts';

interface WaitLinkOptions {
  /**
   * Wait time in milliseconds
   * @default 1000
   */
  waitTime?: number;
}

/**
 * Wait a period of time before forwarding operation.
 * Useful for debugging slow connections.
 */
export class WaitLink extends ApolloLink {
  private waitTime: number;

  constructor(options: WaitLinkOptions) {
    super();

    this.waitTime = options.waitTime ?? 1000;
  }

  public override request(
    operation: Operation,
    forward?: NextLink
  ): Observable<FetchResult> | null {
    if (forward == null) {
      return null;
    }

    const observers = new Map<Observer<FetchResult>, Subscription | null>();

    let observable: Observable<FetchResult> | null = null;
    setTimeout(() => {
      observable = forward(operation);
      for (const observer of observers.keys()) {
        observers.set(observer, observable.subscribe(observer));
      }
    }, this.waitTime);

    return new Observable<FetchResult>((observer: Observer<FetchResult>) => {
      if (observable) {
        const sub = observable.subscribe(observer);
        return () => {
          sub.unsubscribe();
        };
      }

      observers.set(observer, null);
      return () => {
        observers.get(observer)?.unsubscribe();
        observers.delete(observer);
      };
    });
  }
}
