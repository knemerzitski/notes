import { ApolloLink, Operation, NextLink, FetchResult } from '@apollo/client';
import { Observable, Observer, getMainDefinition } from '@apollo/client/utilities';
import { OperationTypeNode, Kind } from 'graphql';
import mitt from 'mitt';
import { ReadonlyDeep } from '~utils/types';

interface OperationStats {
  ongoing: number;
  total: number;
}

export type OperationEvents = { [Key in OperationTypeNode]: OperationStats };

/**
 * Keeps track of how many operations are ongoing and how many
 * have been run in total.
 */
export class StatsLink extends ApolloLink {
  private _statsByType: OperationEvents = {
    query: {
      ongoing: 0,
      total: 0,
    },
    mutation: {
      ongoing: 0,
      total: 0,
    },
    subscription: {
      ongoing: 0,
      total: 0,
    },
  };

  get byType(): ReadonlyDeep<OperationEvents> {
    return this._statsByType;
  }

  readonly eventBus;

  constructor() {
    super();
    this.eventBus = mitt<OperationEvents>();
  }

  public override request(
    operation: Operation,
    forward?: NextLink
  ): Observable<FetchResult> | null {
    if (forward == null) {
      return null;
    }

    const definition = getMainDefinition(operation.query);
    if (definition.kind !== Kind.OPERATION_DEFINITION) {
      return forward(operation);
    }
    const type = definition.operation;

    const stats = this._statsByType[type];
    stats.ongoing++;
    stats.total++;
    this.eventBus.emit(type, { ...stats });

    return new Observable<FetchResult>((observer: Observer<FetchResult>) => {
      const sub = forward(operation).subscribe(observer);
      return () => {
        stats.ongoing--;
        this.eventBus.emit(type, { ...stats });
        sub.unsubscribe();
      };
    });
  }
}
