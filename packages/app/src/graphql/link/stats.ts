import {
  ApolloLink,
  Operation,
  NextLink,
  FetchResult,
  TypedDocumentNode,
  DocumentNode,
} from '@apollo/client';
import {
  getMainDefinition,
  getOperationName,
  Observable,
  Observer,
} from '@apollo/client/utilities';
import { OperationTypeNode, Kind } from 'graphql';

import _isEqual from 'lodash.isequal';
import mitt, { ReadEmitter } from 'mitt';

import { User } from '../../__generated__/graphql';
import { findOperationUserIds } from '../utils/find-operation-user-id';

/**
 * Keeps track of ongoing operations
 */
export class StatsLink extends ApolloLink {
  private readonly ongoingOperations = new ObservableSet<Operation>();

  /**
   *
   * @param query Document to look for
   * @param filterVariables Optionally filter document by its variables
   * @returns
   */
  getOngoingDocumentCount<TVariables, TData>(
    query: DocumentNode | TypedDocumentNode<TData, TVariables>,
    options?: {
      variables?: TVariables;
    }
  ): number {
    return [...this.ongoingOperations].reduce(
      (sum, op) =>
        sum + (hasOperationSameQueryAndVariables(op, query, options?.variables) ? 1 : 0),
      0
    );
  }

  subscribeToOngoingDocumentCount<TVariables, TData>(
    query: DocumentNode | TypedDocumentNode<TData, TVariables>,
    callback: (ongoingCount: number) => void,
    options?: {
      variables?: TVariables;
    }
  ) {
    let ongoingCount = this.getOngoingDocumentCount(query, options);
    callback(ongoingCount);

    return this.ongoingOperations.eventBus.on(
      ['added', 'removed'],
      ({ type, event: { value: op } }) => {
        if (!hasOperationSameQueryAndVariables(op, query, options?.variables)) {
          return;
        }
        ongoingCount += type === 'added' ? 1 : -1;
        callback(ongoingCount);
      }
    );
  }

  subscribeToOngoingDocumentsCountByType(
    callback: (stats: Readonly<Record<OperationTypeNode, number>>) => void,
    options?: {
      filterUserId?: (userId: User['id'] | undefined) => boolean;
    }
  ) {
    const filterUserId = options?.filterUserId;

    const stats: Record<OperationTypeNode, number> = {
      query: 0,
      mutation: 0,
      subscription: 0,
    };

    // Initial counting
    [...this.ongoingOperations].forEach((op) => {
      if (!isUserOperation(op, filterUserId)) {
        return;
      }

      const type = getOperationType(op);
      if (!type) {
        return;
      }

      stats[type] += 1;
    });
    callback(stats);

    return this.ongoingOperations.eventBus.on(
      ['added', 'removed'],
      ({ type: eventType, event: { value: op } }) => {
        if (!isUserOperation(op, filterUserId)) {
          return;
        }

        const opType = getOperationType(op);
        if (!opType) {
          return;
        }

        stats[opType] += eventType === 'added' ? 1 : -1;
        callback(stats);
      }
    );
  }

  subscribeToOngoingDocumentsByName(
    callback: (names: Iterable<string>) => void,
    options?: {
      filterUserId?: (userId: User['id'] | undefined) => boolean;
    }
  ) {
    const filterUserId = options?.filterUserId;

    const map = new Map<string, number>();

    function inc(name: string) {
      const count = map.get(name);
      if (count == null) {
        map.set(name, 1);
      } else {
        map.set(name, count + 1);
      }
    }

    function dec(name: string) {
      const count = map.get(name);
      if (count == null) {
        throw new Error(`Unexpected decrement not ongoing operation ${name}`);
      }

      if (count > 1) {
        map.set(name, count - 1);
      } else {
        map.delete(name);
      }
    }

    // Initial counting
    [...this.ongoingOperations].forEach((op) => {
      if (!isUserOperation(op, filterUserId)) {
        return;
      }

      inc(op.operationName);
    });
    callback(map.keys());

    return this.ongoingOperations.eventBus.on(
      ['added', 'removed'],
      ({ type: eventType, event: { value: op } }) => {
        if (!isUserOperation(op, filterUserId)) {
          return;
        }

        if (eventType === 'added') {
          inc(op.operationName);
        } else {
          dec(op.operationName);
        }
        callback(map.keys());
      }
    );
  }

  public override request(
    operation: Operation,
    forward?: NextLink
  ): Observable<FetchResult> | null {
    if (forward == null) {
      return null;
    }

    this.ongoingOperations.add(operation);

    const observable = forward(operation);

    return new Observable<FetchResult>((observer: Observer<FetchResult>) => {
      const sub = observable.subscribe(observer);
      return () => {
        this.ongoingOperations.remove(operation);
        sub.unsubscribe();
      };
    });
  }
}

function hasOperationSameQueryAndVariables<TVariables, TData>(
  operation: Pick<Operation, 'variables' | 'operationName'>,
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  variables?: TVariables
): boolean {
  if (operation.operationName !== getOperationName(query)) {
    return false;
  }

  if (variables != null && !_isEqual(variables, operation.variables)) {
    return false;
  }

  return true;
}

function isUserOperation(
  op: Operation,
  filterUserId: ((userId: User['id'] | undefined) => boolean) | undefined
) {
  if (!filterUserId) {
    return true;
  }

  const isValidUser = findOperationUserIds(op).some(filterUserId);

  return isValidUser;
}

function getOperationType(op: Operation) {
  const definition = getMainDefinition(op.query);
  if (definition.kind !== Kind.OPERATION_DEFINITION) {
    return;
  }

  return definition.operation;
}

interface ObservableSetEvents<T> {
  added: Readonly<{
    value: T;
  }>;
  removed: Readonly<{
    value: T;
  }>;
}

class ObservableSet<T> implements Iterable<T> {
  private _eventBus;
  get eventBus(): ReadEmitter<ObservableSetEvents<T>> {
    return this._eventBus;
  }

  constructor(private readonly set = new Set<T>()) {
    this._eventBus = mitt<ObservableSetEvents<T>>();
  }

  add(value: T) {
    this.set.add(value);
    this._eventBus.emit('added', { value });
  }

  remove(value: T) {
    this.set.delete(value);
    this._eventBus.emit('removed', { value });
  }

  [Symbol.iterator](): Iterator<T> {
    return this.set.values();
  }
}
