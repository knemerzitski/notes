import { ApolloLink, Operation, FetchResult, NextLink } from '@apollo/client/link/core';
import { Observable, Observer } from '@apollo/client/utilities';
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
  static readonly SKIP = '_GateLink-skip';

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
      observers.set(observer, entry.observable.subscribe(observer));
    }

    this.entryByOperation.delete(operation);
  }

  public override request(operation: Operation, forward?: NextLink) {
    if (forward == null) {
      return null;
    }

    if (operation.getContext()[GateLink.SKIP]) {
      return forward(operation);
    }

    let closeCount = 0;
    for (const gate of this.gates) {
      if (!gate.isOpen(operation)) {
        closeCount++;
      }
    }

    if (closeCount === 0) {
      return forward(operation);
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
