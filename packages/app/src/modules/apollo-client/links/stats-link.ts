import { ApolloLink, Operation, NextLink, FetchResult } from '@apollo/client';
import { Observable, Observer, getMainDefinition } from '@apollo/client/utilities';
import { OperationTypeNode, Kind } from 'graphql';

type OperationStats = Record<OperationTypeNode, number>;

type Listener = (stats: {
  type: OperationTypeNode;
  ongoing: number;
  total: number;
}) => void;

/**
 * Keeps track of how many operations are ongoing and how many
 * have been run in total.
 */
export class StatsLink extends ApolloLink {
  private _ongoing: OperationStats = {
    query: 0,
    mutation: 0,
    subscription: 0,
  };

  get ongoing(): Readonly<OperationStats> {
    return this._ongoing;
  }

  private _total: OperationStats = {
    query: 0,
    mutation: 0,
    subscription: 0,
  };

  get total(): Readonly<OperationStats> {
    return this._total;
  }

  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private triggerListeners(type: OperationTypeNode) {
    this.listeners.forEach((listener) => {
      listener({
        type,
        ongoing: this._ongoing[type],
        total: this._total[type],
      });
    });
  }

  public override request(operation: Operation, forward: NextLink) {
    const definition = getMainDefinition(operation.query);
    if (definition.kind !== Kind.OPERATION_DEFINITION) {
      return forward(operation);
    }
    const type = definition.operation;

    this._ongoing[type]++;
    this._total[type]++;
    this.triggerListeners(type);

    return new Observable<FetchResult>((observer: Observer<FetchResult>) => {
      const sub = forward(operation).subscribe(observer);
      return () => {
        this._ongoing[type]--;
        this.triggerListeners(type);
        sub.unsubscribe();
      };
    });
  }
}
