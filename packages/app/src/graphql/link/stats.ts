import { ApolloLink, Operation, NextLink, FetchResult } from '@apollo/client';
import {
  Observable,
  Observer,
  getMainDefinition,
  getOperationName,
} from '@apollo/client/utilities';
import { OperationTypeNode, Kind } from 'graphql';
import mitt, { Emitter } from 'mitt';

import { CountMap } from '~utils/map/count-map';
import { DefinedMap } from '~utils/map/defined-map';

import { getOperationOrRequestUserId } from './current-user';

interface StatsOngoingEvents {
  byType: {
    type: OperationTypeNode;
    ongoingCount: number;
  };
  byName: {
    operationName: string;
    ongoingCount: number;
  };
}

interface StatsOngoing {
  byType(type: OperationTypeNode): number;
  getTypes(): OperationTypeNode[];

  byName(operationName: string): number;
  getNames(): string[];
}

/**
 * Keeps track of ongoing operations by type and name
 */
export class StatsLink extends ApolloLink {
  private readonly globalOngoing;
  private readonly ongoingByUser;
  private readonly definedOngoingByUser;

  constructor() {
    super();
    this.globalOngoing = new OngoingData();
    this.ongoingByUser = new Map<string, OngoingData>();
    this.definedOngoingByUser = new DefinedMap(
      this.ongoingByUser,
      () => new OngoingData()
    );
  }

  getGlobalOngoing(): StatsOngoing {
    return this.globalOngoing;
  }

  getGlobalEventBus(): Pick<Emitter<StatsOngoingEvents>, 'on' | 'off'> {
    return this.globalOngoing.eventBus;
  }

  getUserOngoing(userId?: string): StatsOngoing {
    return this.definedOngoingByUser.get(userId ?? '');
  }

  getUserEventBus(userId?: string): Pick<Emitter<StatsOngoingEvents>, 'on' | 'off'> {
    return this.definedOngoingByUser.get(userId ?? '').eventBus;
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
    const operationName = getOperationName(operation.query) ?? 'unknown';

    const userId = getOperationOrRequestUserId(operation) ?? '';
    const userOngoing = this.definedOngoingByUser.get(userId);

    userOngoing.byTypeMap[type]++;
    userOngoing.operationCountMap.increment(operationName);
    this.globalOngoing.byTypeMap[type]++;
    this.globalOngoing.operationCountMap.increment(operationName);

    userOngoing.eventBus.emit('byType', {
      type,
      ongoingCount: userOngoing.byTypeMap[type],
    });
    userOngoing.eventBus.emit('byName', {
      operationName,
      ongoingCount: userOngoing.operationCountMap.get(operationName),
    });

    this.globalOngoing.eventBus.emit('byType', {
      type,
      ongoingCount: this.globalOngoing.byTypeMap[type],
    });
    this.globalOngoing.eventBus.emit('byName', {
      operationName,
      ongoingCount: this.globalOngoing.operationCountMap.get(operationName),
    });

    const observable = forward(operation);

    return new Observable<FetchResult>((observer: Observer<FetchResult>) => {
      const sub = observable.subscribe(observer);
      return () => {
        userOngoing.byTypeMap[type]--;
        userOngoing.operationCountMap.decrement(operationName);
        this.globalOngoing.byTypeMap[type]--;
        this.globalOngoing.operationCountMap.decrement(operationName);

        userOngoing.eventBus.emit('byType', {
          type,
          ongoingCount: userOngoing.byTypeMap[type],
        });
        userOngoing.eventBus.emit('byName', {
          operationName,
          ongoingCount: userOngoing.operationCountMap.get(operationName),
        });

        this.globalOngoing.eventBus.emit('byType', {
          type,
          ongoingCount: this.globalOngoing.byTypeMap[type],
        });
        this.globalOngoing.eventBus.emit('byName', {
          operationName,
          ongoingCount: this.globalOngoing.operationCountMap.get(operationName),
        });

        sub.unsubscribe();
      };
    });
  }
}

class OngoingData implements StatsOngoing {
  readonly eventBus = mitt<StatsOngoingEvents>();

  private readonly _operationCountMap = new Map<string, number>();
  readonly operationCountMap = new CountMap(this._operationCountMap);
  readonly byTypeMap: Record<OperationTypeNode, number> = {
    query: 0,
    mutation: 0,
    subscription: 0,
  };

  byType(type: OperationTypeNode): number {
    return this.byTypeMap[type];
  }

  getTypes(): OperationTypeNode[] {
    return [
      OperationTypeNode.QUERY,
      OperationTypeNode.MUTATION,
      OperationTypeNode.SUBSCRIPTION,
    ];
  }

  byName(operationName: string): number {
    return this._operationCountMap.get(operationName) ?? 0;
  }

  getNames(): string[] {
    return [...this._operationCountMap.keys()];
  }
}
