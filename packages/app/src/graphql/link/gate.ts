import { ApolloLink, Operation, FetchResult, NextLink } from '@apollo/client/link/core';
import { isSubscriptionOperation, Observable, Observer } from '@apollo/client/utilities';
import { Subscription } from 'zen-observable-ts';

interface OperationEntry {
  operation: Operation;
  forward: NextLink;
  observable: Observable<FetchResult> | null;
  observers: Map<Observer<FetchResult>, Subscription | null>;
  /**
   * This operation won't be forwarded until closeCount <= 0.
   */
  closeCount: number;
}

/**
 * Gate can only be modified by this controller.
 */
export interface GateController {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /**
   * Disposes the gate. `open` and `close` will no longer have any effect.
   * Gate will be opened before disposal.
   */
  dispose: () => void;
}

type OperationFilter = (operation: Operation) => boolean;

interface GateReader {
  isOpen: (operation: Operation) => boolean;
}

/**
 * Pause operations until all gates related to those operations are open.
 */
export class GateLink extends ApolloLink {
  static readonly SKIP = 'gateSkip';

  private readonly gates = new Set<GateReader>();

  private readonly entryByOperation = new Map<Operation, OperationEntry>();

  /**
   * Create a new gate which must be open for operations to pass through.
   * @param filter Block only operations that match this filter.
   * @returns
   */
  create(filter?: OperationFilter): GateController {
    if (!filter) {
      return this.createGlobalGate();
    }

    return this.createFilterGate(filter);
  }

  private createGlobalGate(): GateController {
    let isOpen = true;
    const gate: GateReader = {
      isOpen: () => {
        return isOpen;
      },
    };
    this.gates.add(gate);

    const open = () => {
      if (isOpen) return;
      isOpen = true;

      for (const entry of this.entryByOperation.values()) {
        entry.closeCount--;
        if (entry.closeCount <= 0) {
          this.forwardOperation(entry);
        }
      }
    };

    const close = () => {
      if (!isOpen) return;
      isOpen = false;

      for (const entry of this.entryByOperation.values()) {
        entry.closeCount++;
      }
    };

    const _delete = () => {
      this.gates.delete(gate);
      open();
    };

    return {
      get isOpen() {
        return isOpen;
      },
      open,
      close,
      dispose: _delete,
    };
  }

  private createFilterGate(filter: OperationFilter): GateController {
    let isOpen = true;
    const operations = new Set<Operation>();
    const gate: GateReader = {
      isOpen: (op) => {
        if (filter(op)) {
          operations.add(op);
          return isOpen;
        }
        return true;
      },
    };
    this.gates.add(gate);

    const open = () => {
      if (isOpen) return;
      isOpen = true;

      for (const op of operations.values()) {
        const entry = this.entryByOperation.get(op);
        if (entry) {
          entry.closeCount--;
          if (entry.closeCount <= 0) {
            this.forwardOperation(entry);
            operations.delete(op);
          }
        } else {
          operations.delete(op);
        }
      }
    };

    const close = () => {
      if (!isOpen) return;
      isOpen = false;

      for (const op of operations.values()) {
        const entry = this.entryByOperation.get(op);
        if (entry) {
          entry.closeCount++;
        } else {
          operations.delete(op);
        }
      }
    };

    const _delete = () => {
      this.gates.delete(gate);
      open();
    };

    return {
      get isOpen() {
        return isOpen;
      },
      open,
      close,
      dispose: _delete,
    };
  }

  private forwardOperation(entry: OperationEntry) {
    if (entry.observable != null) {
      return;
    }

    const { operation, forward, observers } = entry;

    entry.observable = forward(operation);
    for (const observer of observers.keys()) {
      if (isSubscriptionOperation(operation.query)) {
        observers.set(
          observer,
          entry.observable.subscribe(this.toGatedObserver(observer, operation))
        );
      } else {
        observers.set(observer, entry.observable.subscribe(observer));
      }
    }

    this.entryByOperation.delete(operation);
  }

  private toGatedObserver(
    observer: Observer<FetchResult>,
    operation: Operation
  ): Observer<FetchResult> {
    return {
      start: observer.start?.bind(observer),
      complete: observer.complete?.bind(observer),
      error: observer.error?.bind(observer),
      next: (value) => {
        // Check if gate is closed when receiving subscription data
        if (this.getCloseCount(operation) === 0) {
          observer.next?.(value);
        }
      },
    };
  }

  private getCloseCount(operation: Operation) {
    return [...this.gates].reduce(
      (sum, gate) => sum + (gate.isOpen(operation) ? 0 : 1),
      0
    );
  }

  public override request(operation: Operation, forward?: NextLink) {
    if (forward == null) {
      return null;
    }

    if (operation.getContext()[GateLink.SKIP]) {
      return forward(operation);
    }

    const closeCount = this.getCloseCount(operation);

    if (closeCount === 0) {
      if (isSubscriptionOperation(operation.query)) {
        // Subscription is long living so gate must still be checked
        const observable = forward(operation);

        return new Observable<FetchResult>((observer: Observer<FetchResult>) => {
          const sub = observable.subscribe(this.toGatedObserver(observer, operation));

          return () => {
            sub.unsubscribe();
          };
        });
      } else {
        // Pass query or mutation
        return forward(operation);
      }
    }

    const entry: OperationEntry = {
      operation,
      forward,
      observable: null,
      observers: new Map(),
      closeCount,
    };
    this.entryByOperation.set(operation, entry);

    return new Observable<FetchResult>((observer: Observer<FetchResult>) => {
      if (entry.observable) {
        const sub = entry.observable.subscribe(observer);
        return () => {
          sub.unsubscribe();
        };
      }

      entry.observers.set(observer, null);
      return () => {
        entry.observers.get(observer)?.unsubscribe();
        entry.observers.delete(observer);
      };
    });
  }
}
